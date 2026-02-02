import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Clock, User, MessageSquare, Paperclip, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, UserPlus, Trash2, X, BookOpen, Edit, Plus, Timer, CheckSquare } from 'lucide-react'
import { ticketService, TicketDTO, TicketCommentDTO, TicketHistoryDTO, TicketAttachmentDTO, CreateTicketCommentRequest, UpdateTicketCommentRequest, UpdateTicketRequest, ticketSolutionService, TicketSolutionDTO } from '../../services/ticketService'
import { userService, UserDTO } from '../../services/userService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { timesheetService } from '../../services/timesheetService'
import { knowledgeService, KnowledgeCategoryDTO } from '../../services/knowledgeService'
import { ticketCategoryService, TicketCategoryDTO } from '../../services/ticketCategoryService'
import { API_BASE_URL } from '../../config/api'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import ImageCarousel from '../../components/ImageCarousel'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import MarkdownEditor from '../../components/MarkdownEditor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TicketDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/employee') ? '/employee' : '/admin'
  const { hasPermission, user: authUser } = useAuth()
  const [ticket, setTicket] = useState<TicketDTO | null>(null)
  const [comments, setComments] = useState<TicketCommentDTO[]>([])
  const [history, setHistory] = useState<TicketHistoryDTO[]>([])
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1)
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10)
  const [attachments, setAttachments] = useState<TicketAttachmentDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [isUpdatingComment, setIsUpdatingComment] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<TicketCommentDTO | null>(null)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({})
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [userDepartment, setUserDepartment] = useState<DepartmentDTO | null>(null)
  const [editSelectedRequesterId, setEditSelectedRequesterId] = useState<number | ''>('')
  const [editSelectedDepartmentId, setEditSelectedDepartmentId] = useState<number | ''>('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isInvalidating, setIsInvalidating] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isSubmittingForValidation, setIsSubmittingForValidation] = useState(false)
  const [newStatus, setNewStatus] = useState<'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture'>('ouvert')
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'ouvert' as 'ouvert' | 'en_cours' | 'en_attente' | 'cloture',
    priority: 'low' as 'low' | 'medium' | 'high' | 'critical',
    requester_name: '',
    requester_department: '',
    estimated_time_value: '' as number | '',
    estimated_time_unit: 'hours' as 'minutes' | 'hours' | 'days',
  })
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false)
  const [estimateTimeValue, setEstimateTimeValue] = useState<number | ''>('')
  const [estimateTimeUnit, setEstimateTimeUnit] = useState<'minutes' | 'hours' | 'days'>('hours')
  const [isSavingEstimate, setIsSavingEstimate] = useState(false)
  const [newImages, setNewImages] = useState<File[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([])
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<number | null>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  
  // États pour les solutions
  const [solutions, setSolutions] = useState<TicketSolutionDTO[]>([])
  const [loadingSolutions, setLoadingSolutions] = useState(false)
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false)
  const [isEditSolutionModalOpen, setIsEditSolutionModalOpen] = useState(false)
  const [isPublishSolutionModalOpen, setIsPublishSolutionModalOpen] = useState(false)
  const [solutionToEdit, setSolutionToEdit] = useState<TicketSolutionDTO | null>(null)
  const [solutionToPublish, setSolutionToPublish] = useState<TicketSolutionDTO | null>(null)
  const [solutionFormData, setSolutionFormData] = useState({ solution: '' })
  const [editSolutionFormData, setEditSolutionFormData] = useState({ solution: '' })
  const [isSubmittingSolution, setIsSubmittingSolution] = useState(false)
  const [kbCategories, setKbCategories] = useState<KnowledgeCategoryDTO[]>([])
  const [publishFormData, setPublishFormData] = useState({ title: '', category_id: 0 })
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryDTO[]>([])
  const [loadingTicketCategories, setLoadingTicketCategories] = useState(false)

  // Debug: surveiller l'état du modal
  useEffect(() => {
    console.log('État isEditModalOpen changé:', isEditModalOpen)
    if (isEditModalOpen) {
      console.log('Modal de modification ouvert, editFormData:', editFormData)
    }
  }, [isEditModalOpen, editFormData])

  // Charger les images avec authentification. Si thumbnail 404, on tente l'URL download (image complète) avant d'abandonner.
  const loadImageUrl = async (attachmentId: number, ticketId: number, isThumbnail: boolean = true) => {
    if (imageUrls[attachmentId]) return imageUrls[attachmentId]
    if (failedImageIds.has(attachmentId)) return null

    const token = sessionStorage.getItem('token')
    if (!token) return null

    const tryEndpoint = async (endpoint: string) => {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) return null
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    }

    try {
      const thumbnailUrl = `${API_BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}/thumbnail`
      const downloadUrl = `${API_BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}/download`

      let response = await fetch(thumbnailUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImageUrls(prev => ({ ...prev, [attachmentId]: url }))
        return url
      }
      // Thumbnail 404 : tenter l'image complète (download) avant d'abandonner
      if (response.status === 404 && isThumbnail) {
        const url = await tryEndpoint(downloadUrl)
        if (url) {
          setImageUrls(prev => ({ ...prev, [attachmentId]: url }))
          return url
        }
      }
      if (response.status === 404) {
        setFailedImageIds(prev => new Set(prev).add(attachmentId))
        return null
      }
    } catch {
      setFailedImageIds(prev => new Set(prev).add(attachmentId))
    }
    return null
  }

  // Télécharger un fichier avec authentification
  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    if (!ticket) return

    try {
      const token = sessionStorage.getItem('token')
      if (!token) {
        toast.error('Token d\'authentification manquant')
        return
      }

      const endpoint = `${API_BASE_URL}/tickets/${ticket.id}/attachments/${attachmentId}/download`
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        toast.error('Erreur lors du téléchargement du fichier')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err)
      toast.error('Erreur lors du téléchargement du fichier')
    }
  }

  // Charger les solutions d'un ticket
  const loadSolutions = async () => {
    if (!id) return
    setLoadingSolutions(true)
    try {
      const solutionsData = await ticketSolutionService.getByTicketId(parseInt(id))
      setSolutions(Array.isArray(solutionsData) ? solutionsData : [])
    } catch (err) {
      console.error('Erreur lors du chargement des solutions:', err)
      setSolutions([])
    } finally {
      setLoadingSolutions(false)
    }
  }

  // Charger les catégories KB
  const loadKBCategories = async () => {
    try {
      const raw = await knowledgeService.getCategories()
      const categories = Array.isArray(raw) ? raw : []
      setKbCategories(categories)
      if (categories.length > 0 && publishFormData.category_id === 0) {
        setPublishFormData(prev => ({ ...prev, category_id: categories[0].id }))
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories KB:', err)
    }
  }

  // Charger les catégories de tickets (pour le formulaire d'édition)
  const loadTicketCategories = async () => {
    setLoadingTicketCategories(true)
    try {
      const data = await ticketCategoryService.getAll(true)
      setTicketCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des catégories de tickets:', err)
      setTicketCategories([])
    } finally {
      setLoadingTicketCategories(false)
    }
  }

  // Charger les données du ticket
  const loadTicketData = async () => {
    if (!id) {
      setError('ID du ticket manquant')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [ticketData, commentsData, historyData, attachmentsData] = await Promise.all([
        ticketService.getById(parseInt(id), { includeDepartment: true }),
        ticketService.getComments(parseInt(id)),
        ticketService.getHistory(parseInt(id)),
        ticketService.getAttachments(parseInt(id)),
      ])
      console.log('Ticket data loaded:', ticketData)
      console.log('Created by:', ticketData.created_by)
      console.log('Assigned to:', ticketData.assigned_to)
      console.log('Assignees:', ticketData.assignees)
      console.log('Lead:', ticketData.lead)
      if (ticketData.created_by) {
        console.log('Created by details:', {
          id: ticketData.created_by.id,
          username: ticketData.created_by.username,
          first_name: ticketData.created_by.first_name,
          last_name: ticketData.created_by.last_name,
          email: ticketData.created_by.email,
        })
      }
      setTicket(ticketData)
      setComments(commentsData)
      setHistory(historyData)
      setAttachments(attachmentsData)
      
      // Charger les solutions si le ticket est cloturé
      if (ticketData.status === 'cloture') {
        loadSolutions()
      }
    } catch (err) {
      console.error('Erreur lors du chargement du ticket:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTicketData()
    loadKBCategories()
  }, [id])

  useEffect(() => {
    setHistoryCurrentPage(1)
  }, [id])

  // Charger le département de l'utilisateur dès que l'auth est disponible (authUser peut être chargé après le premier rendu)
  useEffect(() => {
    if (authUser?.department_id) {
      loadUserDepartment()
    } else {
      setUserDepartment(null)
    }
  }, [authUser?.id, authUser?.department_id])

  // Charger les URLs des images quand les attachments changent
  useEffect(() => {
    if (ticket && attachments.length > 0) {
      attachments.forEach((attachment) => {
        if (attachment.is_image && !imageUrls[attachment.id]) {
          loadImageUrl(attachment.id, ticket.id, true)
        }
      })
    }

    // Nettoyer les URLs blob lors du démontage
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, ticket?.id])

  // Ajouter un commentaire
  const handleAddComment = async () => {
    if (!newComment.trim() || !ticket) return

    setIsSubmittingComment(true)
    try {
      const commentData: CreateTicketCommentRequest = {
        comment: newComment,
        is_internal: isInternalComment,
      }
      await ticketService.addComment(ticket.id, commentData)
      setNewComment('')
      setIsInternalComment(false)
      // Recharger les commentaires
      const updatedComments = await ticketService.getComments(ticket.id)
      setComments(updatedComments)
    } catch (err) {
      console.error('Erreur lors de l\'ajout du commentaire:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du commentaire')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Modifier un commentaire (auteur uniquement)
  const handleStartEditComment = (comment: TicketCommentDTO) => {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.comment)
  }
  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditCommentText('')
  }
  const handleSaveComment = async () => {
    if (!ticket || editingCommentId == null || !editCommentText.trim()) return
    setIsUpdatingComment(true)
    try {
      await ticketService.updateComment(ticket.id, editingCommentId, { comment: editCommentText.trim() })
      const updatedComments = await ticketService.getComments(ticket.id)
      setComments(updatedComments)
      setEditingCommentId(null)
      setEditCommentText('')
      toast.success('Commentaire modifié')
    } catch (err) {
      console.error('Erreur lors de la modification du commentaire:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification')
    } finally {
      setIsUpdatingComment(false)
    }
  }

  // Supprimer un commentaire (auteur uniquement)
  const handleConfirmDeleteComment = async () => {
    if (!ticket || !commentToDelete) return
    setIsDeletingComment(true)
    try {
      await ticketService.deleteComment(ticket.id, commentToDelete.id)
      const updatedComments = await ticketService.getComments(ticket.id)
      setComments(updatedComments)
      setCommentToDelete(null)
      toast.success('Commentaire supprimé')
    } catch (err) {
      console.error('Erreur lors de la suppression du commentaire:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setIsDeletingComment(false)
    }
  }

  // Ouvrir le modal de création de solution
  const handleOpenSolutionModal = () => {
    setSolutionFormData({ solution: '' })
    setIsSolutionModalOpen(true)
  }

  // Créer une solution
  const handleCreateSolution = async () => {
    if (!ticket || !solutionFormData.solution.trim()) {
      toast.error('La solution ne peut pas être vide')
      return
    }

    setIsSubmittingSolution(true)
    try {
      await ticketSolutionService.create(ticket.id, { solution: solutionFormData.solution })
      toast.success('Solution créée avec succès')
      setIsSolutionModalOpen(false)
      setSolutionFormData({ solution: '' })
      loadSolutions()
    } catch (err) {
      console.error('Erreur lors de la création de la solution:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la solution')
    } finally {
      setIsSubmittingSolution(false)
    }
  }

  // Ouvrir le modal d'édition de solution
  const handleOpenEditSolutionModal = (solution: TicketSolutionDTO) => {
    setSolutionToEdit(solution)
    setEditSolutionFormData({ solution: solution.solution })
    setIsEditSolutionModalOpen(true)
  }

  // Mettre à jour une solution
  const handleUpdateSolution = async () => {
    if (!solutionToEdit || !editSolutionFormData.solution.trim()) {
      toast.error('La solution ne peut pas être vide')
      return
    }

    setIsSubmittingSolution(true)
    try {
      await ticketSolutionService.update(solutionToEdit.id, { solution: editSolutionFormData.solution })
      toast.success('Solution mise à jour avec succès')
      setIsEditSolutionModalOpen(false)
      setSolutionToEdit(null)
      setEditSolutionFormData({ solution: '' })
      loadSolutions()
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la solution:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la solution')
    } finally {
      setIsSubmittingSolution(false)
    }
  }

  // Supprimer une solution
  const handleDeleteSolution = async (solutionId: number) => {
    try {
      await ticketSolutionService.delete(solutionId)
      toast.success('Solution supprimée avec succès')
      loadSolutions()
    } catch (err) {
      console.error('Erreur lors de la suppression de la solution:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de la solution')
    }
  }

  // Ouvrir le modal de publication dans la KB
  const handleOpenPublishModal = (solution: TicketSolutionDTO) => {
    setSolutionToPublish(solution)
    setPublishFormData({
      title: ticket?.title || '',
      category_id: kbCategories.length > 0 ? kbCategories[0].id : 0,
    })
    setIsPublishSolutionModalOpen(true)
  }

  // Publier une solution dans la KB
  const handlePublishToKB = async () => {
    if (!solutionToPublish || !publishFormData.title.trim() || publishFormData.category_id === 0) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    setIsSubmittingSolution(true)
    try {
      await ticketSolutionService.publishToKB(solutionToPublish.id, {
        title: publishFormData.title,
        category_id: publishFormData.category_id,
      })
      toast.success('Solution publiée dans la base de connaissances avec succès')
      setIsPublishSolutionModalOpen(false)
      setSolutionToPublish(null)
      setPublishFormData({ title: '', category_id: 0 })
    } catch (err) {
      console.error('Erreur lors de la publication:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la publication dans la base de connaissances')
    } finally {
      setIsSubmittingSolution(false)
    }
  }

  // Résolveur = membre IT de la filiale fournisseur (peut renseigner le temps estimé)
  const isResolver = Boolean(userDepartment?.is_it_department && userDepartment.filiale?.is_software_provider)

  // L'utilisateur connecté est-il assigné au ticket ? (pour « Soumettre pour validation »)
  // Comparaison en Number car authUser.id peut être une string (AuthContext) et les IDs ticket sont des numbers
  const currentUserId = authUser?.id != null ? Number(authUser.id) : null
  const isAssignedToTicket = ticket && currentUserId != null
    ? (ticket.assignees?.length
        ? ticket.assignees.some((a) => Number(a.user?.id) === currentUserId)
        : Number(ticket.assigned_to?.id) === currentUserId)
    : false

  // Charger le département de l'utilisateur connecté
  const loadUserDepartment = async () => {
    if (!authUser?.department_id) {
      setUserDepartment(null)
      return
    }
    try {
      const dept = await departmentService.getById(authUser.department_id)
      setUserDepartment(dept)
    } catch (err) {
      console.error('Erreur lors du chargement du département:', err)
      setUserDepartment(null)
    }
  }

  // Convertir minutes → valeur + unité pour les champs temps estimé
  const minutesToEstimateForm = (min: number | null | undefined): { value: number | ''; unit: 'minutes' | 'hours' | 'days' } => {
    if (min == null || min <= 0) return { value: '', unit: 'hours' }
    if (min >= 480 && min % 480 === 0) return { value: min / 480, unit: 'days' }
    if (min >= 60) return { value: Math.round((min / 60) * 10) / 10, unit: 'hours' }
    return { value: min, unit: 'minutes' }
  }
  const estimateFormToMinutes = (value: number | '', unit: 'minutes' | 'hours' | 'days'): number => {
    if (value === '' || Number.isNaN(Number(value)) || Number(value) < 0) return 0
    const v = Number(value)
    if (unit === 'minutes') return Math.round(v)
    if (unit === 'hours') return Math.round(v * 60)
    return Math.round(v * 480) // jours ouvrés
  }

  // Charger la liste des utilisateurs pour l'assignation
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const usersList = await userService.getAll()
      let filteredUsers = usersList.filter(user => user.is_active)
      
      // Si l'utilisateur connecté est dans un département IT de la filiale fournisseur,
      // filtrer pour ne montrer que les utilisateurs du même département
      if (userDepartment?.is_it_department && userDepartment.filiale?.is_software_provider) {
        filteredUsers = filteredUsers.filter(user => 
          user.department_id === userDepartment.id
        )
      }
      
      setUsers(filteredUsers)
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Charger les départements
  const loadDepartments = async () => {
    setLoadingDepartments(true)
    try {
      const data = await departmentService.getAll(true) // Seulement les départements actifs
      const safeData = Array.isArray(data) ? data : []
      setDepartments(safeData)
    } catch (err) {
      console.error('Erreur lors du chargement des départements:', err)
      toast.error('Erreur lors du chargement des départements')
    } finally {
      setLoadingDepartments(false)
    }
  }

  // Ouvrir le modal d'assignation
  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true)
    const initialAssignees = ticket?.assignees?.length
      ? ticket.assignees.map(assignee => assignee.user.id)
      : (ticket?.assigned_to?.id ? [ticket.assigned_to.id] : [])
    setSelectedUserIds(initialAssignees)
    const leadIdFromAssignees = ticket?.assignees?.find(assignee => assignee.is_lead)?.user.id
    setSelectedLeadId(ticket?.lead?.id || leadIdFromAssignees || '')
    // Charger le département de l'utilisateur d'abord, puis les utilisateurs
    await loadUserDepartment()
    await loadUsers()
  }

  // Assigner le ticket
  const handleAssign = async () => {
    if (!ticket) {
      toast.error('Ticket introuvable')
      return
    }

    if (selectedUserIds.length === 0) {
      toast.warning('Veuillez sélectionner au moins un utilisateur')
      return
    }
    if (selectedLeadId && !selectedUserIds.includes(selectedLeadId)) {
      toast.warning('Le lead doit faire partie des assignés')
      return
    }

    setIsAssigning(true)
    try {
      const leadIdToSend = selectedLeadId || undefined
      console.log('Assign payload:', {
        ticket_id: ticket.id,
        user_ids: selectedUserIds,
        lead_id: leadIdToSend,
      })
      const updatedTicket = await ticketService.assign(ticket.id, {
        user_ids: selectedUserIds,
        lead_id: leadIdToSend as number | undefined,
      })
      setTicket(updatedTicket)
      setIsAssignModalOpen(false)
      setSelectedUserIds([])
      setSelectedLeadId('')
      await loadTicketData() // Recharger les données pour avoir l'historique
      toast.success('Ticket assigné. L’assigné le verra dans « Mon panier ».')
    } catch (err) {
      console.error('Erreur lors de l\'assignation:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'assignation du ticket')
    } finally {
      setIsAssigning(false)
    }
  }

  // Ouvrir le modal de changement de statut
  const handleOpenStatusModal = () => {
    if (!ticket) return
    setNewStatus(ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture')
    setIsStatusModalOpen(true)
  }

  // Changer le statut du ticket
  const handleChangeStatus = async () => {
    if (!ticket) return

    setIsChangingStatus(true)
    try {
      const updatedTicket = await ticketService.changeStatus(ticket.id, newStatus)
      toast.success('Statut du ticket modifié avec succès')
      // Recharger les données du ticket
      setTicket(updatedTicket)
      await loadTicketData()
      setIsStatusModalOpen(false)
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut')
    } finally {
      setIsChangingStatus(false)
    }
  }

  // Soumettre le ticket pour validation (passe en « en_attente » et notifie le propriétaire)
  const handleSubmitForValidation = async () => {
    if (!ticket) return

    setIsSubmittingForValidation(true)
    try {
      const updatedTicket = await ticketService.changeStatus(ticket.id, 'en_attente')
      toast.success('Ticket soumis pour validation. Le propriétaire a été notifié.')
      setTicket(updatedTicket)
      await loadTicketData()
    } catch (err) {
      console.error('Erreur lors de la soumission pour validation:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission pour validation')
    } finally {
      setIsSubmittingForValidation(false)
    }
  }

  // Valider un ticket résolu (le ferme automatiquement)
  const handleValidateTicket = async () => {
    if (!ticket) return

    setIsValidating(true)
    try {
      const updatedTicket = await ticketService.validateTicket(ticket.id)
      toast.success('Ticket validé. Il est passé en « Résolu ». Vous pouvez le fermer quand vous le souhaitez.')
      // Recharger les données du ticket
      setTicket(updatedTicket)
      await loadTicketData()
      setIsValidateModalOpen(false)
    } catch (error) {
      console.error('Erreur lors de la validation du ticket:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la validation du ticket')
    } finally {
      setIsValidating(false)
    }
  }

  // Fermer le ticket
  const handleClose = async () => {
    if (!ticket) return

    setIsClosing(true)
    try {
      const updatedTicket = await ticketService.close(ticket.id)
      toast.success('Ticket fermé avec succès')
      // Recharger les données du ticket
      setTicket(updatedTicket)
      await loadTicketData()
      setIsCloseModalOpen(false)
    } catch (err) {
      console.error('Erreur lors de la fermeture:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la fermeture du ticket')
    } finally {
      setIsClosing(false)
    }
  }

  // Invalider un ticket résolu (remet à « Ouvert »)
  const handleInvalidate = async () => {
    if (!ticket) return
    setIsInvalidating(true)
    try {
      const updatedTicket = await ticketService.changeStatus(ticket.id, 'ouvert')
      toast.success('Ticket invalidé. Il est repassé en « Ouvert ».')
      setTicket(updatedTicket)
      await loadTicketData()
    } catch (err) {
      console.error('Erreur lors de l\'invalidation:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'invalidation du ticket')
    } finally {
      setIsInvalidating(false)
    }
  }

  // Rouvrir un ticket (clôturé ou résolu) et le remettre à « Ouvert »
  const handleReopen = async () => {
    if (!ticket) return
    setIsReopening(true)
    try {
      const updatedTicket = await ticketService.changeStatus(ticket.id, 'ouvert')
      toast.success('Ticket rouvert. Il est repassé en « Ouvert ».')
      setTicket(updatedTicket)
      await loadTicketData()
    } catch (err) {
      console.error('Erreur lors de la réouverture:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réouverture du ticket')
    } finally {
      setIsReopening(false)
    }
  }

  // Supprimer le ticket
  const handleDelete = async () => {
    if (!ticket) return

    setIsDeleting(true)
    try {
      await ticketService.delete(ticket.id)
      toast.success('Ticket supprimé avec succès')
      // Rediriger vers la liste des tickets (admin ou employé selon le contexte)
      navigate(`${basePath}/tickets`)
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression du ticket')
      setIsDeleting(false)
    }
  }

  // Ouvrir le modal de modification
  const handleOpenEditModal = async () => {
    console.log('handleOpenEditModal appelé')
    if (!ticket) {
      toast.error('Impossible de modifier le ticket : données non chargées')
      return
    }

    await loadUserDepartment()

    // Charger les utilisateurs et départements si pas encore chargés
    if (users.length === 0) {
      console.log('Chargement des utilisateurs...')
      await loadUsers()
    }
    if (departments.length === 0) {
      console.log('Chargement des départements...')
      await loadDepartments()
    }

    // Trouver l'utilisateur correspondant au requester_id ou au nom du demandeur
    const requesterUser = ticket.requester_id
      ? users.find(u => u.id === ticket.requester_id)
      : users.find(u => {
          const fullName = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username
          return fullName === ticket.requester_name || u.username === ticket.requester_name
        })

    // Trouver le département correspondant au nom du département
    const requesterDept = departments.find(d => d.name === ticket.requester_department || d.code === ticket.requester_department)

    const estimateForm = minutesToEstimateForm(ticket.estimated_time)

    setEditSelectedRequesterId(requesterUser?.id || '')
    setEditSelectedDepartmentId(requesterDept?.id || '')

    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      category: ticket.category || '',
      status: (ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture') || 'ouvert',
      priority: (ticket.priority as 'low' | 'medium' | 'high' | 'critical') || 'low',
      requester_name: ticket.requester_name || '',
      requester_department: ticket.requester_department || '',
      estimated_time_value: estimateForm.value,
      estimated_time_unit: estimateForm.unit,
    })
    setNewImages([])
    setImagesToDelete([])

    loadTicketCategories()
    setIsEditModalOpen(true)

    // Charger les URLs des images existantes pour le modal
    if (attachments.length > 0) {
      attachments.forEach((attachment) => {
        if (attachment.is_image) {
          loadImageUrl(attachment.id, ticket.id, true)
        }
      })
    }
  }

  // Ouvrir le modal d'estimation du temps (résolveurs)
  const handleOpenEstimateModal = async () => {
    if (!ticket) return
    await loadUserDepartment()
    const form = minutesToEstimateForm(ticket.estimated_time)
    setEstimateTimeValue(form.value)
    setEstimateTimeUnit(form.unit)
    setIsEstimateModalOpen(true)
  }

  // Enregistrer le temps estimé (modal dédié)
  const handleSaveEstimate = async () => {
    if (!ticket) return
    const minutes = estimateFormToMinutes(estimateTimeValue, estimateTimeUnit)
    if (minutes < 0) {
      toast.error('Veuillez saisir un temps valide')
      return
    }
    setIsSavingEstimate(true)
    try {
      const hasExisting = ticket.estimated_time != null && ticket.estimated_time > 0
      if (hasExisting) {
        await timesheetService.updateTicketEstimatedTime(ticket.id, minutes)
      } else {
        await timesheetService.setTicketEstimatedTime(ticket.id, minutes)
      }
      toast.success('Temps estimé enregistré')
      setIsEstimateModalOpen(false)
      setEstimateTimeValue('')
      setEstimateTimeUnit('hours')
      await loadTicketData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement du temps estimé')
    } finally {
      setIsSavingEstimate(false)
    }
  }

  // Supprimer une image
  const handleDeleteImage = (attachmentId: number) => {
    setImagesToDelete([...imagesToDelete, attachmentId])
  }

  // Annuler la suppression d'une image
  const handleCancelDeleteImage = (attachmentId: number) => {
    setImagesToDelete(imagesToDelete.filter(id => id !== attachmentId))
  }

  // Modifier le ticket
  const handleUpdate = async () => {
    if (!ticket) return

    setIsUpdating(true)
    try {
      const hasAttachmentChanges = imagesToDelete.length > 0 || newImages.length > 0

      // Supprimer les images marquées pour suppression
      for (const attachmentId of imagesToDelete) {
        try {
          setIsDeletingAttachment(attachmentId)
          await ticketService.deleteAttachment(ticket.id, attachmentId)
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
          await ticketService.uploadAttachment(ticket.id, image)
        } catch (err) {
          console.error('Erreur lors de l\'upload de l\'image:', err)
          toast.error(`Erreur lors de l'upload de l'image ${image.name}`)
        }
      }

      // Préparer les données de mise à jour avec les informations du demandeur et du département sélectionnés
      const updateData: any = {}
      const normalize = (value?: string) => (value ?? '').trim()
      const priorityValue =
        (editFormData.priority || ticket.priority || 'medium') as UpdateTicketRequest['priority']

      if (normalize(editFormData.title) && normalize(editFormData.title) !== normalize(ticket.title)) {
        updateData.title = normalize(editFormData.title)
      }
      if (
        normalize(editFormData.description) &&
        normalize(editFormData.description) !== normalize(ticket.description)
      ) {
        updateData.description = normalize(editFormData.description)
      }
      if (editFormData.category && editFormData.category !== ticket.category) {
        updateData.category = editFormData.category
      }
      if (editFormData.status && editFormData.status !== ticket.status) {
        updateData.status = editFormData.status
      }
      if (priorityValue && priorityValue !== ticket.priority) {
        updateData.priority = priorityValue
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
          if (newRequesterName !== ticket.requester_name) {
            updateData.requester_name = newRequesterName
          }
        }
      } else if (editFormData.requester_name !== ticket.requester_name) {
        // Si aucun requester_id mais le nom a changé manuellement, mettre à jour le nom
        updateData.requester_name = editFormData.requester_name
      }
      
      // Si un département est sélectionné, utiliser son nom
      if (editSelectedDepartmentId) {
        const selectedDept = departments.find(d => d.id === editSelectedDepartmentId)
        if (selectedDept) {
          if (selectedDept.name !== ticket.requester_department) {
            updateData.requester_department = selectedDept.name
          }
        }
      } else if (editFormData.requester_department && editFormData.requester_department !== ticket.requester_department) {
        // Si aucun département sélectionné mais le nom a changé manuellement, mettre à jour
        updateData.requester_department = editFormData.requester_department
      }

      // Temps estimé (résolveurs uniquement)
      if (isResolver) {
        const estimatedMinutes = estimateFormToMinutes(editFormData.estimated_time_value, editFormData.estimated_time_unit)
        const currentMinutes = ticket.estimated_time ?? 0
        if (estimatedMinutes !== currentMinutes) {
          updateData.estimated_time = estimatedMinutes
        }
      }

      // Mettre à jour le ticket
      if (Object.keys(updateData).length === 0 && !hasAttachmentChanges) {
        toast.info('Aucune modification à enregistrer')
        setIsEditModalOpen(false)
        return
      }
      console.log('Données envoyées pour la mise à jour:', JSON.stringify(updateData, null, 2))
      const updatedTicket = Object.keys(updateData).length > 0
        ? await ticketService.update(ticket.id, updateData)
        : ticket
      setTicket((prev) => {
        if (!prev) return updatedTicket
        return {
          ...prev,
          ...updatedTicket,
          assigned_to: updatedTicket.assigned_to ?? prev.assigned_to,
          created_by: updatedTicket.created_by ?? prev.created_by,
          assignees: updatedTicket.assignees ?? prev.assignees,
          lead: updatedTicket.lead ?? prev.lead,
        }
      })
      setIsEditModalOpen(false)
      setNewImages([])
      setImagesToDelete([])
      if (hasAttachmentChanges) {
        await loadTicketData()
      } else {
        const updatedHistory = await ticketService.getHistory(ticket.id)
        setHistory(updatedHistory)
      }
      toast.success('Ticket modifié avec succès')
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification du ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  // Formater la date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A'
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

  // Formater le statut
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

  // Formater la priorité
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

  // Formater le temps
  const formatTime = (totalMinutes?: number): string => {
    if (totalMinutes === null || totalMinutes === undefined) return 'Non renseigné'
    const minutes = Math.max(0, Math.floor(totalMinutes))
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    // Utiliser des jours de travail (8h = 480min) au lieu de jours calendaires (24h)
    const workDayMinutes = 480
    if (minutes < workDayMinutes) {
      return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`
    }
    const days = Math.floor(minutes / workDayMinutes)
    const remainingMinutes = minutes % workDayMinutes
    const remainingHours = Math.floor(remainingMinutes / 60)
    const remainingMins = remainingMinutes % 60
    const parts = [`${days} j`]
    if (remainingHours > 0) {
      parts.push(`${remainingHours} h`)
    }
    if (remainingMins > 0) {
      parts.push(`${remainingMins} min`)
    }
    return parts.join(' ')
  }

  // Traduire les actions de l'historique en français
  const formatHistoryAction = (action?: string, description?: string, fieldName?: string, oldValue?: string, newValue?: string): string => {
    // Si une description est fournie, l'utiliser
    if (description) return description

    // Sinon, traduire l'action
    if (!action) return 'Action inconnue'

    const actionMap: Record<string, string> = {
      'created': 'Ticket créé',
      'assigned': 'Ticket assigné',
      'reassigned': 'Ticket réassigné',
      'status_changed': 'Statut modifié',
      'comment_added': 'Commentaire ajouté',
      'updated': 'Ticket modifié',
      'closed': 'Ticket fermé',
      'reopened': 'Ticket rouvert',
      'priority_changed': 'Priorité modifiée',
      'attachment_added': 'Pièce jointe ajoutée',
      'attachment_removed': 'Pièce jointe supprimée',
      'validated': 'Ticket validé',
    }

    // Traduire les noms de champs
    const fieldMap: Record<string, string> = {
      'assigned_to': 'Assigné à',
      'status': 'Statut',
      'priority': 'Priorité',
      'title': 'Titre',
      'description': 'Description',
    }

    let translatedAction = actionMap[action.toLowerCase()] || action

    // Si c'est une modification de champ, ajouter les détails
    if (fieldName && oldValue && newValue) {
      const translatedField = fieldMap[fieldName] || fieldName
      return `${translatedAction} : ${translatedField} modifié`
    } else if (fieldName === 'assigned_to' && newValue) {
      return `Ticket assigné à ${newValue}`
    }

    return translatedAction
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des détails du ticket...</span>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <Link
          to={`${basePath}/tickets`}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Link>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error || 'Ticket introuvable'}</span>
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cloture':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'resolu':
        return <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      case 'en_cours':
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case 'en_attente':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    }
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

  return (
    <div className="space-y-6">
      <Link
        to={`${basePath}/tickets`}
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* En-tête du ticket */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ticket.code || `#${ticket.id}`}</h1>
                  <span className={`badge ${getStatusBadge(ticket.status)}`}>{formatStatus(ticket.status)}</span>
                  <span className={`badge ${getPriorityBadge(ticket.priority)}`}>{formatPriority(ticket.priority)}</span>
                  <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">{ticket.category}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{ticket.title}</h2>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{ticket.description}</p>
            </div>
          </div>

          {/* Pièces jointes */}
          {attachments.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Paperclip className="w-5 h-5 mr-2" />
                Pièces jointes ({attachments.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attachments.map((attachment) => {
                  const imageUrl = imageUrls[attachment.id]
                  const imageAttachments = attachments.filter((a) => a.is_image)
                  const openCarousel = () => {
                    const idx = imageAttachments.findIndex((a) => a.id === attachment.id)
                    setCarouselIndex(idx >= 0 ? idx : 0)
                    setCarouselOpen(true)
                  }
                  const handleClick = () => {
                    if (attachment.is_image) openCarousel()
                    else handleDownloadAttachment(attachment.id, attachment.file_name)
                  }
                  return (
                    <div
                      key={attachment.id}
                      onClick={handleClick}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      {attachment.is_image ? (
                        imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={attachment.file_name}
                            className="w-full h-24 object-cover rounded mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const icon = target.nextElementSibling as HTMLElement
                              if (icon) icon.style.display = 'block'
                            }}
                          />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center mb-2">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
                          </div>
                        )
                      ) : null}
                      {attachment.is_image && !imageUrl && (
                        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2 hidden" />
                      )}
                      {!attachment.is_image && (
                        <Paperclip className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      )}
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center truncate">{attachment.file_name}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Commentaires */}
          <div className="card">
            {(() => {
              const visibleComments = comments.filter(
                (c) => !c.is_internal || (userDepartment?.is_it_department === true)
              )
              return (
                <>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Commentaires ({visibleComments.length})
            </h3>
            <div className="space-y-4">
              {visibleComments.map((comment) => {
                // Auteur du ticket (pour le style aligné à droite)
                const isAuthor = ticket?.created_by?.id && comment.user.id && 
                  Number(comment.user.id) === Number(ticket.created_by.id)
                // Auteur du commentaire = utilisateur connecté (peut modifier/supprimer)
                const isCommentAuthor = comment.user?.id != null && authUser?.id != null &&
                  Number(comment.user.id) === Number(authUser.id)
                const isEditing = editingCommentId === comment.id

                return (
                  <div
                    key={comment.id}
                    className={`flex ${isAuthor ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-3 shadow-sm ${
                        isAuthor
                          ? comment.is_internal
                            ? 'bg-orange-100/80 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700/50'
                            : 'bg-primary-100/80 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700/50'
                          : comment.is_internal
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className={`flex items-center justify-between gap-2 mb-2 ${isAuthor ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center space-x-2 ${isAuthor ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {comment.user.first_name && comment.user.last_name 
                              ? `${comment.user.first_name} ${comment.user.last_name}`
                              : comment.user.username}
                          </span>
                          {comment.is_internal && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isAuthor
                                ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-800 dark:text-orange-200'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            }`}>
                              Interne
                            </span>
                          )}
                        </div>
                        {isCommentAuthor && !isEditing && (
                          <div className={`flex items-center gap-1 ${isAuthor ? 'flex-row-reverse' : ''}`}>
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(comment)}
                              className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600/50 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentToDelete(comment)}
                              className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="input mb-3 w-full min-h-[80px] text-sm"
                            rows={3}
                            placeholder="Modifier le commentaire..."
                            autoFocus
                          />
                          <div className={`flex items-center gap-2 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                            <button
                              type="button"
                              onClick={handleCancelEditComment}
                              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveComment}
                              disabled={!editCommentText.trim() || isUpdatingComment}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isUpdatingComment ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                                  Enregistrement...
                                </>
                              ) : (
                                'Enregistrer'
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="whitespace-pre-line mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">
                            {comment.comment}
                          </p>
                          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(comment.created_at)}
                            </span>
                            {comment.updated_at && comment.created_at && new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000 && (
                              <>
                                <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  Modifié
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Modifié le {formatDate(comment.updated_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="input mb-3"
                  rows={3}
                  placeholder="Ajouter un commentaire..."
                />
                <div className="flex items-center justify-between">
                  {userDepartment?.is_it_department && (
                    <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span>Commentaire interne (visible uniquement par l'IT)</span>
                    </label>
                  )}
                  {!userDepartment?.is_it_department && <div className="flex-1" />}
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? 'Publication...' : 'Publier'}
                  </button>
                </div>
              </div>
            </div>
                </>
              )
            })()}
          </div>

          {/* Solutions documentées - Affichée uniquement si le ticket est cloturé */}
          {ticket.status === 'cloture' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Solutions documentées ({solutions.length})
                </h3>
                <button
                  onClick={handleOpenSolutionModal}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une solution
                </button>
              </div>
              
              {loadingSolutions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : solutions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune solution documentée pour ce ticket</p>
                  <p className="text-sm mt-1">Documentez la démarche utilisée pour résoudre ce ticket</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solutions.map((solution) => (
                    <div
                      key={solution.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {solution.created_by.first_name && solution.created_by.last_name
                                ? `${solution.created_by.first_name} ${solution.created_by.last_name}`
                                : solution.created_by.username}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(solution.created_at)}
                            </span>
                            {solution.updated_at !== solution.created_at && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                (modifié le {formatDate(solution.updated_at)})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenEditSolutionModal(solution)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPublishModal(solution)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Publier dans la base de connaissances"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Êtes-vous sûr de vouloir supprimer cette solution ?')) {
                                handleDeleteSolution(solution.id)
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        >
                          {solution.solution}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Historique */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Historique</h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun historique disponible</p>
              ) : (
                (() => {
                  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyItemsPerPage))
                  const historyStartIndex = (historyCurrentPage - 1) * historyItemsPerPage
                  const paginatedHistory = history.slice(historyStartIndex, historyStartIndex + historyItemsPerPage)
                  return (
                    <>
                      {paginatedHistory.map((item) => (
                        <div key={item.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 mt-2" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              <span className="font-medium">{formatHistoryAction(item.action, item.description, item.field_name, item.old_value, item.new_value)}</span>
                              {' par '}
                              {item.user.first_name && item.user.last_name
                                ? `${item.user.first_name} ${item.user.last_name}`
                                : item.user.username}
                            </p>
                            {item.field_name && item.old_value && item.new_value && item.field_name !== 'assigned_to' && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {(() => {
                                  const fieldMap: Record<string, string> = {
                                    'assigned_to': 'Assigné à',
                                    'status': 'Statut',
                                    'priority': 'Priorité',
                                    'title': 'Titre',
                                    'description': 'Description',
                                  }
                                  const translatedField = fieldMap[item.field_name] || item.field_name
                                  return (
                                    <>
                                      {translatedField}: <span className="line-through">{item.old_value}</span> → <span className="font-medium">{item.new_value}</span>
                                    </>
                                  )
                                })()}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      ))}
                      <Pagination
                        currentPage={historyCurrentPage}
                        totalPages={historyTotalPages}
                        totalItems={history.length}
                        itemsPerPage={historyItemsPerPage}
                        onPageChange={setHistoryCurrentPage}
                        onItemsPerPageChange={(v) => { setHistoryItemsPerPage(v); setHistoryCurrentPage(1) }}
                        itemsPerPageOptions={[10, 25, 50]}
                      />
                    </>
                  )
                })()
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informations */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Informations</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Statut</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(ticket.status)}
                  <span className="text-gray-900 dark:text-gray-100">{formatStatus(ticket.status)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Priorité</p>
                <span className={`badge ${getPriorityBadge(ticket.priority)}`}>{formatPriority(ticket.priority)}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Catégorie</p>
                <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">{ticket.category}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Source</p>
                <span className="text-gray-900 dark:text-gray-100 capitalize">{ticket.source}</span>
              </div>
              {ticket.filiale && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Filiale</p>
                  <div className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>{ticket.filiale.name}</span>
                    {ticket.filiale.is_software_provider && (
                      <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        Fournisseur IT
                      </span>
                    )}
                  </div>
                </div>
              )}
              {ticket.software && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Logiciel concerné</p>
                  <div className="text-gray-900 dark:text-gray-100">
                    {ticket.software.name}
                    {ticket.software.version ? ` - v${ticket.software.version}` : ''}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(ticket.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dernière mise à jour</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(ticket.updated_at)}</p>
              </div>
              {ticket.closed_at && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fermé le</p>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(ticket.closed_at)}</p>
                </div>
              )}
              {ticket.validated_at && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Validé le</p>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(ticket.validated_at)}</p>
                  {ticket.validated_by && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      par {ticket.validated_by.first_name && ticket.validated_by.last_name
                        ? `${ticket.validated_by.first_name} ${ticket.validated_by.last_name}`
                        : ticket.validated_by.username}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Assignation */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Assignation</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Assigné à</p>
                {ticket.assignees && ticket.assignees.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {ticket.assignees.map((assignee) => (
                      <div key={assignee.user.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                            <span className="text-primary-600 dark:text-primary-400 font-semibold text-xs">
                              {(
                                assignee.user.first_name?.[0] ||
                                assignee.user.last_name?.[0] ||
                                assignee.user.username?.[0] ||
                                '?'
                              ).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {assignee.user.first_name && assignee.user.last_name
                                ? `${assignee.user.first_name} ${assignee.user.last_name}`
                                : assignee.user.username || 'Utilisateur inconnu'}
                            </span>
                            {assignee.user.email && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{assignee.user.email}</p>
                            )}
                          </div>
                        </div>
                        {assignee.is_lead && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            Lead
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : ticket.assigned_to ? (
                  <div className="max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40">
                      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 font-semibold text-xs">
                          {(
                            ticket.assigned_to.first_name?.[0] ||
                            ticket.assigned_to.last_name?.[0] ||
                            ticket.assigned_to.username?.[0] ||
                            '?'
                          ).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {ticket.assigned_to.first_name && ticket.assigned_to.last_name
                            ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                            : ticket.assigned_to.username || 'Utilisateur inconnu'}
                        </span>
                        {ticket.assigned_to.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.assigned_to.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Non assigné</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Créé par (demandeur)</p>
                {ticket.requester && ticket.requester.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {(() => {
                          const user = ticket.requester
                          const initial = user.first_name?.[0] || user.last_name?.[0] || user.username?.[0] || user.email?.[0] || '?'
                          return initial.toUpperCase()
                        })()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {(() => {
                          const user = ticket.requester
                          if (user.first_name && user.last_name) {
                            return `${user.first_name} ${user.last_name}`
                          }
                          if (user.username) {
                            return user.username
                          }
                          if (user.email) {
                            return user.email
                          }
                          return ticket.requester_name || `Utilisateur #${user.id}`
                        })()}
                      </p>
                      {ticket.requester.department && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.requester.department.name} {ticket.requester.department.code ? `(${ticket.requester.department.code})` : ''}
                        </p>
                      )}
                      {!ticket.requester.department && ticket.requester_department && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.requester_department}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {(ticket.requester_name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ticket.requester_name || 'Non renseigné'}
                      </p>
                      {ticket.requester_department && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.requester_department}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Temps */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Temps
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Temps estimé</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{formatTime(ticket.estimated_time)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Temps réel</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{formatTime(ticket.actual_time)}</p>
              </div>
            </div>
          </div>


          {/* Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
            <div className="space-y-2">
              {isResolver && (
                <button
                  onClick={handleOpenEstimateModal}
                  className="w-full btn btn-secondary flex items-center justify-center"
                  type="button"
                  title="Saisir ou modifier le temps estimé pour ce ticket. Le ticket passera automatiquement en « En cours » si il est « Ouvert »."
                >
                  <Timer className="w-4 h-4 mr-2" />
                  Estimer le temps
                </button>
              )}
              {hasPermission('tickets.assign') && (
                <button
                  onClick={handleOpenAssignModal}
                  className="w-full btn btn-secondary flex items-center justify-center"
                  title={ticket.assigned_to ? 'Changer les personnes assignées à ce ticket' : 'Assigner des personnes à ce ticket'}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {ticket.assigned_to ? 'Réassigner' : 'Assigner'}
                </button>
              )}
              {hasPermission('tickets.update') && (
                <button
                  onClick={handleOpenStatusModal}
                  className="w-full btn btn-secondary"
                  disabled={isChangingStatus}
                  title="Changer manuellement le statut du ticket"
                >
                  {isChangingStatus ? 'Changement...' : 'Changer le statut'}
                </button>
              )}
              {/* Soumettre pour validation : uniquement les assignés (IT, filiale fournisseur). Passe le ticket en « En attente ». */}
              {hasPermission('tickets.update') && userDepartment?.is_it_department && userDepartment?.filiale?.is_software_provider && isAssignedToTicket && ticket.status !== 'en_attente' && ticket.status !== 'resolu' && ticket.status !== 'cloture' && (
                <button
                  onClick={handleSubmitForValidation}
                  className="w-full btn btn-primary flex items-center justify-center"
                  disabled={isSubmittingForValidation}
                  title="Passe le ticket en « En attente » et notifie le demandeur pour qu'il valide ou invalide."
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {isSubmittingForValidation ? 'Envoi...' : 'Soumettre pour validation'}
                </button>
              )}
              {/* Valider le ticket : pour les tickets en attente de validation (demandeur valide → statut « Résolu ») */}
              {ticket.status === 'en_attente' && (hasPermission('tickets.validate') || hasPermission('tickets.validate_own')) && (
                <button
                  onClick={() => setIsValidateModalOpen(true)}
                  className="w-full btn btn-success flex items-center justify-center"
                  disabled={isValidating}
                  title="Confirmer que la résolution est correcte. Le ticket passera en « Résolu »."
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isValidating ? 'Validation...' : 'Valider le ticket'}
                </button>
              )}
              {/* Invalider : pour les tickets résolus (demandeur ou IT remet le ticket à « Ouvert ») */}
              {ticket.status === 'resolu' && (hasPermission('tickets.validate') || hasPermission('tickets.validate_own')) && (
                <button
                  onClick={handleInvalidate}
                  className="w-full btn btn-secondary flex items-center justify-center"
                  disabled={isInvalidating}
                  title="La résolution ne convient pas. Le ticket repasse en « Ouvert » pour un nouveau traitement."
                >
                  {isInvalidating ? 'Invalidation...' : 'Invalider'}
                </button>
              )}
              {/* Ouvrir le ticket : pour les tickets clôturés ou résolus, remet à « Ouvert » */}
              {(ticket.status === 'cloture' || ticket.status === 'resolu') && hasPermission('tickets.update') && (
                <button
                  onClick={handleReopen}
                  className="w-full btn btn-secondary flex items-center justify-center"
                  disabled={isReopening}
                  title="Rouvrir le ticket et le remettre en statut « Ouvert »."
                >
                  {isReopening ? 'Réouverture...' : 'Ouvrir le ticket'}
                </button>
              )}
              {/* Fermer le ticket : visible pour tout statut sauf déjà clôturé (passe à « Clôturé ») */}
              {ticket.status !== 'cloture' && hasPermission('tickets.update') && (
                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="w-full btn btn-secondary"
                  disabled={isClosing}
                  title="Clôturer définitivement le ticket (statut « Clôturé »)."
                >
                  {isClosing ? 'Fermeture...' : 'Fermer le ticket'}
                </button>
              )}
              {hasPermission('tickets.delete') && (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full btn btn-danger flex items-center justify-center"
                  title="Supprimer définitivement le ticket"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le ticket
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false)
          setSelectedUserIds([])
          setSelectedLeadId('')
        }}
        title={ticket?.assigned_to ? 'Réassigner le ticket' : 'Assigner le ticket'}
        size="md"
      >
        <div className="space-y-4">
          {userDepartment?.is_it_department && userDepartment.filiale?.is_software_provider && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Note :</span> En tant que membre du département IT, vous ne pouvez assigner que les membres de votre département ({userDepartment.name}).
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Utilisateurs assignés <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Chargement des utilisateurs...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userDepartment?.is_it_department && userDepartment.filiale?.is_software_provider
                    ? 'Aucun autre membre dans votre département IT'
                    : 'Aucun utilisateur disponible'}
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <label className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Aucun lead</span>
                  <input
                    type="radio"
                    name="lead-user"
                    checked={selectedLeadId === ''}
                    onChange={() => setSelectedLeadId('')}
                    className="text-primary-600"
                  />
                </label>
                {users.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id)
                  return (
                    <label
                      key={user.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSelectedUserIds((prev) => {
                              if (checked) return [...prev, user.id]
                              return prev.filter((id) => id !== user.id)
                            })
                            if (!checked && selectedLeadId === user.id) {
                              setSelectedLeadId('')
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name} (${user.username})`
                            : user.username}
                          {user.department && ` - ${user.department.code || user.department.name}`}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="lead-user"
                        checked={selectedLeadId === user.id}
                        onChange={() => {
                          setSelectedLeadId(user.id)
                          if (!selectedUserIds.includes(user.id)) {
                            setSelectedUserIds((prev) => [...prev, user.id])
                          }
                        }}
                        className="text-primary-600"
                      />
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {(ticket?.assignees?.length || ticket?.assigned_to) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <span className="font-medium">Actuellement assignés :</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(ticket.assignees && ticket.assignees.length > 0
                  ? ticket.assignees.map((assignee) => ({
                      id: assignee.user.id,
                      label: assignee.user.first_name && assignee.user.last_name
                        ? `${assignee.user.first_name} ${assignee.user.last_name}`
                        : assignee.user.username,
                      email: assignee.user.email,
                      isLead: assignee.is_lead,
                    }))
                  : ticket.assigned_to
                    ? [{
                        id: ticket.assigned_to.id,
                        label: ticket.assigned_to.first_name && ticket.assigned_to.last_name
                          ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                          : ticket.assigned_to.username,
                        email: ticket.assigned_to.email,
                        isLead: false,
                      }]
                    : []
                ).map((assignee) => (
                  <span
                    key={assignee.id}
                    className="inline-flex flex-col items-start px-2 py-1 rounded-lg text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200"
                  >
                    <span>{assignee.label}</span>
                    {assignee.email && <span className="text-gray-500 dark:text-gray-400 font-normal">{assignee.email}</span>}
                    {assignee.isLead && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white">Lead</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false)
                setSelectedUserIds([])
                setSelectedLeadId('')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={isAssigning || selectedUserIds.length === 0 || loadingUsers}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Assignation...
                </>
              ) : (
                'Assigner'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de modification */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          console.log('Fermeture du modal de modification')
          setIsEditModalOpen(false)
          setEditSelectedRequesterId('')
          setEditSelectedDepartmentId('')
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
            {loadingTicketCategories ? (
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Chargement des catégories...
              </div>
            ) : (
              <select
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                {ticket?.category && !ticketCategories.some((c) => c.slug === ticket.category) && (
                  <option value={ticket.category}>{ticket.category} (inactive)</option>
                )}
                {ticketCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
                {ticketCategories.length === 0 && !ticket?.category && (
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
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name} (${user.username})`
                        : user.username}
                      {user.department && ` - ${user.department.code || user.department.name}`}
                    </option>
                  ))}
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
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Temps estimé (résolveurs uniquement) */}
          {isResolver && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temps estimé
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={editFormData.estimated_time_unit === 'minutes' ? 1 : 0.5}
                    value={editFormData.estimated_time_value === '' ? '' : editFormData.estimated_time_value}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        estimated_time_value: e.target.value === '' ? '' : parseFloat(e.target.value) || '',
                      })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="—"
                  />
                  <select
                    value={editFormData.estimated_time_unit}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, estimated_time_unit: e.target.value as 'minutes' | 'hours' | 'days' })
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 w-28"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Heures</option>
                    <option value="days">Jours</option>
                  </select>
                </div>
                {editFormData.estimated_time_value !== '' && editFormData.estimated_time_value > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    = {formatTime(estimateFormToMinutes(editFormData.estimated_time_value, editFormData.estimated_time_unit))}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gestion des images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Images existantes
            </label>
            {attachments.filter(a => a.is_image && !imagesToDelete.includes(a.id)).length > 0 ? (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {attachments
                  .filter(a => a.is_image && !imagesToDelete.includes(a.id))
                  .map((attachment) => {
                    const imageUrl = imageUrls[attachment.id]
                    const imageList = attachments.filter((a) => a.is_image)
                    const idx = imageList.findIndex((a) => a.id === attachment.id)
                    const openCarouselHere = () => {
                      setCarouselIndex(idx >= 0 ? idx : 0)
                      setCarouselOpen(true)
                    }
                    return (
                      <div key={attachment.id} className="relative group">
                        <div
                          className="cursor-pointer"
                          onClick={openCarouselHere}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && openCarouselHere()}
                          aria-label="Agrandir l'image"
                        >
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
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(attachment.id) }}
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
                    const attachment = attachments.find(a => a.id === attachmentId)
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
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              disabled={isUpdating}
            >
              Annuler
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editFormData.title.trim() || !editFormData.description.trim()}
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

      {/* Modal Estimer le temps (résolveurs) */}
      <Modal
        isOpen={isEstimateModalOpen}
        onClose={() => {
          setIsEstimateModalOpen(false)
          setEstimateTimeValue('')
          setEstimateTimeUnit('hours')
        }}
        title="Estimer le temps"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Saisissez le temps estimé pour traiter ce ticket.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temps estimé
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={estimateTimeUnit === 'minutes' ? 1 : 0.5}
                value={estimateTimeValue === '' ? '' : estimateTimeValue}
                onChange={(e) =>
                  setEstimateTimeValue(e.target.value === '' ? '' : parseFloat(e.target.value) || '')
                }
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="—"
              />
              <select
                value={estimateTimeUnit}
                onChange={(e) => setEstimateTimeUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 w-28"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Heures</option>
                <option value="days">Jours</option>
              </select>
            </div>
            {estimateTimeValue !== '' && estimateTimeValue > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                = {formatTime(estimateFormToMinutes(estimateTimeValue, estimateTimeUnit))}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEstimateModalOpen(false)
                setEstimateTimeValue('')
                setEstimateTimeUnit('hours')
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              disabled={isSavingEstimate}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveEstimate}
              disabled={isSavingEstimate || (estimateTimeValue === '' || Number(estimateTimeValue) < 0)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSavingEstimate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de création de solution */}
      <Modal
        isOpen={isSolutionModalOpen}
        onClose={() => {
          setIsSolutionModalOpen(false)
          setSolutionFormData({ solution: '' })
        }}
        title="Documenter la solution"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateSolution()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solution <span className="text-red-500">*</span>
            </label>
            <MarkdownEditor
              value={solutionFormData.solution}
              onChange={(value) => setSolutionFormData({ solution: value })}
              height={400}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Documentez la démarche ou la méthode utilisée pour résoudre ce ticket. Vous pourrez ensuite publier cette solution dans la base de connaissances.
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsSolutionModalOpen(false)
                setSolutionFormData({ solution: '' })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!solutionFormData.solution.trim() || isSubmittingSolution}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingSolution ? 'Enregistrement...' : 'Enregistrer la solution'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition de solution */}
      <Modal
        isOpen={isEditSolutionModalOpen}
        onClose={() => {
          setIsEditSolutionModalOpen(false)
          setSolutionToEdit(null)
          setEditSolutionFormData({ solution: '' })
        }}
        title="Modifier la solution"
        size="lg"
      >
        {solutionToEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateSolution()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Solution <span className="text-red-500">*</span>
              </label>
              <MarkdownEditor
                value={editSolutionFormData.solution}
                onChange={(value) => setEditSolutionFormData({ solution: value })}
                height={400}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditSolutionModalOpen(false)
                  setSolutionToEdit(null)
                  setEditSolutionFormData({ solution: '' })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!editSolutionFormData.solution.trim() || isSubmittingSolution}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSolution ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de publication dans la base de connaissances */}
      <Modal
        isOpen={isPublishSolutionModalOpen}
        onClose={() => {
          setIsPublishSolutionModalOpen(false)
          setSolutionToPublish(null)
          setPublishFormData({ title: '', category_id: 0 })
        }}
        title="Publier dans la base de connaissances"
        size="lg"
      >
        {solutionToPublish && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handlePublishToKB()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre de l'article <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={publishFormData.title}
                onChange={(e) => setPublishFormData({ ...publishFormData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Ex: Résolution du problème d'extraction des données"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                value={publishFormData.category_id}
                onChange={(e) => setPublishFormData({ ...publishFormData, category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                required
              >
                <option value={0}>Sélectionner une catégorie</option>
                {kbCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note :</strong> Cette solution sera publiée directement dans la base de connaissances et sera accessible à tous les membres de l'entreprise.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsPublishSolutionModalOpen(false)
                  setSolutionToPublish(null)
                  setPublishFormData({ title: '', category_id: 0 })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!publishFormData.title.trim() || publishFormData.category_id === 0 || isSubmittingSolution}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSolution ? 'Publication...' : 'Publier dans la KB'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de changement de statut */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false)
          if (ticket) {
            setNewStatus(ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture')
          }
        }}
        title="Changer le statut du ticket"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleChangeStatus()
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nouveau statut
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'ouvert' | 'en_cours' | 'en_attente' | 'cloture')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value="ouvert">Ouvert</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente</option>
              <option value="resolu">Résolu</option>
              <option value="cloture">Clôturé</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsStatusModalOpen(false)
                if (ticket) {
                  setNewStatus(ticket.status as 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture')
                }
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isChangingStatus || newStatus === ticket?.status}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingStatus ? 'Changement...' : 'Changer le statut'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmation de fermeture */}
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false)
        }}
        onConfirm={handleClose}
        title="Fermer le ticket"
        message={
          ticket
            ? `Êtes-vous sûr de vouloir fermer le ticket "${ticket.code || ticket.title}" ?`
            : 'Êtes-vous sûr de vouloir fermer ce ticket ?'
        }
        confirmText="Fermer"
        cancelText="Annuler"
        isLoading={isClosing}
      />

      {/* Modal de confirmation de validation */}
      <ConfirmModal
        isOpen={isValidateModalOpen}
        onClose={() => setIsValidateModalOpen(false)}
        onConfirm={handleValidateTicket}
        title="Valider le ticket"
        message={
          ticket
            ? `Êtes-vous sûr de vouloir valider le ticket "${ticket.code || ticket.title}" ? Le ticket sera automatiquement fermé après validation.`
            : 'Êtes-vous sûr de vouloir valider ce ticket ? Le ticket sera automatiquement fermé après validation.'
        }
        confirmText="Valider"
        cancelText="Annuler"
        isLoading={isValidating}
      />

      {/* Modal de confirmation de suppression d'un commentaire */}
      <ConfirmModal
        isOpen={commentToDelete != null}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleConfirmDeleteComment}
        title="Supprimer le commentaire"
        message="Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeletingComment}
      />

      {/* Modal de confirmation de suppression du ticket */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
        }}
        onConfirm={handleDelete}
        title="Supprimer le ticket"
        message={
          ticket
            ? `Êtes-vous sûr de vouloir supprimer le ticket "${ticket.code || ticket.title}" ? Cette action est irréversible.`
            : 'Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.'
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeleting}
      />

      {/* Carousel / lightbox des images (popup au clic sur une image) */}
      {carouselOpen && ticket && (
        <ImageCarousel
          images={attachments
            .filter((a) => a.is_image)
            .map((a) => ({
              id: a.id,
              url: imageUrls[a.id] ?? null,
              fileName: a.file_name,
            }))}
          currentIndex={Math.min(carouselIndex, attachments.filter((a) => a.is_image).length - 1)}
          onClose={() => setCarouselOpen(false)}
          onIndexChange={setCarouselIndex}
        />
      )}
    </div>
  )
}

export default TicketDetails
