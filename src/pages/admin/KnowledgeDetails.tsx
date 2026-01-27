import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Eye, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import MarkdownEditor from '../../components/MarkdownEditor'
import { knowledgeService, KnowledgeArticleDTO, UpdateKnowledgeArticleRequest, KnowledgeCategoryDTO } from '../../services/knowledgeService'
import { useToastContext } from '../../contexts/ToastContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const KnowledgeDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()
  
  // Détecter le chemin de base (admin ou employee)
  const basePath = location.pathname.startsWith('/employee') ? '/employee' : '/admin'
  const isEmployeeView = basePath === '/employee'
  const [article, setArticle] = useState<KnowledgeArticleDTO | null>(null)
  const [categories, setCategories] = useState<KnowledgeCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState<UpdateKnowledgeArticleRequest>({
    title: '',
    content: '',
    category_id: undefined,
    is_published: undefined,
  })

  useEffect(() => {
    if (id) {
      loadArticle()
      loadCategories()
      // Incrémenter le compteur de vues
      incrementViewCount()
    }
  }, [id])

  const loadArticle = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      // Pour les employés, essayer d'abord getPublished puis getById si nécessaire
      // Pour les admins, utiliser directement getById
      let data: KnowledgeArticleDTO
      if (isEmployeeView) {
        try {
          // Essayer d'abord avec getPublished (pour les articles publiés)
          const allPublished = await knowledgeService.getPublished()
          const found = Array.isArray(allPublished) ? allPublished.find((a) => a.id === parseInt(id)) : null
          if (found) {
            data = found
          } else {
            // Si non trouvé dans les publiés, essayer getById (peut nécessiter auth)
            data = await knowledgeService.getById(parseInt(id))
            // Vérifier que l'article est publié pour les employés
            if (!data.is_published) {
              throw new Error('Article non publié ou introuvable')
            }
          }
        } catch (err) {
          // Si getById échoue aussi, lancer l'erreur
          throw err
        }
      } else {
        // Admin : charger directement avec getById
        data = await knowledgeService.getById(parseInt(id))
      }
      
      setArticle(data)
      setEditFormData({
        title: data.title,
        content: data.content,
        category_id: data.category_id,
        is_published: data.is_published,
      })
    } catch (err) {
      console.error('Erreur lors du chargement de l\'article:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'article')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'article')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await knowledgeService.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
    }
  }

  const incrementViewCount = async () => {
    if (!id) return
    try {
      await knowledgeService.incrementViewCount(parseInt(id))
    } catch (err) {
      // Ignorer les erreurs silencieusement
      console.error('Erreur lors de l\'incrémentation du compteur de vues:', err)
    }
  }

  const handleUpdate = async () => {
    if (!article) return

    setIsSubmitting(true)
    try {
      await knowledgeService.update(article.id, editFormData)
      toast.success('Article mis à jour avec succès')
      setIsEditModalOpen(false)
      loadArticle()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'article')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!article) return

    setIsSubmitting(true)
    try {
      await knowledgeService.delete(article.id)
      toast.success('Article supprimé avec succès')
      navigate(`${basePath}/knowledge`)
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'article')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async () => {
    if (!article) return

    try {
      await knowledgeService.publish(article.id, !article.is_published)
      toast.success(`Article ${!article.is_published ? 'publié' : 'dépublié'} avec succès`)
      loadArticle()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification du statut')
    }
  }

  // Formater la date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  // Obtenir le nom de l'auteur
  const getAuthorName = (): string => {
    if (!article) return 'Utilisateur inconnu'
    if (article.author) {
      if (article.author.first_name && article.author.last_name) {
        return `${article.author.first_name} ${article.author.last_name}`
      }
      return article.author.username || article.author.email || 'Utilisateur inconnu'
    }
    return 'Utilisateur inconnu'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de l'article...</span>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="space-y-6">
        <Link
          to={`${basePath}/knowledge`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Link>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error || 'Article non trouvé'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to={`${basePath}/knowledge`}
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                    {article.category?.name || 'Non catégorisé'}
                  </span>
                  <span className={`badge ${article.is_published 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {article.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{article.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>{getAuthorName()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Créé le {formatDate(article.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>{article.view_count} vues</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="prose max-w-none dark:prose-invert text-gray-700 dark:text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {article.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistiques</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Vues totales</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{article.view_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Statut</span>
                <span className={`badge ${article.is_published 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {article.is_published ? 'Publié' : 'Brouillon'}
                </span>
              </div>
            </div>
          </div>

          {/* Informations */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Informations</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(article.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dernière mise à jour</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(article.updated_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Auteur</p>
                <p className="text-gray-900 dark:text-gray-100">{getAuthorName()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Catégorie</p>
                <p className="text-gray-900 dark:text-gray-100">{article.category?.name || 'Non catégorisé'}</p>
              </div>
            </div>
          </div>

          {/* Actions - seulement pour admin */}
          {!isEmployeeView && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full btn btn-primary flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </button>
                <button
                  onClick={handleTogglePublish}
                  className={`w-full btn ${article.is_published ? 'btn-secondary' : 'btn-secondary'}`}
                >
                  {article.is_published ? 'Dépublier' : 'Publier'}
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full btn btn-danger flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
        }}
        title="Modifier l'article"
        size="xl"
      >
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
              value={editFormData.category_id || article.category_id}
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
              checked={editFormData.is_published !== undefined ? editFormData.is_published : article.is_published}
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
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'article"
        message={`Êtes-vous sûr de vouloir supprimer l'article "${article.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default KnowledgeDetails
