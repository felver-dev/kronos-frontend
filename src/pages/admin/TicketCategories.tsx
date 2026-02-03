import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, AlertCircle, Layers, Eye, Link2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import {
  ticketCategoryService,
  TicketCategoryDTO,
  CreateTicketCategoryRequest,
  UpdateTicketCategoryRequest,
} from '../../services/ticketCategoryService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
}

const TicketCategories = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<TicketCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<TicketCategoryDTO | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<TicketCategoryDTO | null>(null)
  const [categoryToView, setCategoryToView] = useState<TicketCategoryDTO | null>(null)

  const [createFormData, setCreateFormData] = useState<CreateTicketCategoryRequest>({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '',
    is_active: true,
    display_order: 0,
  })

  const [editFormData, setEditFormData] = useState<UpdateTicketCategoryRequest>({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '',
    is_active: true,
    display_order: 0,
  })

  useEffect(() => {
    if (
      !hasPermission('ticket_categories.view') &&
      !hasPermission('ticket_categories.create') &&
      !hasPermission('ticket_categories.update') &&
      !hasPermission('ticket_categories.delete')
    ) {
      navigate('/app/dashboard')
      return
    }
    loadCategories()
  }, [hasPermission, navigate])

  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ticketCategoryService.getAll(false)
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des catégories de tickets:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createFormData.name.trim()) {
      toast.error('Le nom est obligatoire')
      return
    }
    if (!createFormData.slug.trim()) {
      toast.error('Le slug est obligatoire (ex: incident, demande)')
      return
    }
    setIsSubmitting(true)
    try {
      await ticketCategoryService.create({
        name: createFormData.name.trim(),
        slug: createFormData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: createFormData.description?.trim() || undefined,
        icon: createFormData.icon?.trim() || undefined,
        color: createFormData.color?.trim() || undefined,
        is_active: createFormData.is_active ?? true,
        display_order: createFormData.display_order ?? 0,
      })
      toast.success('Catégorie créée avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '',
        is_active: true,
        display_order: 0,
      })
      loadCategories()
      window.dispatchEvent(new CustomEvent('ticketCategoriesChanged'))
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateSlug = (fromName: string, isCreate: boolean) => {
    const s = slugFromName(fromName)
    if (isCreate) setCreateFormData((prev) => ({ ...prev, slug: s }))
    else setEditFormData((prev) => ({ ...prev, slug: s }))
  }

  const handleOpenEditModal = (category: TicketCategoryDTO) => {
    if (!hasPermission('ticket_categories.update')) {
      toast.error("Vous n'avez pas la permission de modifier une catégorie")
      return
    }
    setCategoryToEdit(category)
    setEditFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
      is_active: category.is_active,
      display_order: category.display_order,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async () => {
    if (!hasPermission('ticket_categories.update') || !categoryToEdit) return
    if (!editFormData.name?.trim()) {
      toast.error('Le nom est obligatoire')
      return
    }
    if (!editFormData.slug?.trim()) {
      toast.error('Le slug est obligatoire')
      return
    }
    setIsSubmitting(true)
    try {
      await ticketCategoryService.update(categoryToEdit.id, {
        name: editFormData.name.trim(),
        slug: editFormData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: editFormData.description?.trim() || undefined,
        icon: editFormData.icon?.trim() || undefined,
        color: editFormData.color?.trim() || undefined,
        is_active: editFormData.is_active,
        display_order: editFormData.display_order ?? 0,
      })
      toast.success('Catégorie mise à jour avec succès')
      setIsEditModalOpen(false)
      setCategoryToEdit(null)
      loadCategories()
      window.dispatchEvent(new CustomEvent('ticketCategoriesChanged'))
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenViewModal = (category: TicketCategoryDTO) => {
    setCategoryToView(category)
    setIsViewModalOpen(true)
  }

  const handleDeleteClick = (category: TicketCategoryDTO) => {
    if (!hasPermission('ticket_categories.delete')) {
      toast.error("Vous n'avez pas la permission de supprimer une catégorie")
      return
    }
    setCategoryToDelete(category)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('ticket_categories.delete') || !categoryToDelete) return
    setIsSubmitting(true)
    try {
      await ticketCategoryService.delete(categoryToDelete.id)
      toast.success('Catégorie supprimée avec succès')
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
      loadCategories()
      window.dispatchEvent(new CustomEvent('ticketCategoriesChanged'))
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    )
  }

  if (
    !hasPermission('ticket_categories.view') &&
    !hasPermission('ticket_categories.create') &&
    !hasPermission('ticket_categories.update') &&
    !hasPermission('ticket_categories.delete')
  ) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="order-2 md:order-1 flex-1 min-w-0 w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Catégories de tickets
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Ajoutez, modifiez ou supprimez les catégories utilisées pour les tickets (Incidents,
              Demandes, etc.)
            </p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Aide"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="order-1 md:order-2 flex-shrink-0 w-full md:w-auto">
          <PermissionGuard permissions={['ticket_categories.create']}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary flex items-center w-full sm:w-auto justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle catégorie
            </button>
          </PermissionGuard>
        </div>
      </div>

      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Catégories de tickets</p>
              <p className="whitespace-pre-line">
                Le <strong>slug</strong> sert dans l’URL : /app/tickets/category/<strong>slug</strong>. Il doit être
                unique (ex: incident, demande, changement).
                {'\n\n'}L’<strong>ordre d’affichage</strong> détermine l’ordre dans le menu. Les catégories
                inactives n’apparaissent pas dans le menu.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!hasPermission('ticket_categories.view') ? (
        <div className="card">
          <PermissionDenied message="Vous n'avez pas la permission de voir les catégories de tickets" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ordre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucune catégorie. Créez-en une pour qu’elle apparaisse dans le menu des tickets.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {cat.name}
                            </div>
                            {cat.description && (
                              <button
                                onClick={() => handleOpenViewModal(cat)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Eye className="w-3.5 h-3.5 inline mr-1" />
                                Voir la description
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`/app/tickets/category/${cat.slug}`}
                          className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          <Link2 className="w-4 h-4 mr-1" />
                          {cat.slug}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {cat.display_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            cat.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <PermissionGuard permissions={['ticket_categories.update']} showMessage={false}>
                            <button
                              onClick={() => handleOpenEditModal(cat)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['ticket_categories.delete']} showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({
            name: '',
            slug: '',
            description: '',
            icon: '',
            color: '',
            is_active: true,
            display_order: 0,
          })
        }}
        title="Nouvelle catégorie de ticket"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createFormData.name}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="ex: Incidents"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={createFormData.slug}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: incident"
              />
              <button
                type="button"
                onClick={() => handleGenerateSlug(createFormData.name, true)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
              >
                Générer
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Utilisé dans l’URL : /app/tickets/category/<strong>{createFormData.slug || 'slug'}</strong>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={createFormData.description || ''}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optionnel"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icône (Lucide)
              </label>
              <input
                type="text"
                value={createFormData.icon || ''}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, icon: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: AlertTriangle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Couleur
              </label>
              <input
                type="text"
                value={createFormData.color || ''}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, color: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: #ef4444"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ordre d’affichage
              </label>
              <input
                type="number"
                min={0}
                value={createFormData.display_order ?? 0}
                onChange={(e) =>
                  setCreateFormData((prev) => ({
                    ...prev,
                    display_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center pt-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createFormData.is_active ?? true}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setCategoryToEdit(null)
        }}
        title="Modifier la catégorie"
        size="md"
      >
        {categoryToEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdate()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.name || ''}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ex: Incidents"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={editFormData.slug || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="ex: incident"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateSlug(editFormData.name || '', false)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                >
                  Générer
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description || ''}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optionnel"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icône (Lucide)
                </label>
                <input
                  type="text"
                  value={editFormData.icon || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="ex: AlertTriangle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Couleur
                </label>
                <input
                  type="text"
                  value={editFormData.color || ''}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="ex: #ef4444"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ordre d’affichage
                </label>
                <input
                  type="number"
                  min={0}
                  value={editFormData.display_order ?? 0}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      display_order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active ?? true}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la catégorie"
        message={`Êtes-vous sûr de vouloir supprimer la catégorie « ${categoryToDelete?.name} » ? Les tickets de cette catégorie pourraient être impactés.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isSubmitting}
      />

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setCategoryToView(null)
        }}
        title={categoryToView ? `Description : ${categoryToView.name}` : 'Description'}
        size="md"
      >
        {categoryToView && (
          <div className="space-y-4">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {categoryToView.description || 'Aucune description'}
            </p>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false)
                  setCategoryToView(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TicketCategories
