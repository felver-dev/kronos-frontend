import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Ticket, Plus, Search, Filter, Eye, Edit, Trash2, AlertCircle, Image as ImageIcon, X, Loader2, Calendar, XCircle, Building2 } from 'lucide-react'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import ConfirmModal from '../../components/ConfirmModal'
import { ticketService, CreateTicketRequest, TicketDTO, TicketAttachmentDTO, UpdateTicketRequest } from '../../services/ticketService'
import { ticketCategoryService, TicketCategoryDTO } from '../../services/ticketCategoryService'
import { userService, UserDTO } from '../../services/userService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { softwareService, SoftwareDTO } from '../../services/softwareService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'
import { API_BASE_URL } from '../../config/api'
import { TicketInternesTab } from './TicketInternesTab'

// Fonction utilitaire pour obtenir le nom du demandeur
const getRequesterName = (ticket: TicketDTO): string => {
  if (ticket.requester) {
    if (ticket.requester.first_name && ticket.requester.last_name) {
      return `${ticket.requester.first_name} ${ticket.requester.last_name}`
    }
    return ticket.requester.username
  }
  return ticket.requester_name || 'N/A'
}

const Tickets = () => {
  const toast = useToastContext()
  const { user, hasPermission } = useAuth()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/employee') ? '/employee' : '/admin'

  // Département de l'utilisateur (pour détecter résolveur = IT fournisseur)
  const [userDepartment, setUserDepartment] = useState<DepartmentDTO | null>(null)

  // Résolveur = département IT de la filiale fournisseur → même formulaire de création que l'admin
  const isResolver = Boolean(userDepartment?.is_it_department && userDepartment.filiale?.is_software_provider)
  const canCreateLikeAdmin = hasPermission('tickets.create_any_filiale') || isResolver

  // Vérifier si l'utilisateur peut sélectionner la source (admin ou résolveur)
  const canSelectSource = canCreateLikeAdmin
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: '' as '' | 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture',
    priority: '' as '' | 'low' | 'medium' | 'high' | 'critical',
    userId: '' as number | '',
    departmentId: '' as number | '',
    filialeId: '' as number | '',
    softwareId: '' as number | '',
    dateFrom: '',
    dateTo: '',
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isInfoModalOpenInternes, setIsInfoModalOpenInternes] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<TicketDTO | null>(null)
  const [tickets, setTickets] = useState<TicketDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    category: 'incident' as CreateTicketRequest['category'], // Valeur par défaut, sera mise à jour après chargement des catégories
    source: (canSelectSource ? 'direct' : 'kronos') as CreateTicketRequest['source'], // Par défaut "kronos" pour les non-IT fournisseur
    priority: 'medium',
    requester_name: '',
    requester_department: '',
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [categories, setCategories] = useState<TicketCategoryDTO[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [estimatedTimeValue, setEstimatedTimeValue] = useState<number | ''>('')
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<'minutes' | 'hours' | 'days'>('hours')
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [selectedRequesterId, setSelectedRequesterId] = useState<number | ''>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('')
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loadingFiliales, setLoadingFiliales] = useState(false)
  // Filtre par filiale pour le dropdown des demandeurs (filiale fournisseur IT)
  const [requesterFilialeFilter, setRequesterFilialeFilter] = useState<number | ''>('')
  // Saisie manuelle du demandeur (pour IT filiale fournisseur)
  const [useManualRequester, setUseManualRequester] = useState(false)
  const [manualRequesterFirstName, setManualRequesterFirstName] = useState('')
  const [manualRequesterLastName, setManualRequesterLastName] = useState('')
  const [softwareList, setSoftwareList] = useState<SoftwareDTO[]>([])
  const [loadingSoftware, setLoadingSoftware] = useState(false)
  const [selectedFilialeId, setSelectedFilialeId] = useState<number | ''>('')
  const [selectedSoftwareId, setSelectedSoftwareId] = useState<number | ''>('')
  
  // États pour la modification
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [ticketToEdit, setTicketToEdit] = useState<TicketDTO | null>(null)
  const [editFormData, setEditFormData] = useState<UpdateTicketRequest>({
    title: '',
    description: '',
    category: '',
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
  const [editSelectedRequesterId, setEditSelectedRequesterId] = useState<number | ''>('')
  const [editSelectedDepartmentId, setEditSelectedDepartmentId] = useState<number | ''>('')
  const [editSelectedFilialeId, setEditSelectedFilialeId] = useState<number | ''>('')
  const [editSelectedSoftwareId, setEditSelectedSoftwareId] = useState<number | ''>('')
  // Filtre par filiale pour le dropdown des demandeurs dans le modal d'édition (filiale fournisseur IT)
  const [editRequesterFilialeFilter, setEditRequesterFilialeFilter] = useState<number | ''>('')

  // Charger le département de l'utilisateur (pour isResolver)
  const loadUserDepartment = async () => {
    if (!user?.department_id) {
      setUserDepartment(null)
      return
    }
    try {
      const dept = await departmentService.getById(user.department_id)
      setUserDepartment(dept)
    } catch (err) {
      console.error('Erreur lors du chargement du département:', err)
      setUserDepartment(null)
    }
  }

  // Charger les catégories
  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await ticketCategoryService.getAll(true) // Seulement les catégories actives
      console.log('Catégories chargées:', data)
      // Certains endpoints peuvent retourner null/undefined au lieu d'un tableau
      const safeData = Array.isArray(data) ? data : []
      setCategories(safeData)
      // Si des catégories sont disponibles et que la catégorie actuelle n'est pas valide, sélectionner la première
      if (safeData.length > 0) {
        const validCategory = safeData.find(cat => cat.slug === formData.category)
        if (!validCategory) {
          setFormData(prev => ({ ...prev, category: safeData[0].slug as CreateTicketRequest['category'] }))
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      toast.error('Erreur lors du chargement des catégories: ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setLoadingCategories(false)
    }
  }

  // Charger les utilisateurs pour la création de tickets
  // Utilise l'endpoint spécifique qui filtre selon les permissions :
  // - Si l'utilisateur a tickets.create_any_filiale : tous les utilisateurs actifs
  // - Sinon : uniquement les utilisateurs actifs de sa propre filiale
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await userService.getForTicketCreation()
      const safeData = Array.isArray(data) ? data : []
      setUsers(safeData.filter(user => user.is_active))
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Charger les départements (optionnellement filtrés par filiale)
  const loadDepartments = async (filialeId?: number) => {
    setLoadingDepartments(true)
    try {
      let data: DepartmentDTO[]
      if (filialeId) {
        // Charger les départements de la filiale spécifiée
        data = await departmentService.getByFilialeId(filialeId)
      } else {
        // Charger tous les départements actifs
        data = await departmentService.getAll(true)
      }
      const safeData = Array.isArray(data) ? data : []
      setDepartments(safeData)
    } catch (err) {
      console.error('Erreur lors du chargement des départements:', err)
      toast.error('Erreur lors du chargement des départements')
    } finally {
      setLoadingDepartments(false)
    }
  }

  // Charger les filiales
  const loadFiliales = async () => {
    setLoadingFiliales(true)
    try {
      const data = await filialeService.getActive() // Seulement les filiales actives
      const safeData = Array.isArray(data) ? data : []
      setFiliales(safeData)
      // Si l'utilisateur connecté a une filiale assignée, la pré-sélectionner
      if (user?.filiale_id && safeData.find(f => f.id === user.filiale_id)) {
        setSelectedFilialeId(user.filiale_id)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des filiales:', err)
      toast.error('Erreur lors du chargement des filiales')
    } finally {
      setLoadingFiliales(false)
    }
  }

  // Charger les logiciels déployés dans une filiale spécifique
  const loadSoftware = async (filialeId?: number | '') => {
    setLoadingSoftware(true)
    try {
      // Si une filiale est spécifiée, charger uniquement les logiciels déployés dans cette filiale
      if (filialeId) {
        const deployments = await softwareService.getDeploymentsByFiliale(filialeId as number)
        const safeDeployments = Array.isArray(deployments) ? deployments : []
        // Extraire les logiciels des déploiements actifs
        const softwareFromDeployments = safeDeployments
          .filter(dep => dep.is_active && dep.software)
          .map(dep => dep.software!)
        setSoftwareList(softwareFromDeployments)
      } else {
        // Si aucune filiale n'est spécifiée, utiliser la filiale de l'utilisateur connecté
        if (user?.filiale_id) {
          const deployments = await softwareService.getDeploymentsByFiliale(user.filiale_id)
          const safeDeployments = Array.isArray(deployments) ? deployments : []
          const softwareFromDeployments = safeDeployments
            .filter(dep => dep.is_active && dep.software)
            .map(dep => dep.software!)
          setSoftwareList(softwareFromDeployments)
        } else {
          // Si l'utilisateur n'a pas de filiale, ne charger aucun logiciel
          setSoftwareList([])
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des logiciels:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des logiciels'
      toast.error(errorMessage)
      setSoftwareList([])
    } finally {
      setLoadingSoftware(false)
    }
  }

  // Charger les tickets selon les permissions
  const loadTickets = async () => {
    // Vérifier les permissions avant de charger les données
    // tickets.create permet aussi de voir ses propres tickets créés
    if (!hasPermission('tickets.view_all') && !hasPermission('tickets.view_filiale') && !hasPermission('tickets.view_team') && !hasPermission('tickets.view_own') && !hasPermission('tickets.create')) {
      setError('Vous n\'avez pas la permission de voir les tickets')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let response
      
      // Charger selon les permissions
      // view_all, view_team, view_own : utiliser getAll() pour que le scope backend (filiale + permissions) soit appliqué
      // create seul (sans view_*) : utiliser getMyTickets() pour voir les tickets qu'on a créés
      if (hasPermission('tickets.view_all')) {
        response = await ticketService.getAll(currentPage, itemsPerPage)
      } else if (hasPermission('tickets.view_team') && user?.department_id) {
        response = await ticketService.getByDepartment(user.department_id, currentPage, itemsPerPage)
      } else if (hasPermission('tickets.view_own') && user?.id) {
        response = await ticketService.getAll(currentPage, itemsPerPage)
      } else if (hasPermission('tickets.create') && user?.id) {
        response = await ticketService.getMyTickets(currentPage, itemsPerPage)
      } else {
        response = await ticketService.getMyTickets(currentPage, itemsPerPage)
      }
      
      setTickets(response.tickets)
      const total = response.pagination?.total ?? 0
      
      // Calculer totalPages de manière robuste
      let computedTotalPages = 1
      if (response.pagination?.total_pages && response.pagination.total_pages > 0) {
        computedTotalPages = response.pagination.total_pages
      } else if (total > 0) {
        computedTotalPages = Math.ceil(total / itemsPerPage)
        if (computedTotalPages < 1) {
          computedTotalPages = 1
        }
      }
      
      setTotalPages(computedTotalPages)
      setTotalItems(total)
    } catch (err) {
      console.error('Erreur lors du chargement des tickets:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des tickets')
    } finally {
      setLoading(false)
    }
  }

  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    loadUserDepartment()
    loadCategories()
    loadUsers()
    loadFiliales()
    // Charger les départements selon les permissions
    if (canCreateLikeAdmin) {
      // Pour admin ou résolveur (IT fournisseur) : charger tous les départements
      loadDepartments()
    } else if (user?.filiale_id) {
      // Pour les autres filiales : charger uniquement les départements de leur filiale
      loadDepartments(user.filiale_id)
    }
    // Charger les logiciels pour la filiale de l'utilisateur par défaut
    if (user?.filiale_id) {
      loadSoftware(user.filiale_id)
    }
  }, [user?.filiale_id])
  
  // Initialiser les données pour les utilisateurs sans permission de créer pour n'importe quelle filiale
  useEffect(() => {
    if (isModalOpen && !canCreateLikeAdmin && user?.filiale_id) {
      // Pour les autres filiales : charger les départements et logiciels de leur filiale
      loadDepartments(user.filiale_id)
      loadSoftware(user.filiale_id)
      // Forcer la source à "kronos" pour les non-IT fournisseur
      setFormData(prev => ({
        ...prev,
        source: 'kronos' as CreateTicketRequest['source'],
      }))
    }
  }, [isModalOpen, user?.filiale_id])

  // Quand l'utilisateur est résolveur (userDepartment chargé), charger tous les départements et utilisateurs pour le formulaire
  useEffect(() => {
    if (canCreateLikeAdmin && user?.filiale_id) {
      loadDepartments()
      loadUsers()
    }
  }, [canCreateLikeAdmin, user?.filiale_id])

  // Recharger les logiciels quand la filiale change (via filtre demandeur ou utilisateur sélectionné)
  useEffect(() => {
    if (isModalOpen) {
      let filialeToUse: number | undefined

      if (canCreateLikeAdmin) {
        // Pour admin ou résolveur : utiliser la filiale du demandeur sélectionné ou celle du filtre
        if (selectedRequesterId) {
          const selectedUser = users.find(u => u.id === selectedRequesterId)
          filialeToUse = selectedUser?.filiale_id
        }
        if (!filialeToUse && requesterFilialeFilter) {
          filialeToUse = requesterFilialeFilter
        }
      } else {
        // Pour les autres filiales : toujours utiliser leur propre filiale
        if (user?.filiale_id) {
          filialeToUse = user.filiale_id
        }
      }
      
      // Fallback : utiliser la filiale de l'utilisateur
      if (!filialeToUse && user?.filiale_id) {
        filialeToUse = user.filiale_id
      }
      
      if (filialeToUse) {
        loadSoftware(filialeToUse)
      }
    }
  }, [selectedRequesterId, requesterFilialeFilter, isModalOpen, user?.filiale_id, users])

  const lastTicketLoadKey = useRef<string | null>(null)

  useEffect(() => {
    const key = `${currentPage}-${itemsPerPage}`
    if (lastTicketLoadKey.current === key) return
    lastTicketLoadKey.current = key
    loadTickets()
  }, [currentPage, itemsPerPage])

  // Rafraîchir les utilisateurs quand les filtres sont ouverts pour avoir les données à jour
  useEffect(() => {
    if (isFiltersOpen) {
      loadUsers()
      loadDepartments()
      loadFiliales()
    }
  }, [isFiltersOpen])

  // Filtrer les tickets localement pour la recherche et les filtres
  const filteredTickets = tickets.filter((ticket) => {
    // Filtre de recherche textuelle
    const requesterName = getRequesterName(ticket)
    const matchesSearch = 
      ticket.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requester_department?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Filtre par statut
    if (filters.status && ticket.status !== filters.status) return false
    
    // Filtre par priorité
    if (filters.priority && ticket.priority !== filters.priority) return false
    
    // Filtre par utilisateur (assigned_to)
    if (filters.userId && ticket.assigned_to?.id !== filters.userId) return false
    
    // Filtre par département (requester_department)
    if (filters.departmentId) {
      const selectedDept = departments.find(d => d.id === filters.departmentId)
      if (selectedDept && ticket.requester_department !== selectedDept.name) return false
    }
    
    // Filtre par filiale
    if (filters.filialeId && ticket.filiale_id !== filters.filialeId) return false
    
    // Filtre par logiciel
    if (filters.softwareId && ticket.software_id !== filters.softwareId) return false
    
    // Filtre par date
    if (filters.dateFrom || filters.dateTo) {
      const ticketDate = ticket.created_at ? new Date(ticket.created_at) : null
      if (ticketDate) {
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (ticketDate < fromDate) return false
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (ticketDate > toDate) return false
        }
      } else {
        return false // Si pas de date et qu'on filtre par date, exclure
      }
    }
    
    return true
  })

  // Compter les filtres actifs
  const activeFiltersCount = [
    filters.status,
    filters.priority,
    filters.userId,
    filters.departmentId,
    filters.filialeId,
    filters.softwareId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(f => f !== '' && f !== null && f !== undefined).length

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      userId: '',
      departmentId: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  // Formater le statut pour l'affichage
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'ouvert': 'Ouvert',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'resolu': 'Résolu',
      'cloture': 'Clôturé',
    }
    return statusMap[status] || status
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'ouvert': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      'en_cours': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      'en_attente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'resolu': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      'cloture': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    }
    return styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Formater la priorité pour l'affichage
  const formatPriority = (priority?: string): string => {
    if (!priority) return 'Non définie'
    const priorityMap: Record<string, string> = {
      'low': 'Basse',
      'medium': 'Moyenne',
      'high': 'Haute',
      'critical': 'Critique',
    }
    return priorityMap[priority] || priority
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    const styles: Record<string, string> = {
      'low': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'high': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      'critical': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    }
    return styles[priority] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Formater la date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  // Charger les images avec authentification pour l'édition
  const loadEditImageUrl = async (attachmentId: number, ticketId: number) => {
    if (editImageUrls[attachmentId]) return editImageUrls[attachmentId]

    try {
      const token = sessionStorage.getItem('token')
      const endpoint = `${API_BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}/thumbnail`
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) return null

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setEditImageUrls(prev => ({ ...prev, [attachmentId]: url }))
      return url
    } catch (err) {
      console.error('Erreur lors du chargement de l\'image:', err)
      return null
    }
  }

  // Ouvrir le modal de modification
  const handleOpenEditModal = async (ticket: TicketDTO) => {
    setTicketToEdit(ticket)
    loadCategories()

    // Trouver l'utilisateur correspondant au requester_id ou au nom du demandeur
    const requesterUser = ticket.requester_id 
      ? users.find(u => u.id === ticket.requester_id)
      : users.find(u => {
          const fullName = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username
          return fullName === ticket.requester_name || u.username === ticket.requester_name
        })
    
    // Trouver le département correspondant au nom du département
    const requesterDept = departments.find(d => d.name === ticket.requester_department || d.code === ticket.requester_department)
    
    setEditSelectedRequesterId(requesterUser?.id || '')
    setEditSelectedDepartmentId(requesterDept?.id || '')
    setEditSelectedFilialeId(ticket.filiale_id || '')
    setEditSelectedSoftwareId(ticket.software_id || '')
    // Initialiser le filtre de filiale pour les demandeurs avec la filiale du ticket
    if (ticket.filiale_id && canCreateLikeAdmin) {
      setEditRequesterFilialeFilter(ticket.filiale_id)
      // Charger les départements de cette filiale
      loadDepartments(ticket.filiale_id)
    } else {
      setEditRequesterFilialeFilter('')
      // Charger tous les départements ou ceux de la filiale de l'utilisateur
      if (user?.filiale_id) {
        loadDepartments(user.filiale_id)
      } else {
        loadDepartments()
      }
    }
    
    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      category: ticket.category || '',
      status: (ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture') || 'ouvert',
      priority: (ticket.priority as 'low' | 'medium' | 'high' | 'critical') || 'low',
      requester_name: ticket.requester_name || '',
      requester_department: ticket.requester_department || '',
    })
    setNewImages([])
    setImagesToDelete([])
    setEditImageUrls({})
    setIsEditModalOpen(true)
    
    // Charger les utilisateurs et départements si pas encore chargés
    if (users.length === 0) {
      loadUsers()
    }
    if (departments.length === 0) {
      loadDepartments()
    }
    if (filiales.length === 0) {
      loadFiliales()
    }
    if (softwareList.length === 0) {
      loadSoftware()
    }

    // Charger les attachments
    setLoadingEditAttachments(true)
    try {
      const attachments = await ticketService.getAttachments(ticket.id)
      setEditAttachments(attachments)
      // Charger les URLs des images
      attachments.forEach((attachment) => {
        if (attachment.is_image) {
          loadEditImageUrl(attachment.id, ticket.id)
        }
      })
    } catch (err) {
      console.error('Erreur lors du chargement des attachments:', err)
      toast.error('Erreur lors du chargement des images')
    } finally {
      setLoadingEditAttachments(false)
    }
  }

  // Supprimer une image (marquer pour suppression)
  const handleDeleteImage = (attachmentId: number) => {
    setImagesToDelete([...imagesToDelete, attachmentId])
  }

  // Annuler la suppression d'une image
  const handleCancelDeleteImage = (attachmentId: number) => {
    setImagesToDelete(imagesToDelete.filter(id => id !== attachmentId))
  }

  // Modifier le ticket
  const handleUpdate = async () => {
    if (!ticketToEdit) return

    setIsUpdating(true)
    try {
      const hasAttachmentChanges = imagesToDelete.length > 0 || newImages.length > 0

      // Supprimer les images marquées pour suppression
      for (const attachmentId of imagesToDelete) {
        try {
          setIsDeletingAttachment(attachmentId)
          await ticketService.deleteAttachment(ticketToEdit.id, attachmentId)
        } catch (err) {
          console.error('Erreur lors de la suppression de l\'image:', err)
          toast.error(`Erreur lors de la suppression de l'image`)
        } finally {
          setIsDeletingAttachment(null)
        }
      }

      // Uploader les nouvelles images
      for (const image of newImages) {
        try {
          await ticketService.uploadAttachment(ticketToEdit.id, image)
        } catch (err) {
          console.error('Erreur lors de l\'upload de l\'image:', err)
          toast.error(`Erreur lors de l'upload de l'image ${image.name}`)
        }
      }

      // Préparer les données de mise à jour avec les informations du demandeur et du département sélectionnés
      const updateData: UpdateTicketRequest = {}
      const normalize = (value?: string) => (value ?? '').trim()
      const priorityValue = (editFormData.priority || ticketToEdit.priority || 'medium') as UpdateTicketRequest['priority']

      if (normalize(editFormData.title) && normalize(editFormData.title) !== normalize(ticketToEdit.title)) {
        updateData.title = normalize(editFormData.title)
      }
      if (
        normalize(editFormData.description) &&
        normalize(editFormData.description) !== normalize(ticketToEdit.description)
      ) {
        updateData.description = normalize(editFormData.description)
      }
      if (editFormData.category && editFormData.category !== ticketToEdit.category) {
        updateData.category = editFormData.category
      }
      // Le statut n'est pas modifiable depuis le modal (transitions automatiques uniquement)
      if (priorityValue && priorityValue !== ticketToEdit.priority) {
        updateData.priority = priorityValue
      }
      
      // Gérer software_id
      if (editSelectedSoftwareId && editSelectedSoftwareId !== ticketToEdit.software_id) {
        updateData.software_id = editSelectedSoftwareId
      } else if (!editSelectedSoftwareId && ticketToEdit.software_id) {
        // Si on retire le logiciel
        updateData.software_id = undefined
      }
      
      // Si un utilisateur est sélectionné, utiliser son ID et mettre à jour le nom
      if (editSelectedRequesterId) {
        const selectedUser = users.find(u => u.id === editSelectedRequesterId)
        if (selectedUser) {
          updateData.requester_id = editSelectedRequesterId
          // Mettre à jour automatiquement le nom du demandeur basé sur l'utilisateur sélectionné
          const newRequesterName = selectedUser.first_name && selectedUser.last_name
            ? `${selectedUser.first_name} ${selectedUser.last_name}`
            : selectedUser.username
          if (newRequesterName !== ticketToEdit.requester_name) {
            updateData.requester_name = newRequesterName
          }
        }
      } else if (editFormData.requester_name !== ticketToEdit.requester_name) {
        // Si aucun requester_id mais le nom a changé manuellement, mettre à jour le nom
        updateData.requester_name = editFormData.requester_name
      }
      
      // Si un département est sélectionné, utiliser son nom
      if (editSelectedDepartmentId) {
        const selectedDept = departments.find(d => d.id === editSelectedDepartmentId)
        if (selectedDept) {
          if (selectedDept.name !== ticketToEdit.requester_department) {
            updateData.requester_department = selectedDept.name
          }
        }
      } else if (editFormData.requester_department && editFormData.requester_department !== ticketToEdit.requester_department) {
        // Si aucun département sélectionné mais le nom a changé manuellement, mettre à jour
        updateData.requester_department = editFormData.requester_department
      }
      
      if (Object.keys(updateData).length === 0 && !hasAttachmentChanges) {
        toast.info('Aucune modification à enregistrer')
        setIsEditModalOpen(false)
        return
      }

      // Mettre à jour le ticket
      const updatedTicket = Object.keys(updateData).length > 0
        ? await ticketService.update(ticketToEdit.id, updateData)
        : ticketToEdit
      setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t)))
      setIsEditModalOpen(false)
      setNewImages([])
      setImagesToDelete([])
      setEditImageUrls({})
      setEditSelectedFilialeId('')
      setEditSelectedSoftwareId('')
      if (hasAttachmentChanges) {
        await loadTickets()
      }
      toast.success('Ticket modifié avec succès')
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification du ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  // Gérer la suppression
  const handleDeleteClick = (ticket: TicketDTO) => {
    setTicketToDelete(ticket)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return

    try {
      await ticketService.delete(ticketToDelete.id)
      setIsDeleteModalOpen(false)
      setTicketToDelete(null)
      await loadTickets()
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression du ticket')
    }
  }

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const canViewTickets =
    hasPermission('tickets.view_all') ||
    hasPermission('tickets.view_filiale') ||
    hasPermission('tickets.view_team') ||
    hasPermission('tickets.view_own') ||
    hasPermission('tickets.create')
  const canViewInternes =
    hasPermission('tickets_internes.view_own') ||
    hasPermission('tickets_internes.view_department') ||
    hasPermission('tickets_internes.view_filiale') ||
    hasPermission('tickets_internes.view_all')

  if (!canViewTickets && !canViewInternes) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les tickets" />
  }

  const activeTab =
    tabParam === 'internes' && canViewInternes
      ? 'internes'
      : canViewTickets
        ? 'tickets'
        : 'internes'

  const setTicketsTab = (tab: 'tickets' | 'internes') => {
    setSearchParams(tab === 'internes' ? { tab: 'internes' } : {}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Onglets */}
            <nav className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1" aria-label="Onglets">
              {canViewTickets && (
                <button
                  type="button"
                  onClick={() => setTicketsTab('tickets')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'tickets'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Tickets
                </button>
              )}
              {canViewInternes && (
                <button
                  type="button"
                  onClick={() => setTicketsTab('internes')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'internes'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Tickets internes
                </button>
              )}
            </nav>
          </div>
        </div>
        {activeTab === 'tickets' && hasPermission('tickets.create') && (
          <button
            onClick={() => {
              setIsModalOpen(true)
              // Recharger les catégories à l'ouverture du modal pour avoir les dernières données
              loadCategories()
              loadUserDepartment()
              // Charger les départements et logiciels selon les permissions
              if (canCreateLikeAdmin) {
                // Pour admin ou résolveur : charger tous les départements par défaut
                loadDepartments()
                // Charger les logiciels pour la filiale de l'utilisateur par défaut
                if (user?.filiale_id) {
                  loadSoftware(user.filiale_id)
                }
              } else {
                // Pour les autres : charger les départements de leur filiale
                if (user?.filiale_id) {
                  loadDepartments(user.filiale_id)
                  loadSoftware(user.filiale_id)
                }
              }
            }}
            className="btn btn-primary flex items-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau ticket
          </button>
        )}
      </div>

      {activeTab === 'tickets' && (
        <div className="flex items-center gap-2">
          <p className="text-gray-600 dark:text-gray-400">Gérez tous les tickets et incidents</p>
          <button
            onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
            className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
            title="Qu'est-ce qu'un ticket ?"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'internes' && (
        <div className="flex items-center gap-2">
          <p className="text-gray-600 dark:text-gray-400">Création et suivi des tickets internes (départements non-IT)</p>
          <button
            onClick={() => setIsInfoModalOpenInternes(!isInfoModalOpenInternes)}
            className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
            title="Qu'est-ce qu'un ticket interne ?"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'internes' && isInfoModalOpenInternes && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'un ticket interne ?</p>
              <p className="whitespace-pre-line">
                Les tickets internes permettent aux départements non-IT de gérer leurs propres demandes et tâches (tâche interne, demande interne, suivi projet).
                {'\n\n'}• Ils sont créés et assignés au sein du même département (sauf pour l'admin système qui peut assigner à tout le monde).
                {'\n'}• L'assigné ou son chef peut saisir le temps estimé et le temps passé sur la page de détails du ticket.
                {'\n'}• Les tickets assignés apparaissent dans « Mon panier » et l'assigné reçoit une notification.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'internes' && <TicketInternesTab />}

      {activeTab === 'tickets' && (
        <>
      {/* Note d'explication en dessous du header pour ne pas déranger le bouton */}
      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'un ticket ?</p>
              <p className="whitespace-pre-line">
                Un ticket est une demande ou un problème enregistré dans le système Kronos. Il peut être de plusieurs types :
                {'\n\n'}• Incident : Problème qui interrompt un service
                {'\n'}• Demande : Demande de service ou d'assistance
                {'\n'}• Changement : Modification planifiée de l'infrastructure
                {'\n'}• Développement : Demande d'évolution ou de nouvelle fonctionnalité
                {'\n\n'}Chaque ticket suit un cycle de vie avec différents statuts (Ouvert, En cours, En attente, Clôturé) et peut être assigné à un technicien pour traitement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`btn btn-secondary flex items-center ${activeFiltersCount > 0 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''}`}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-600 dark:bg-primary-500 text-white text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Panneau de filtres */}
          {isFiltersOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Filtre par statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Statut
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as typeof filters.status })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="ouvert">Ouvert</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_attente">En attente</option>
                    <option value="resolu">Résolu</option>
                    <option value="cloture">Clôturé</option>
                  </select>
                </div>

                {/* Filtre par priorité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priorité
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value as typeof filters.priority })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Toutes les priorités</option>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>

                {/* Filtre par utilisateur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Utilisateur assigné
                  </label>
                  {loadingUsers ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement...
                    </div>
                  ) : (
                    <select
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Tous les utilisateurs</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name} (${user.username})`
                            : user.username}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtre par département */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Département
                  </label>
                  {loadingDepartments ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement...
                    </div>
                  ) : (
                    <select
                      value={filters.departmentId}
                      onChange={(e) => setFilters({ ...filters, departmentId: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Tous les départements</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtre par filiale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filiale
                  </label>
                  {loadingFiliales ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement...
                    </div>
                  ) : (
                    <select
                      value={filters.filialeId}
                      onChange={(e) => setFilters({ ...filters, filialeId: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Toutes les filiales</option>
                      {(filiales || []).map((filiale) => (
                        <option key={filiale.id} value={filiale.id}>
                          {filiale.name} {filiale.code ? `(${filiale.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtre par logiciel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logiciel
                  </label>
                  {loadingSoftware ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement...
                    </div>
                  ) : (
                    <select
                      value={filters.softwareId}
                      onChange={(e) => setFilters({ ...filters, softwareId: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Tous les logiciels</option>
                      {(softwareList || []).map((software) => (
                        <option key={software.id} value={software.id}>
                          {software.name}{software.version ? ` - v${software.version}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Filtre par date de début */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Filtre par date de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de fin
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      min={filters.dateFrom || undefined}
                      className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Boutons d'action des filtres */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>
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

      {/* Tableau des tickets */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun ticket trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigné à
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Demandeur / Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filiale
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logiciel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière mise à jour
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.code || `#${ticket.id}`}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                          {formatStatus(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                          {formatPriority(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {ticket.assigned_to 
                            ? (
                              <>
                                <span>{`${ticket.assigned_to.first_name || ''} ${ticket.assigned_to.last_name || ''}`.trim() || ticket.assigned_to.username}</span>
                                {ticket.assigned_to.email && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.assigned_to.email}</div>
                                )}
                              </>
                            )
                            : 'Non assigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{getRequesterName(ticket)}</div>
                        {ticket.requester_department && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.requester_department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {ticket.filiale ? (
                            <span>
                              {ticket.filiale.name}
                              {ticket.filiale.code && ` (${ticket.filiale.code})`}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {ticket.software ? (
                            <span>
                              {ticket.software.name}
                              {ticket.software.version ? ` - v${ticket.software.version}` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(ticket.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`${basePath}/tickets/${ticket.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Voir"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          {hasPermission('tickets.update') && (
                            <button
                              onClick={() => handleOpenEditModal(ticket)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('tickets.delete') && (
                            <button
                              onClick={() => handleDeleteClick(ticket)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
          </>
        )}
      </div>

      {/* Modal d'ajout de ticket */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          // Réinitialiser avec la première catégorie disponible ou la valeur par défaut
          const defaultCategory = categories.length > 0 
            ? categories[0].slug as CreateTicketRequest['category']
            : 'incident' as CreateTicketRequest['category']
          // Définir la source par défaut selon les permissions
          const defaultSource = canCreateLikeAdmin ? 'direct' : 'kronos'
          setFormData({
            title: '',
            description: '',
            category: defaultCategory,
            source: defaultSource as CreateTicketRequest['source'],
            priority: 'medium',
            requester_name: '',
            requester_department: '',
          })
          setPhotos([])
          setSelectedRequesterId('')
          setSelectedDepartmentId('')
          setRequesterFilialeFilter('')
          setUseManualRequester(false)
          setManualRequesterFirstName('')
          setManualRequesterLastName('')
          setSelectedFilialeId('')
          setSelectedSoftwareId('')
          // Recharger les départements selon les permissions
          if (canCreateLikeAdmin) {
            loadDepartments() // Charger tous les départements
          } else if (user?.filiale_id) {
            loadDepartments(user.filiale_id) // Charger les départements de la filiale de l'utilisateur
          }
        }}
        title="Nouveau ticket"
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setIsSubmitting(true)
            try {
              // Validation des champs requis
              if (!formData.title?.trim()) {
                toast.error('Le titre est obligatoire')
                return
              }
              if (!formData.description?.trim()) {
                toast.error('La description est obligatoire')
                return
              }
              // Récupérer les informations du demandeur selon le mode sélectionné
              let selectedUser: UserDTO | undefined
              let requesterName = ''
              
              if (useManualRequester && canCreateLikeAdmin) {
                // Mode manuel pour IT filiale fournisseur : utiliser les champs saisis (optionnels)
                const first = manualRequesterFirstName.trim()
                const last = manualRequesterLastName.trim()
                requesterName = [first, last].filter(Boolean).join(' ')
              } else {
                // Mode normal : un utilisateur doit être sélectionné
                if (!selectedRequesterId) {
                  toast.error('Veuillez sélectionner un demandeur')
                  setIsSubmitting(false)
                  return
                }
                selectedUser = users.find(u => u.id === selectedRequesterId)
                if (!selectedUser) {
                  toast.error('Erreur lors de la récupération des informations')
                  setIsSubmitting(false)
                  return
                }
                // Construire un nom lisible pour le demandeur
                if (selectedUser.first_name || selectedUser.last_name) {
                  requesterName = `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username
                } else {
                  requesterName = selectedUser.username
                }
              }
              
              // Validation du département selon les permissions
              let requesterDept = ''
              if (!canCreateLikeAdmin) {
                // Pour les autres filiales, le département est obligatoire
                if (!selectedDepartmentId) {
                  toast.error('Veuillez sélectionner un département')
                  setIsSubmitting(false)
                  return
                }
                const selectedDept = departments.find(d => d.id === selectedDepartmentId)
                if (!selectedDept) {
                  toast.error('Erreur lors de la récupération du département')
                  setIsSubmitting(false)
                  return
                }
                requesterDept = selectedDept.name
              } else {
                // Pour la filiale fournisseur IT, le département est optionnel
                if (selectedDepartmentId) {
                  const selectedDept = departments.find(d => d.id === selectedDepartmentId)
                  if (selectedDept) {
                    requesterDept = selectedDept.name
                  }
                }
                // Si aucun département sélectionné, utiliser celui de l'utilisateur sélectionné si disponible
                if (!requesterDept && selectedUser?.department) {
                  requesterDept = selectedUser.department.name || selectedUser.department.code || ''
                }
              }
              
              // Convertir le temps estimé en minutes avant l'envoi
              const dataToSend: any = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                source: formData.source,
                requester_id: selectedUser?.id,
                requester_name: requesterName || undefined,
                requester_department: requesterDept || undefined, // Ne pas envoyer si vide
              }
              
              // Déterminer la filiale du ticket
              if (canCreateLikeAdmin) {
                // Pour la filiale fournisseur IT : utiliser la filiale du demandeur sélectionné ou celle du filtre
                if (selectedRequesterId) {
                  const selectedUser = users.find(u => u.id === selectedRequesterId)
                  if (selectedUser?.filiale_id) {
                    dataToSend.filiale_id = selectedUser.filiale_id
                  } else if (requesterFilialeFilter) {
                    dataToSend.filiale_id = requesterFilialeFilter
                  }
                } else if (requesterFilialeFilter) {
                  dataToSend.filiale_id = requesterFilialeFilter
                } else if (user?.filiale_id) {
                  // Fallback : utiliser la filiale de l'utilisateur
                  dataToSend.filiale_id = user.filiale_id
                }
              } else {
                // Si l'utilisateur ne peut créer que pour sa propre filiale, forcer sa filiale
                if (user?.filiale_id) {
                  dataToSend.filiale_id = user.filiale_id
                }
              }
              
              // Ajouter software_id si sélectionné
              if (selectedSoftwareId) {
                dataToSend.software_id = selectedSoftwareId
              }
              
              // Ajouter priority seulement s'il est défini
              if (formData.priority) {
                dataToSend.priority = formData.priority
              }
              
              // Ajouter estimated_time seulement s'il est défini et > 0
              if (estimatedTimeValue !== '' && estimatedTimeValue > 0 && !isNaN(estimatedTimeValue)) {
                const baseValue = Number(estimatedTimeValue)
                const estimatedMinutes = Math.round(
                  estimatedTimeUnit === 'minutes'
                    ? baseValue
                    : estimatedTimeUnit === 'hours'
                      ? baseValue * 60
                      : baseValue * 480
                )
                if (estimatedMinutes > 0) {
                  dataToSend.estimated_time = estimatedMinutes
                }
              }
              
              // Logger le payload pour déboguer
              console.log('Payload envoyé:', JSON.stringify(dataToSend, null, 2))
              console.log('Estimated time saisi:', estimatedTimeValue, estimatedTimeUnit)
              console.log('Estimated minutes calculé:', dataToSend.estimated_time)
              
              // 1. Créer le ticket d'abord
              const ticket = await ticketService.create(dataToSend)
              
              // 2. Uploader toutes les images si elles existent
              if (photos.length > 0) {
                try {
                  for (let i = 0; i < photos.length; i++) {
                    await ticketService.uploadAttachment(ticket.id, photos[i], '', i)
                  }
                } catch (uploadError) {
                  console.error('Erreur lors de l\'upload des images:', uploadError)
                  // On continue même si l'upload échoue, le ticket est déjà créé
                }
              }

              setIsModalOpen(false)
              // Réinitialiser avec la première catégorie disponible ou la valeur par défaut
              const defaultCategory = categories.length > 0 
                ? categories[0].slug as CreateTicketRequest['category']
                : 'incident' as CreateTicketRequest['category']
              setFormData({
                title: '',
                description: '',
                category: defaultCategory,
                source: 'direct',
                priority: 'medium',
                requester_name: '',
                requester_department: '',
              })
              setPhotos([])
              setEstimatedTimeValue('')
              setEstimatedTimeUnit('hours')
              // Réinitialiser la filiale seulement si l'utilisateur peut sélectionner n'importe quelle filiale
              if (canCreateLikeAdmin) {
                setSelectedFilialeId('')
              }
              setSelectedSoftwareId('')
              await loadTickets() // Rafraîchir la liste des tickets
              toast.success('Ticket créé avec succès' + (photos.length > 0 ? ` et ${photos.length} image(s) ajoutée(s)` : ''))
            } catch (error) {
              console.error('Erreur lors de la création du ticket:', error)
              const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du ticket'
              toast.error(errorMessage)
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="space-y-4"
        >
          {/* Informations du demandeur */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Informations du demandeur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Demandeur {!useManualRequester && <span className="text-red-500">*</span>}
                </label>
                {/* Filtre par filiale pour le département IT (filiale fournisseur) */}
                {canCreateLikeAdmin && (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        id="useManualRequester"
                        type="checkbox"
                        checked={useManualRequester}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setUseManualRequester(checked)
                          // Réinitialiser les champs liés quand on bascule de mode
                          setSelectedRequesterId('')
                          if (checked) {
                            // En mode manuel, on ne dépend plus du filtre filiale pour les utilisateurs
                            setRequesterFilialeFilter('')
                          }
                        }}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="useManualRequester" className="text-xs text-gray-700 dark:text-gray-300">
                        Saisir manuellement le demandeur (nom / prénom)
                      </label>
                    </div>
                    {!useManualRequester && (
                      <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Filtrer par filiale
                          </label>
                          {requesterFilialeFilter && (
                            <span className="ml-auto px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                              Filtré
                            </span>
                          )}
                        </div>
                        <select
                          value={requesterFilialeFilter}
                          onChange={(e) => {
                            const filialeId = e.target.value ? parseInt(e.target.value) : ''
                            setRequesterFilialeFilter(filialeId)
                            // Réinitialiser la sélection du demandeur quand on change de filiale
                            setSelectedRequesterId('')
                            setSelectedDepartmentId('')
                            // Recharger les départements de la nouvelle filiale
                            if (filialeId) {
                              loadDepartments(filialeId)
                            } else {
                              loadDepartments() // Charger tous les départements si aucune filiale sélectionnée
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                        >
                          <option value="">Toutes les filiales</option>
                          {(filiales || []).map((filiale) => (
                            <option key={filiale.id} value={filiale.id}>
                              {filiale.name} {filiale.code ? `(${filiale.code})` : ''}
                              {}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                {useManualRequester && canCreateLikeAdmin ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Prénom du demandeur (optionnel)
                      </label>
                      <input
                        type="text"
                        value={manualRequesterFirstName}
                        onChange={(e) => setManualRequesterFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Nom du demandeur (optionnel)
                      </label>
                      <input
                        type="text"
                        value={manualRequesterLastName}
                        onChange={(e) => setManualRequesterLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                        placeholder="Nom"
                      />
                    </div>
                  </div>
                ) : loadingUsers ? (
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Chargement des utilisateurs...
                  </div>
                ) : (
                  <select
                    required={!useManualRequester}
                    value={selectedRequesterId}
                    onChange={(e) => {
                      setSelectedRequesterId(e.target.value ? parseInt(e.target.value) : '')
                      // Mettre à jour automatiquement le département si l'utilisateur a un département
                      if (e.target.value) {
                        const user = users.find(u => u.id === parseInt(e.target.value))
                        if (user?.department_id) {
                          setSelectedDepartmentId(user.department_id)
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {(() => {
                      // Filtrer les utilisateurs selon la filiale sélectionnée (si filtre activé)
                      const filteredUsers = requesterFilialeFilter
                        ? users.filter(user => user.filiale_id === requesterFilialeFilter)
                        : users
                      
                      return filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name} (${user.username})`
                            : user.username}
                          {user.department && ` - ${user.department.code || user.department.name}`}
                          {user.filiale && ` [${user.filiale.name}]`}
                        </option>
                      ))
                    })()}
                  </select>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Département {!canCreateLikeAdmin && <span className="text-red-500">*</span>}
                  </label>
                  {loadingDepartments ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement des départements...
                    </div>
                  ) : (
                    <select
                      required={!canCreateLikeAdmin}
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Sélectionner un département</option>
                      {(() => {
                        // Filtrer les départements selon les permissions
                        let filteredDepartments = departments
                        
                        if (canCreateLikeAdmin) {
                          // Pour la filiale fournisseur IT : filtrer selon le filtre de filiale si activé
                          if (requesterFilialeFilter) {
                            filteredDepartments = departments.filter(dept => dept.filiale_id === requesterFilialeFilter)
                          }
                        } else {
                          // Pour les autres filiales : filtrer uniquement par leur propre filiale
                          if (user?.filiale_id) {
                            filteredDepartments = departments.filter(dept => dept.filiale_id === user.filiale_id)
                          } else {
                            filteredDepartments = [] // Pas de filiale = pas de départements
                          }
                        }
                        
                        return filteredDepartments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))
                      })()}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logiciel concerné
                  </label>
                  {loadingSoftware ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Chargement des logiciels...
                    </div>
                  ) : (
                    <select
                      value={selectedSoftwareId}
                      onChange={(e) => setSelectedSoftwareId(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="">Sélectionner un logiciel (optionnel)</option>
                      {(softwareList || []).map((software) => (
                        <option key={software.id} value={software.id}>
                          {software.name} {software.code ? `(${software.code})` : ''}
                          {software.version && ` - v${software.version}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

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
              placeholder="Résumé du problème ou de la demande"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Description détaillée du ticket"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              {loadingCategories ? (
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Chargement des catégories...</span>
                </div>
              ) : (
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as CreateTicketRequest['category'],
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                >
                  {categories.length === 0 ? (
                    <option value="">Aucune catégorie disponible</option>
                  ) : (
                    categories
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((category) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))
                  )}
                </select>
              )}
              {!loadingCategories && categories.length === 0 && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  Aucune catégorie active trouvée. Veuillez créer une catégorie dans la gestion des catégories.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value as CreateTicketRequest['source'],
                  })
                }
                disabled={!canSelectSource}
                className={`w-full h-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent ${
                  !canSelectSource ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-75' : ''
                }`}
              >
                <option value="mail">Mail</option>
                <option value="appel">Appel téléphonique</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="direct">Direct</option>
                <option value="kronos">Kronos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as CreateTicketRequest['priority'],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>

            {/* Pour les non-IT fournisseur : afficher Photos du problème à la place du Temps estimé */}
            {!canSelectSource ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photos du problème (optionnel)
                </label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setPhotos((prev) => [...prev, ...files])
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer inline-flex items-center justify-center w-full h-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Ajouter des photos
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Temps estimé : visible uniquement pour le département IT de la filiale fournisseur */
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temps estimé
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedTimeValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setEstimatedTimeValue(value === '' ? '' : parseFloat(value) || '')
                    }}
                    className="w-full sm:flex-1 min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    placeholder="Ex: 2.5 (optionnel)"
                  />
                  <select
                    value={estimatedTimeUnit}
                    onChange={(e) => setEstimatedTimeUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className="w-full sm:w-32 sm:shrink-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Heures</option>
                    <option value="days">Jours</option>
                  </select>
                </div>
                {estimatedTimeValue !== '' && estimatedTimeValue > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(
                      estimatedTimeUnit === 'minutes'
                        ? Number(estimatedTimeValue)
                        : estimatedTimeUnit === 'hours'
                          ? Number(estimatedTimeValue) * 60
                          : Number(estimatedTimeValue) * 480
                    )} minutes
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Upload de photos : affiché en bas uniquement pour le département IT de la filiale fournisseur */}
          {canSelectSource && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photos du problème (optionnel)
              </label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setPhotos((prev) => [...prev, ...files])
                  }}
                  className="hidden"
                  id="photo-upload-it"
                />
                <label
                  htmlFor="photo-upload-it"
                  className="cursor-pointer inline-flex items-center justify-center w-full h-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Ajouter des photos
                </label>
              </div>
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{photo.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de modification */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setTicketToEdit(null)
          setNewImages([])
          setImagesToDelete([])
          setEditImageUrls({})
          setEditSelectedRequesterId('')
          setEditSelectedDepartmentId('')
          setEditRequesterFilialeFilter('')
        }}
        title="Modifier le ticket"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie
            </label>
            {loadingCategories ? (
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Chargement des catégories...
              </div>
            ) : (
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                {ticketToEdit?.category && !categories.some((c) => c.slug === ticketToEdit!.category) && (
                  <option value={ticketToEdit.category}>{ticketToEdit.category} (inactive)</option>
                )}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
                {categories.length === 0 && !ticketToEdit?.category && (
                  <option value="">Aucune catégorie disponible</option>
                )}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priorité
              </label>
              <select
                value={editFormData.priority}
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="critical">Critique</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Demandeur
              </label>
              {/* Filtre par filiale pour le département IT (filiale fournisseur) */}
              {canCreateLikeAdmin && (
                <div className="mb-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Filtrer par filiale
                    </label>
                    {editRequesterFilialeFilter && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                        Filtré
                      </span>
                    )}
                  </div>
                    <select
                      value={editRequesterFilialeFilter}
                      onChange={(e) => {
                        const filialeId = e.target.value ? parseInt(e.target.value) : ''
                        setEditRequesterFilialeFilter(filialeId)
                        // Réinitialiser la sélection du demandeur et du département quand on change de filiale
                        setEditSelectedRequesterId('')
                        setEditSelectedDepartmentId('')
                        // Recharger les départements de la nouvelle filiale
                        if (filialeId) {
                          loadDepartments(filialeId)
                        } else {
                          loadDepartments() // Charger tous les départements si aucune filiale sélectionnée
                        }
                      }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                  >
                    <option value="">Toutes les filiales</option>
                    {(filiales || []).map((filiale) => (
                      <option key={filiale.id} value={filiale.id}>
                        {filiale.name} {filiale.code ? `(${filiale.code})` : ''}
                        {}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {loadingUsers ? (
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Chargement des utilisateurs...
                </div>
              ) : (
                <select
                  value={editSelectedRequesterId}
                  onChange={(e) => {
                    setEditSelectedRequesterId(e.target.value ? parseInt(e.target.value) : '')
                    // Mettre à jour automatiquement le département si l'utilisateur a un département
                    if (e.target.value) {
                      const user = users.find(u => u.id === parseInt(e.target.value))
                      if (user?.department_id) {
                        setEditSelectedDepartmentId(user.department_id)
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {(() => {
                    // Filtrer les utilisateurs selon la filiale sélectionnée (si filtre activé)
                    const filteredUsers = editRequesterFilialeFilter
                      ? users.filter(user => user.filiale_id === editRequesterFilialeFilter)
                      : users
                    
                    return filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name} (${user.username})`
                          : user.username}
                        {user.department && ` - ${user.department.name}${user.department.code ? ` (${user.department.code})` : ''}`}
                        {user.filiale && ` [${user.filiale.name}]`}
                      </option>
                    ))
                  })()}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Département
              </label>
              {loadingDepartments ? (
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Chargement des départements...
                </div>
              ) : (
                  <select
                    value={editSelectedDepartmentId}
                    onChange={(e) => setEditSelectedDepartmentId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Sélectionner un département</option>
                    {(() => {
                      // Filtrer les départements selon la filiale sélectionnée dans le filtre (si filtre activé)
                      const filteredDepartments = editRequesterFilialeFilter
                        ? departments.filter(dept => dept.filiale_id === editRequesterFilialeFilter)
                        : departments
                      
                      return filteredDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))
                    })()}
                  </select>
              )}
            </div>
          </div>

          {/* Filiale et Logiciel */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Filiale et Logiciel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filiale
                </label>
                {loadingFiliales ? (
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Chargement...
                  </div>
                ) : (
                  <select
                    value={editSelectedFilialeId}
                    onChange={(e) => setEditSelectedFilialeId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Sélectionner une filiale (optionnel)</option>
                    {(filiales || []).map((filiale) => (
                      <option key={filiale.id} value={filiale.id}>
                        {filiale.name} {filiale.code ? `(${filiale.code})` : ''}
                        {}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  La filiale ne peut pas être modifiée après création
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logiciel concerné
                </label>
                {loadingSoftware ? (
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Chargement...
                  </div>
                ) : (
                  <select
                    value={editSelectedSoftwareId}
                    onChange={(e) => setEditSelectedSoftwareId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Aucun logiciel</option>
                    {(softwareList || []).map((software) => (
                      <option key={software.id} value={software.id}>
                        {software.name}{software.version ? ` - v${software.version}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Gestion des images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Images existantes
            </label>
            {loadingEditAttachments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Chargement des images...</span>
              </div>
            ) : editAttachments.filter(a => a.is_image && !imagesToDelete.includes(a.id)).length > 0 ? (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {editAttachments
                  .filter(a => a.is_image && !imagesToDelete.includes(a.id))
                  .map((attachment) => {
                    const imageUrl = editImageUrls[attachment.id]
                    return (
                      <div key={attachment.id} className="relative group">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={attachment.file_name}
                            className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteImage(attachment.id)}
                          disabled={isDeletingAttachment === attachment.id}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Supprimer"
                        >
                          {isDeletingAttachment === attachment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Aucune image</p>
            )}

            {/* Images marquées pour suppression */}
            {imagesToDelete.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  {imagesToDelete.length} image(s) seront supprimée(s) :
                </p>
                <div className="flex flex-wrap gap-2">
                  {imagesToDelete.map((attachmentId) => {
                    const attachment = editAttachments.find(a => a.id === attachmentId)
                    if (!attachment) return null
                    return (
                      <div key={attachmentId} className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-yellow-300 dark:border-yellow-700">
                        <span className="text-xs text-gray-700 dark:text-gray-300">{attachment.file_name}</span>
                        <button
                          onClick={() => handleCancelDeleteImage(attachmentId)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                          title="Annuler la suppression"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ajouter de nouvelles images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ajouter de nouvelles images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setNewImages([...newImages, ...files])
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
            {newImages.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-4">
                {newImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={image.name}
                      className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      onClick={() => setNewImages(newImages.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Retirer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setIsEditModalOpen(false)
                setTicketToEdit(null)
                setNewImages([])
                setImagesToDelete([])
                setEditImageUrls({})
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              disabled={isUpdating}
            >
              Annuler
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editFormData.title?.trim() || !editFormData.description?.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Modification...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setTicketToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le ticket"
        message={
          ticketToDelete
            ? `Êtes-vous sûr de vouloir supprimer le ticket "${ticketToDelete.code || ticketToDelete.title}" ? Cette action est irréversible.`
            : ''
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
      />
        </>
      )}
    </div>
  )
}

export default Tickets
