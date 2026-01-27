import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, AlertCircle, FolderTree, Eye } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import { assetService, AssetCategoryDTO } from '../../services/assetService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const AssetCategories = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<AssetCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<AssetCategoryDTO | null>(null)
  const [categoryToEdit, setCategoryToEdit] = useState<AssetCategoryDTO | null>(null)
  const [categoryToView, setCategoryToView] = useState<AssetCategoryDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: undefined as number | undefined,
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    parent_id: undefined as number | undefined,
  })

  // Charger les catégories avec pagination
  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await assetService.getCategoriesPaginated(currentPage, itemsPerPage)

      // Sécuriser l'accès aux propriétés au cas où l'API ne renverrait pas encore la nouvelle structure
      const categoriesData = Array.isArray((response as any).categories)
        ? (response as any).categories
        : Array.isArray(response as any)
        ? (response as any)
        : []

      const pagination = (response as any).pagination || {
        page: currentPage,
        limit: itemsPerPage,
        total: categoriesData.length,
        total_pages: Math.max(1, Math.ceil(categoriesData.length / itemsPerPage)),
      }

      setCategories(categoriesData)
      setTotalItems(pagination.total ?? 0)
      setTotalPages(pagination.total_pages ?? Math.max(1, Math.ceil((pagination.total ?? categoriesData.length) / itemsPerPage)))
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des catégories')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des catégories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('asset_categories.view') && !hasPermission('asset_categories.create') && !hasPermission('asset_categories.update') && !hasPermission('asset_categories.delete')) {
      navigate('/app/dashboard')
      return
    }
    loadCategories()
  }, [currentPage, itemsPerPage, hasPermission, navigate])

  // Créer une catégorie
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('asset_categories.create')) {
      toast.error('Vous n\'avez pas la permission de créer une catégorie d\'actif')
      setIsModalOpen(false)
      return
    }
    if (!formData.name.trim()) {
      toast.error('Le nom de la catégorie est requis')
      return
    }
    setIsSubmitting(true)
    try {
      await assetService.createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined,
      })
      toast.success('Catégorie créée avec succès')
      setIsModalOpen(false)
      setFormData({ name: '', description: '', parent_id: undefined })
      loadCategories()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la création de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition
  const handleOpenEditModal = (category: AssetCategoryDTO) => {
    if (!hasPermission('asset_categories.update')) {
      toast.error('Vous n\'avez pas la permission de modifier une catégorie d\'actif')
      return
    }
    setCategoryToEdit(category)
    setEditFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id,
    })
    setIsEditModalOpen(true)
  }

  // Mettre à jour une catégorie
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('asset_categories.update')) {
      toast.error('Vous n\'avez pas la permission de modifier une catégorie d\'actif')
      setIsEditModalOpen(false)
      setCategoryToEdit(null)
      return
    }
    if (!categoryToEdit || !editFormData.name.trim()) {
      toast.error('Le nom de la catégorie est requis')
      return
    }
    setIsSubmitting(true)
    try {
      await assetService.updateCategory(categoryToEdit.id, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        parent_id: editFormData.parent_id || null,
      })
      toast.success('Catégorie mise à jour avec succès')
      setIsEditModalOpen(false)
      setCategoryToEdit(null)
      loadCategories()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la mise à jour de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier si une catégorie a des enfants
  const hasChildren = (categoryId: number): boolean => {
    return categories.some((cat) => cat.parent_id === categoryId)
  }

  // Supprimer une catégorie
  const handleDeleteClick = (category: AssetCategoryDTO) => {
    if (!hasPermission('asset_categories.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer une catégorie d\'actif')
      return
    }
    setCategoryToDelete(category)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('asset_categories.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer une catégorie d\'actif')
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
      return
    }
    if (!categoryToDelete) return
    setIsSubmitting(true)
    try {
      // Si la catégorie a des enfants, envoyer le nom de confirmation
      const confirmName = hasChildren(categoryToDelete.id) ? categoryToDelete.name : undefined
      await assetService.deleteCategory(categoryToDelete.id, confirmName)
      toast.success('Catégorie supprimée avec succès')
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
      loadCategories()
    } catch (err: any) {
      console.error('Erreur:', err)
      const errorMessage = err?.message || 'Erreur lors de la suppression de la catégorie'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtenir le nom de la catégorie parente
  const getParentName = (parentId?: number): string => {
    if (!parentId) return '-'
    const parent = categories.find((cat) => cat.id === parentId)
    return parent ? parent.name : '-'
  }

  // Filtrer les catégories pour exclure la catégorie en cours d'édition (pour éviter les références circulaires)
  const getAvailableParents = (excludeId?: number): AssetCategoryDTO[] => {
    return categories.filter((cat) => cat.id !== excludeId)
  }

  // Vérifier l'accès à la page
  if (!hasPermission('asset_categories.view') && !hasPermission('asset_categories.create') && !hasPermission('asset_categories.update') && !hasPermission('asset_categories.delete')) {
    return <AccessDenied />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Catégories d'actifs</h1>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Qu'est-ce qu'une catégorie d'actif ?"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez les catégories d'actifs IT (Serveurs, Ordinateurs, Imprimantes, etc.)
          </p>
        </div>
        <PermissionGuard permissions={['asset_categories.create']}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle catégorie
          </button>
        </PermissionGuard>
      </div>

      {/* Note d'explication en dessous du header pour ne pas déranger le bouton */}
      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'une catégorie d'actif ?</p>
              <p className="whitespace-pre-line">
                Les catégories d'actifs permettent d'organiser et de classer vos équipements IT.
                {'\n\n'}Vous pouvez créer des catégories principales (ex: "Serveurs", "Ordinateurs", "Imprimantes") et des sous-catégories pour une organisation plus fine.
                {'\n\n'}Exemple de hiérarchie :
                {'\n'}• Serveurs (catégorie principale)
                {'\n'}  └─ Serveurs physiques (sous-catégorie)
                {'\n'}  └─ Serveurs virtuels (sous-catégorie)
                {'\n\n'}Pour créer une hiérarchie : créez d'abord la catégorie principale (sans parente), puis créez les sous-catégories en sélectionnant la catégorie principale comme parente.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Liste des catégories */}
      {!hasPermission('asset_categories.view') ? (
        <div className="card">
          <PermissionDenied message="Vous n'avez pas la permission de voir la liste des catégories d'actifs" />
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Catégorie parente
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucune catégorie enregistrée
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          <FolderTree className="w-5 h-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {category.parent_id ? (
                              <span className="text-gray-500 dark:text-gray-400">└─ </span>
                            ) : null}
                            {category.name}
                          </div>
                          {category.parent_id && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Sous-catégorie de {getParentName(category.parent_id)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {getParentName(category.parent_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setCategoryToView(category)
                            setIsViewModalOpen(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Voir les détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <PermissionGuard permissions={['asset_categories.update']} showMessage={false}>
                          <button
                            onClick={() => handleOpenEditModal(category)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permissions={['asset_categories.delete']} showMessage={false}>
                          <button
                            onClick={() => handleDeleteClick(category)}
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

      {/* Pagination */}
      {!loading && hasPermission('asset_categories.view') && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value)
            setCurrentPage(1)
          }}
        />
      )}

      {/* Modal de création */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData({ name: '', description: '', parent_id: undefined })
        }}
        title="Nouvelle catégorie"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Ex: Serveurs, Ordinateurs, Imprimantes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Description de la catégorie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie parente (optionnel)
            </label>
            <select
              value={formData.parent_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parent_id: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value="">Aucune (catégorie principale)</option>
              {getAvailableParents().map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                setFormData({ name: '', description: '', parent_id: undefined })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setCategoryToEdit(null)
        }}
        title="Modifier la catégorie"
        size="lg"
      >
        {categoryToEdit && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie parente (optionnel)
              </label>
              <select
                value={editFormData.parent_id || ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    parent_id: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="">Aucune (catégorie principale)</option>
                {getAvailableParents(categoryToEdit.id).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setCategoryToEdit(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la catégorie"
        message={
          categoryToDelete && hasChildren(categoryToDelete.id)
            ? `⚠️ Cette catégorie contient des sous-catégories. La suppression supprimera également toutes les sous-catégories. Cette action est irréversible.`
            : `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete?.name}" ? Cette action est irréversible.`
        }
        requireNameConfirmation={categoryToDelete ? hasChildren(categoryToDelete.id) : false}
        confirmationName={categoryToDelete?.name || ''}
        isLoading={isSubmitting}
      />

      {/* Modal de visualisation des détails */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setCategoryToView(null)
        }}
        title="Détails de la catégorie"
        size="lg"
      >
        {categoryToView && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                {categoryToView.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 min-h-[100px] whitespace-pre-wrap">
                {categoryToView.description || <span className="text-gray-400 dark:text-gray-500 italic">Aucune description</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie parente
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                {categoryToView.parent_id ? getParentName(categoryToView.parent_id) : <span className="text-gray-400 dark:text-gray-500 italic">Aucune (catégorie principale)</span>}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false)
                  setCategoryToView(null)
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors"
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

export default AssetCategories
