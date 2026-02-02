import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Plus, Search, Eye, Edit, Trash2, FileText, AlertCircle, Loader2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import MarkdownEditor from '../../components/MarkdownEditor'
import { knowledgeService, CreateKnowledgeArticleRequest, UpdateKnowledgeArticleRequest, KnowledgeArticleDTO, KnowledgeCategoryDTO } from '../../services/knowledgeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { AccessDenied } from '../../components/AccessDenied'
import { usePermissionGuard } from '../../hooks/usePermissionGuard'

const Knowledge = () => {
  const location = useLocation()
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  
  // Guards pour les actions
  const createGuard = usePermissionGuard('knowledge.create', 'créer un article')
  const updateGuard = usePermissionGuard('knowledge.update', 'modifier un article')
  const deleteGuard = usePermissionGuard('knowledge.delete', 'supprimer un article')
  
  // Détecter le chemin de base (admin ou employee)
  const basePath = location.pathname.startsWith('/employee') ? '/employee' : '/admin'
  const isEmployeeView = basePath === '/employee'
  const [articles, setArticles] = useState<KnowledgeArticleDTO[]>([])
  const [categories, setCategories] = useState<KnowledgeCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<KnowledgeArticleDTO | null>(null)
  const [articleToEdit, setArticleToEdit] = useState<KnowledgeArticleDTO | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<CreateKnowledgeArticleRequest>({
    title: '',
    content: '',
    category_id: 0,
    is_published: false,
  })
  const [editFormData, setEditFormData] = useState<UpdateKnowledgeArticleRequest>({
    title: '',
    content: '',
    category_id: undefined,
    is_published: undefined,
  })

  // Charger les articles et catégories
  useEffect(() => {
    loadArticles()
    loadCategories()
  }, [])

  const loadArticles = async () => {
    // Vérifier les permissions avant de charger les données
    if (!hasPermission('knowledge.view_all') && !hasPermission('knowledge.view_published') && !hasPermission('knowledge.view_own')) {
      setError('Vous n\'avez pas la permission de voir les articles')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Charger selon le contexte : tous les articles pour admin, seulement publiés pour employee
      const data = isEmployeeView 
        ? await knowledgeService.getPublished()
        : await knowledgeService.getAll()
      setArticles(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des articles:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des articles')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des articles')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await knowledgeService.getCategories()
      const categories = Array.isArray(data) ? data : []
      setCategories(categories)
      if (categories.length > 0 && formData.category_id === 0) {
        setFormData((prev) => ({ ...prev, category_id: categories[0].id }))
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      toast.error('Erreur lors du chargement des catégories')
      setCategories([]) // S'assurer que categories est toujours un tableau
    }
  }

  // Filtrer les articles
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || article.category_id === categoryFilter

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && article.is_published) ||
      (statusFilter === 'draft' && !article.is_published)

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Statistiques
  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.is_published).length,
    draft: articles.filter((a) => !a.is_published).length,
    totalViews: articles.reduce((sum, a) => sum + a.view_count, 0),
  }

  // Formater la date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  // Obtenir le badge de statut
  const getStatusBadge = (isPublished: boolean): string => {
    return isPublished
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Créer un article
  const handleCreate = async () => {
    // Vérifier la permission avant de créer
    if (!createGuard.checkPermission()) {
      return
    }
    
    if (!formData.title || !formData.content || formData.category_id === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)
    try {
      await knowledgeService.create(formData)
      toast.success('Article créé avec succès')
      setIsModalOpen(false)
      setFormData({
        title: '',
        content: '',
        category_id: categories[0]?.id || 0,
        is_published: false,
      })
      loadArticles()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de l\'article')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition
  const handleOpenEditModal = (article: KnowledgeArticleDTO) => {
    // Vérifier la permission avant d'ouvrir le modal
    if (!updateGuard.checkPermission()) {
      return
    }
    
    setArticleToEdit(article)
    setEditFormData({
      title: article.title,
      content: article.content,
      category_id: article.category_id,
      is_published: article.is_published,
    })
    setIsEditModalOpen(true)
  }

  // Mettre à jour un article
  const handleUpdate = async () => {
    if (!articleToEdit) return
    
    // Vérifier la permission avant de mettre à jour
    if (!updateGuard.checkPermission()) {
      return
    }

    setIsSubmitting(true)
    try {
      await knowledgeService.update(articleToEdit.id, editFormData)
      toast.success('Article mis à jour avec succès')
      setIsEditModalOpen(false)
      setArticleToEdit(null)
      loadArticles()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'article')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Supprimer un article
  const handleDeleteClick = (article: KnowledgeArticleDTO) => {
    // Vérifier la permission avant d'ouvrir le modal de suppression
    if (!deleteGuard.checkPermission()) {
      return
    }
    
    setArticleToDelete(article)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return
    
    // Vérifier la permission avant de supprimer
    if (!deleteGuard.checkPermission()) {
      return
    }

    setIsSubmitting(true)
    try {
      await knowledgeService.delete(articleToDelete.id)
      toast.success('Article supprimé avec succès')
      setIsDeleteModalOpen(false)
      setArticleToDelete(null)
      loadArticles()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'article')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Publier/Dépublier un article
  const handleTogglePublish = async (article: KnowledgeArticleDTO) => {
    try {
      await knowledgeService.publish(article.id, !article.is_published)
      toast.success(`Article ${!article.is_published ? 'publié' : 'dépublié'} avec succès`)
      loadArticles()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification du statut')
    }
  }

  // Obtenir le nom de l'auteur
  const getAuthorName = (article: KnowledgeArticleDTO): string => {
    if (article.author) {
      if (article.author.first_name && article.author.last_name) {
        return `${article.author.first_name} ${article.author.last_name}`
      }
      return article.author.username || article.author.email || 'Utilisateur inconnu'
    }
    return 'Utilisateur inconnu'
  }

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission('knowledge.view_all') && !hasPermission('knowledge.view_published') && !hasPermission('knowledge.view_own')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir la base de connaissances" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Base de connaissances</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-400">Gérez les articles et ressources de la base de connaissances</p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Qu'est-ce que la base de connaissances ?"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {!isEmployeeView && (
          <PermissionGuard permission="knowledge.create">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center flex-shrink-0"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvel article
            </button>
          </PermissionGuard>
        )}
      </div>

      {/* Note d'explication */}
      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce que la base de connaissances ?</p>
              <p className="whitespace-pre-line">
                La base de connaissances est un référentiel centralisé contenant des articles, guides et procédures pour résoudre les problèmes courants.
                {'\n\n'}Avantages :
                {'\n'}• Réduction du temps de résolution des incidents
                {'\n'}• Partage de l'expertise entre les équipes
                {'\n'}• Formation des nouveaux techniciens
                {'\n'}• Réponses rapides aux questions fréquentes
                {'\n\n'}Les articles peuvent être publiés immédiatement ou sauvegardés en brouillon. Ils sont organisés par catégories et peuvent être recherchés facilement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent sm:w-48"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {!isEmployeeView && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent sm:w-48"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </select>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Liste des articles */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des articles...</span>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Auteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vues
                  </th>
                  {!isEmployeeView && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{article.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(article.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {article.category?.name || 'Non catégorisé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{getAuthorName(article)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{article.view_count}</div>
                    </td>
                    {!isEmployeeView && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(article.is_published)}`}>
                          {article.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`${basePath}/knowledge/${article.id}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          title="Voir"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        {!isEmployeeView && (
                          <>
                            <PermissionGuard permission="knowledge.update">
                              <button
                                onClick={() => handleOpenEditModal(article)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                title="Modifier"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            </PermissionGuard>
                            <PermissionGuard permission="knowledge.publish">
                              <button
                                onClick={() => handleTogglePublish(article)}
                                className={`${article.is_published ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'} hover:opacity-80`}
                                title={article.is_published ? 'Dépublier' : 'Publier'}
                              >
                                {article.is_published ? '📤' : '✓'}
                              </button>
                            </PermissionGuard>
                            <PermissionGuard permission="knowledge.delete">
                              <button
                                onClick={() => handleDeleteClick(article)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </PermissionGuard>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData({
            title: '',
            content: '',
            category_id: categories[0]?.id || 0,
            is_published: false,
          })
        }}
        title="Nouvel article"
        size="xl"
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
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Titre de l'article"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value={0}>Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contenu <span className="text-red-500">*</span>
            </label>
            <MarkdownEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Écrivez votre contenu en Markdown..."
              height={400}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Publier immédiatement</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.category_id === 0}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer l\'article'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setArticleToEdit(null)
        }}
        title="Modifier l'article"
        size="xl"
      >
        {articleToEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdate()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Titre de l'article"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie
              </label>
              <select
                value={editFormData.category_id || articleToEdit.category_id}
                onChange={(e) => setEditFormData({ ...editFormData, category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contenu <span className="text-red-500">*</span>
              </label>
              <MarkdownEditor
                value={editFormData.content || ''}
                onChange={(value) => setEditFormData({ ...editFormData, content: value })}
                placeholder="Écrivez votre contenu en Markdown..."
                height={400}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editFormData.is_published !== undefined ? editFormData.is_published : articleToEdit.is_published}
                onChange={(e) => setEditFormData({ ...editFormData, is_published: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Publier</label>
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
          setArticleToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'article"
        message={`Êtes-vous sûr de vouloir supprimer l'article "${articleToDelete?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default Knowledge
