import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Layers,
  AlertTriangle,
  FileText,
  GitBranch,
  Code,
  HelpCircle,
  Headphones,
  LucideIcon,
} from 'lucide-react'
import Pagination from '../../components/Pagination'
import ConfirmModal from '../../components/ConfirmModal'
import { ticketService, TicketDTO, TicketAttachmentDTO, UpdateTicketRequest } from '../../services/ticketService'
import { ticketCategoryService, TicketCategoryDTO } from '../../services/ticketCategoryService'
import { useToastContext } from '../../contexts/ToastContext'
import Modal from '../../components/Modal'
import { API_BASE_URL } from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { AccessDenied } from '../../components/AccessDenied'

// Slug API → préfixe de permissions (module)
const SLUG_TO_PERM_PREFIX: Record<string, string> = {
  incident: 'incidents',
  demande: 'service_requests',
  service_request: 'service_requests',
  changement: 'changes',
  change: 'changes',
  developpement: 'tickets',
  development: 'tickets',
  assistance: 'tickets',
  support: 'tickets',
}

// Slug API → icône (pour les catégories sans icon dans l'API)
const SLUG_TO_ICON: Record<string, LucideIcon> = {
  incident: AlertTriangle,
  demande: FileText,
  service_request: FileText,
  changement: GitBranch,
  change: GitBranch,
  developpement: Code,
  development: Code,
  assistance: HelpCircle,
  support: Headphones,
}

const getPermPrefix = (slug: string): string => SLUG_TO_PERM_PREFIX[slug] ?? 'tickets'
const getCategoryIcon = (slug: string): LucideIcon => SLUG_TO_ICON[slug] ?? Layers

const TicketsByCategory = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const toast = useToastContext()
  const { hasPermission } = useAuth()

  const [category, setCategory] = useState<TicketCategoryDTO | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [tickets, setTickets] = useState<TicketDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<TicketDTO | null>(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [ticketToEdit, setTicketToEdit] = useState<TicketDTO | null>(null)
  const [editFormData, setEditFormData] = useState<UpdateTicketRequest>({
    title: '',
    description: '',
    status: 'ouvert',
    priority: 'low',
    requester_name: '',
    requester_department: '',
  })
  const [editAttachments, setEditAttachments] = useState<TicketAttachmentDTO[]>([])
  const [editImageUrls, setEditImageUrls] = useState<Record<number, string>>({})
  const [newImages, setNewImages] = useState<File[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<number | null>(null)
  const [loadingEditAttachments, setLoadingEditAttachments] = useState(false)

  const permPrefix = categorySlug ? getPermPrefix(categorySlug) : 'tickets'
  const categoryName = category?.name ?? categorySlug ?? ''

  // Vue : permPrefix (incidents, service_requests, changes), tickets.view_* (accès générique), tickets.create ou ticket_categories.view
  const canView =
    hasPermission(`${permPrefix}.view`) ||
    hasPermission(`${permPrefix}.view_all`) ||
    hasPermission(`${permPrefix}.view_team`) ||
    hasPermission(`${permPrefix}.view_own`) ||
    hasPermission('tickets.view_all') ||
    hasPermission('tickets.view_team') ||
    hasPermission('tickets.view_own') ||
    hasPermission('tickets.create') ||
    hasPermission('ticket_categories.view')
  const canUpdate = hasPermission(`${permPrefix}.update`) || hasPermission('tickets.update')
  const canDelete = hasPermission(`${permPrefix}.delete`) || hasPermission('tickets.delete')

  // Charger la catégorie
  useEffect(() => {
    if (!categorySlug) return
    setCategoryLoading(true)
    setCategoryError(null)
    ticketCategoryService
      .getBySlug(categorySlug)
      .then((c) => {
        setCategory(c)
      })
      .catch((err) => {
        setCategoryError(err instanceof Error ? err.message : 'Catégorie introuvable')
        setCategory(null)
      })
      .finally(() => setCategoryLoading(false))
  }, [categorySlug])

  // Charger les tickets
  const loadTickets = async () => {
    if (!categorySlug) return
    setLoading(true)
    setError(null)
    try {
      const statusFilter = filterStatus !== 'all' ? filterStatus : undefined
      const priorityFilter = filterPriority !== 'all' ? filterPriority : undefined
      const response = await ticketService.getByCategory(
        categorySlug,
        currentPage,
        itemsPerPage,
        statusFilter,
        priorityFilter
      )
      setTickets(response.tickets)
      setTotalPages(response.pagination.total_pages)
      setTotalItems(response.pagination.total)
    } catch (err) {
      console.error('Erreur chargement tickets:', err)
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPriority])

  useEffect(() => {
    loadTickets()
  }, [categorySlug, currentPage, itemsPerPage, filterStatus, filterPriority])

  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase()
    return (
      t.code.toLowerCase().includes(term) ||
      t.title.toLowerCase().includes(term) ||
      t.requester_name?.toLowerCase().includes(term) ||
      t.requester_department?.toLowerCase().includes(term)
    )
  })

  const formatStatus = (s: string) =>
    ({ ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente', cloture: 'Clôturé' }[s] ?? s)
  const getStatusBadge = (s: string) =>
    ({
      ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      en_attente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    }[s] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')

  const formatPriority = (p?: string) =>
    !p ? 'Non définie' : ({ low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique' }[p] ?? p)
  const getPriorityBadge = (p?: string) => {
    if (!p) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    const m: Record<string, string> = {
      low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    }
    return m[p] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const formatDate = (d?: string) => {
    if (!d) return 'N/A'
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return d
    }
  }

  const loadEditImageUrl = async (attachmentId: number, ticketId: number) => {
    if (editImageUrls[attachmentId]) return editImageUrls[attachmentId]
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch(
        `${API_BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}/thumbnail`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return null
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setEditImageUrls((prev) => ({ ...prev, [attachmentId]: url }))
      return url
    } catch (e) {
      console.error('Erreur chargement image:', e)
      return null
    }
  }

  const handleOpenEditModal = async (ticket: TicketDTO) => {
    if (!canUpdate) {
      toast.error(`Vous n'avez pas la permission de modifier un ticket de cette catégorie`)
      return
    }
    setTicketToEdit(ticket)
    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      status: (ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'cloture') || 'ouvert',
      priority: (ticket.priority as 'low' | 'medium' | 'high' | 'critical') || 'low',
      requester_name: ticket.requester_name || '',
      requester_department: ticket.requester_department || '',
    })
    setNewImages([])
    setImagesToDelete([])
    setEditImageUrls({})
    setIsEditModalOpen(true)
    setLoadingEditAttachments(true)
    try {
      const atts = await ticketService.getAttachments(ticket.id)
      setEditAttachments(atts)
      atts.forEach((a) => {
        if (a.is_image) loadEditImageUrl(a.id, ticket.id)
      })
    } catch (e) {
      console.error('Erreur chargement pièces jointes:', e)
      toast.error('Erreur lors du chargement des images')
    } finally {
      setLoadingEditAttachments(false)
    }
  }

  const handleDeleteImage = (id: number) => setImagesToDelete((prev) => [...prev, id])
  const handleCancelDeleteImage = (id: number) => setImagesToDelete((prev) => prev.filter((x) => x !== id))

  const handleUpdate = async () => {
    if (!canUpdate || !ticketToEdit) return
    setIsUpdating(true)
    try {
      for (const id of imagesToDelete) {
        try {
          setIsDeletingAttachment(id)
          await ticketService.deleteAttachment(ticketToEdit.id, id)
        } catch (e) {
          toast.error("Erreur lors de la suppression de l'image")
        } finally {
          setIsDeletingAttachment(null)
        }
      }
      for (const f of newImages) {
        try {
          await ticketService.uploadAttachment(ticketToEdit.id, f)
        } catch (e) {
          toast.error(`Erreur lors de l'upload de ${f.name}`)
        }
      }
      await ticketService.update(ticketToEdit.id, editFormData)
      setIsEditModalOpen(false)
      setNewImages([])
      setImagesToDelete([])
      setEditImageUrls({})
      await loadTickets()
      toast.success('Ticket modifié avec succès')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la modification')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = (t: TicketDTO) => {
    if (!canDelete) {
      toast.error(`Vous n'avez pas la permission de supprimer un ticket de cette catégorie`)
      return
    }
    setTicketToDelete(t)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!canDelete || !ticketToDelete) return
    try {
      await ticketService.delete(ticketToDelete.id)
      setIsDeleteModalOpen(false)
      setTicketToDelete(null)
      await loadTickets()
      toast.success('Ticket supprimé avec succès')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
      setNewImages((prev) => [...prev, ...imgs])
    }
  }

  const stats = {
    total: totalItems,
    enCours: tickets.filter((t) => t.status === 'en_cours').length,
    enAttente: tickets.filter((t) => t.status === 'en_attente').length,
    resolus: tickets.filter((t) => t.status === 'cloture').length,
  }

  if (!categorySlug) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">URL invalide. <Link to="/app/tickets" className="text-primary-600 dark:text-primary-400 hover:underline">Retour aux tickets</Link>.</p>
      </div>
    )
  }

  if (categoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (categoryError || !category) {
    return (
      <div className="card p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Catégorie introuvable</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{categoryError || 'Cette catégorie n\'existe pas ou n\'est plus active.'}</p>
        <Link to="/app/tickets" className="btn btn-primary">Voir tous les tickets</Link>
      </div>
    )
  }

  if (!canView) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les tickets de cette catégorie." />
  }

  const Icon = getCategoryIcon(categorySlug)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            {categoryName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-300">Vue filtrée des tickets de cette catégorie</p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center justify-center flex-shrink-0"
              title="À propos"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          {isInfoModalOpen && (
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                  {category.description ? (
                    <p className="whitespace-pre-line">{category.description}</p>
                  ) : null}
                  <p className="mt-2">Pour créer un nouveau ticket, rendez-vous sur la page <Link to="/app/tickets" className="underline">Tickets</Link>.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">En cours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.enCours}</p>
            </div>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">En attente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.enAttente}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Résolus</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.resolus}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder={`Rechercher dans ${categoryName}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none block w-full lg:w-56 px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="ouvert">Ouvert</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente</option>
              <option value="cloture">Clôturé</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div className="relative">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="appearance-none block w-full lg:w-56 px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="all">Toutes les priorités</option>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="critical">Critique</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Chargement...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priorité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Demandeur / Département</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigné à</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date de création</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                        ? 'Aucun ticket ne correspond aux filtres'
                        : 'Aucun ticket trouvé'}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/app/tickets/${ticket.id}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                          {ticket.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900 dark:text-gray-100">{ticket.title}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getPriorityBadge(ticket.priority)}`}>{formatPriority(ticket.priority)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>{formatStatus(ticket.status)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.requester_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.requester_department || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {ticket.assigned_to
                          ? `${ticket.assigned_to.first_name || ''} ${ticket.assigned_to.last_name || ''}`.trim() || ticket.assigned_to.username || ticket.assigned_to.email || '—'
                          : 'Non assigné'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link to={`/app/tickets/${ticket.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-800" title="Voir">
                            <Eye className="w-5 h-5" />
                          </Link>
                          <PermissionGuard permissions={[`${permPrefix}.update`]} showMessage={false}>
                            <button onClick={() => handleOpenEditModal(ticket)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900" title="Modifier">
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={[`${permPrefix}.delete`]} showMessage={false}>
                            <button onClick={() => handleDeleteClick(ticket)} className="text-red-600 dark:text-red-400 hover:text-red-800" title="Supprimer">
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

      {!loading && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
          />
        </div>
      )}

      {/* Modal édition */}
      {isEditModalOpen && ticketToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setNewImages([]); setImagesToDelete([]); setEditImageUrls({}) }}
          title={`Modifier le ticket - ${categoryName}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'ouvert' | 'en_cours' | 'en_attente' | 'cloture' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="en_attente">En attente</option>
                  <option value="cloture">Clôturé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorité</label>
                <select
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du demandeur</label>
                <input
                  type="text"
                  value={editFormData.requester_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, requester_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Département du demandeur</label>
                <input
                  type="text"
                  value={editFormData.requester_department || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, requester_department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {(loadingEditAttachments || editAttachments.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images existantes</label>
                {loadingEditAttachments ? (
                  <p className="text-sm text-gray-500 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Chargement des pièces jointes...
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {editAttachments.map((a) => {
                      const del = imagesToDelete.includes(a.id)
                      const url = editImageUrls[a.id]
                      return (
                        <div key={a.id} className="relative">
                          {url && (
                            <>
                              <img
                                src={url}
                                alt={a.description || a.file_name}
                                className={`w-full h-32 object-cover rounded-lg border-2 ${del ? 'opacity-50 border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                              />
                              {del ? (
                                <button onClick={() => handleCancelDeleteImage(a.id)} className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 hover:bg-green-600" title="Annuler suppression">
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteImage(a.id)}
                                  disabled={isDeletingAttachment === a.id}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  title="Supprimer"
                                >
                                  {isDeletingAttachment === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ajouter des images</label>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {newImages.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-4">
                  {newImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(img)} alt={`Nouvelle ${i + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600" />
                      <button onClick={() => setNewImages((p) => p.filter((_, j) => j !== i))} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600" title="Retirer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={() => { setIsEditModalOpen(false); setNewImages([]); setImagesToDelete([]); setEditImageUrls({}) }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg" disabled={isUpdating}>Annuler</button>
              <button onClick={handleUpdate} disabled={isUpdating || !editFormData.title?.trim() || !editFormData.description?.trim()} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Modification...</> : 'Modifier'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setTicketToDelete(null) }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le ticket"
        message={`Êtes-vous sûr de vouloir supprimer le ticket "${ticketToDelete?.code}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
      />
    </div>
  )
}

export default TicketsByCategory
