import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, AlertCircle, FolderTree, Eye } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { knowledgeService, KnowledgeCategoryDTO, CreateKnowledgeCategoryRequest, UpdateKnowledgeCategoryRequest } from '../../services/knowledgeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const KnowledgeCategories = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<KnowledgeCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<KnowledgeCategoryDTO | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<KnowledgeCategoryDTO | null>(null)
  const [categoryToView, setCategoryToView] = useState<KnowledgeCategoryDTO | null>(null)

  const [createFormData, setCreateFormData] = useState<CreateKnowledgeCategoryRequest>({
    name: '',
    description: '',
    parent_id: undefined,
  })

  const [editFormData, setEditFormData] = useState<UpdateKnowledgeCategoryRequest>({
    name: '',
    description: '',
    parent_id: undefined,
  })

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('knowledge_categories.view') && !hasPermission('knowledge_categories.create') && !hasPermission('knowledge_categories.update') && !hasPermission('knowledge_categories.delete')) {
      navigate('/app/dashboard')
      return
    }
    loadCategories()
  }, [hasPermission, navigate])

  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await knowledgeService.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des catégories')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des catégories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createFormData.name.trim()) {
      toast.error('Le nom de la catégorie est obligatoire')
      return
    }

    setIsSubmitting(true)
    try {
      await knowledgeService.createCategory(createFormData)
      toast.success('Catégorie créée avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        name: '',
        description: '',
        parent_id: undefined,
      })
      loadCategories()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (category: KnowledgeCategoryDTO) => {
    if (!hasPermission('knowledge_categories.update')) {
      toast.error('Vous n\'avez pas la permission de modifier une catégorie de connaissances')
      return
    }
    setCategoryToEdit(category)
    setEditFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || undefined,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async () => {
    if (!hasPermission('knowledge_categories.update')) {
      toast.error('Vous n\'avez pas la permission de modifier une catégorie de connaissances')
      setIsEditModalOpen(false)
      setCategoryToEdit(null)
      return
    }
    if (!categoryToEdit) return

    setIsSubmitting(true)
    try {
      await knowledgeService.updateCategory(categoryToEdit.id, editFormData)
      toast.success('Catégorie mise à jour avec succès')
      setIsEditModalOpen(false)
      setCategoryToEdit(null)
      loadCategories()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenViewModal = (category: KnowledgeCategoryDTO) => {
    setCategoryToView(category)
    setIsViewModalOpen(true)
  }

  const handleDeleteClick = (category: KnowledgeCategoryDTO) => {
    if (!hasPermission('knowledge_categories.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer une catégorie de connaissances')
      return
    }
    setCategoryToDelete(category)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('knowledge_categories.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer une catégorie de connaissances')
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
      return
    }
    if (!categoryToDelete) return

    setIsSubmitting(true)
    try {
      await knowledgeService.deleteCategory(categoryToDelete.id)
      toast.success('Catégorie supprimée avec succès')
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
      loadCategories()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getParentName = (parentId?: number): string => {
    if (!parentId) return 'Aucune'
    const parent = categories.find((cat) => cat.id === parentId)
    return parent ? parent.name : 'Catégorie inconnue'
  }

  const getAvailableParents = (excludeId?: number): KnowledgeCategoryDTO[] => {
    return categories.filter((cat) => cat.id !== excludeId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des catégories...</span>
      </div>
    )
  }

  // Vérifier l'accès à la page
  if (!hasPermission('knowledge_categories.view') && !hasPermission('knowledge_categories.create') && !hasPermission('knowledge_categories.update') && !hasPermission('knowledge_categories.delete')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Catégories de la base de connaissances</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-400">Gérez les catégories pour organiser les articles</p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Qu'est-ce qu'une catégorie ?"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <PermissionGuard permissions={['knowledge_categories.create']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle catégorie
          </button>
        </PermissionGuard>
      </div>

      {/* Note d'explication */}
      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'une catégorie ?</p>
              <p className="whitespace-pre-line">
                Les catégories permettent d'organiser les articles de la base de connaissances de manière hiérarchique.
                {'\n\n'}Vous pouvez créer des catégories principales et des sous-catégories pour une meilleure organisation.
                {'\n\n'}Exemple :
                {'\n'}• Réseau (catégorie principale)
                {'\n'}  └─ Configuration (sous-catégorie)
                {'\n'}  └─ Dépannage (sous-catégorie)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Liste des catégories */}
      {!hasPermission('knowledge_categories.view') ? (
        <div className="card">
          <PermissionDenied message="Vous n'avez pas la permission de voir la liste des catégories de connaissances" />
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
                        {category.description ? (
                          <button
                            onClick={() => handleOpenViewModal(category)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center"
                            title="Voir la description complète"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir la description
                          </button>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {getParentName(category.parent_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <PermissionGuard permissions={['knowledge_categories.update']} showMessage={false}>
                          <button
                            onClick={() => handleOpenEditModal(category)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permissions={['knowledge_categories.delete']} showMessage={false}>
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

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({
            name: '',
            description: '',
            parent_id: undefined,
          })
        }}
        title="Nouvelle catégorie"
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
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Nom de la catégorie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={createFormData.description || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Description de la catégorie (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie parente
            </label>
            <select
              value={createFormData.parent_id || ''}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
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
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
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
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Nom de la catégorie"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Description de la catégorie (optionnel)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie parente
              </label>
              <select
                value={editFormData.parent_id || ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    parent_id: e.target.value ? parseInt(e.target.value) : null,
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
                onClick={() => setIsEditModalOpen(false)}
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
        message={`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isSubmitting}
      />

      {/* Modal de visualisation des détails */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setCategoryToView(null)
        }}
        title={categoryToView ? `Détails de la catégorie : ${categoryToView.name}` : 'Détails de la catégorie'}
        size="lg"
      >
        {categoryToView && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</p>
              <p className="text-gray-900 dark:text-gray-100">{categoryToView.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {categoryToView.description || 'Aucune description'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie parente</p>
              <p className="text-gray-900 dark:text-gray-100">
                {getParentName(categoryToView.parent_id)}
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false)
                  setCategoryToView(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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

export default KnowledgeCategories
