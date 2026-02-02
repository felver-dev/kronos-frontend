import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Calendar, User, Briefcase, Building2, Tag, Clock, UserCheck, CheckCircle, UserPlus, RefreshCw, XCircle, Trash2, Timer, Edit2, Check } from 'lucide-react'
import { ticketInternalService, TicketInternalDTO } from '../../services/ticketInternalService'
import { userService, UserDTO } from '../../services/userService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'

const STATUS_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente: 'En attente',
  resolu: 'Résolu',
  cloture: 'Clôturé',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

const CATEGORY_LABELS: Record<string, string> = {
  tache_interne: 'Tâche interne',
  demande_interne: 'Demande interne',
  suivi_projet: 'Suivi projet',
}

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    en_attente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    resolu: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
    cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  }
  return map[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return date
  }
}

const userName = (u?: { first_name?: string; last_name?: string; username?: string }) => {
  if (!u) return '—'
  if (u.first_name || u.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
  return u.username || '—'
}

const formatMinutes = (minutes: number | undefined | null): string => {
  if (minutes == null || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

type StatusType = 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture'

const TicketInternalDetails = () => {
  const { id } = useParams<{ id: string }>()
  const toast = useToastContext()
  const { hasPermission, user: authUser } = useAuth()
  const [ticket, setTicket] = useState<TicketInternalDTO | null>(null)
  const [loading, setLoading] = useState(true)

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<number | ''>('')
  const [newStatus, setNewStatus] = useState<StatusType>('ouvert')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingEstimated, setEditingEstimated] = useState(false)
  const [editingActual, setEditingActual] = useState(false)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState<number | ''>('')
  const [editActualMinutes, setEditActualMinutes] = useState<number | ''>('')
  const [isSavingEstimated, setIsSavingEstimated] = useState(false)
  const [isSavingActual, setIsSavingActual] = useState(false)

  const canView =
    hasPermission('tickets_internes.view_own') ||
    hasPermission('tickets_internes.view_department') ||
    hasPermission('tickets_internes.view_filiale') ||
    hasPermission('tickets_internes.view_all')
  const canAssign = hasPermission('tickets_internes.assign')
  // Admin système (view_all) peut assigner à n'importe qui ; les autres uniquement à un membre de leur département
  const canAssignToAnyone = hasPermission('tickets_internes.view_all')
  const canUpdate = hasPermission('tickets_internes.update')
  const canValidate = hasPermission('tickets_internes.validate')
  const canClose = hasPermission('tickets_internes.close')
  const canDelete = hasPermission('tickets_internes.delete')
  // Temps estimé / temps passé : l'assigné ou quelqu'un avec update (ex. chef) peut modifier
  const isAssignee = ticket ? authUser?.id === ticket.assigned_to_id : false
  const canEditTime = canUpdate || isAssignee

  const loadTicket = useCallback(async () => {
    if (!id) return
    try {
      const t = await ticketInternalService.getById(Number(id))
      setTicket(t)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ticket interne introuvable')
      setTicket(null)
    }
  }, [id, toast])

  useEffect(() => {
    if (!id || !canView) return
    const load = async () => {
      setLoading(true)
      try {
        const t = await ticketInternalService.getById(Number(id))
        setTicket(t)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ticket interne introuvable')
        setTicket(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, canView, toast])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const list = await userService.getAll()
      const all = Array.isArray(list) ? list.filter((u) => u.is_active !== false) : []
      if (canAssignToAnyone) {
        setUsers(all)
      } else if (authUser?.department_id) {
        setUsers(all.filter((u) => u.department_id === authUser.department_id))
      } else {
        setUsers([])
      }
    } catch {
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAssign = async () => {
    if (!ticket || selectedAssignUserId === '') return
    setIsAssigning(true)
    try {
      await ticketInternalService.assign(ticket.id, { assigned_to_id: selectedAssignUserId })
      toast.success('Ticket assigné.')
      setIsAssignModalOpen(false)
      setSelectedAssignUserId('')
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'assignation')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleChangeStatus = async () => {
    if (!ticket) return
    setIsChangingStatus(true)
    try {
      await ticketInternalService.changeStatus(ticket.id, newStatus)
      toast.success('Statut mis à jour.')
      setIsStatusModalOpen(false)
      setNewStatus(ticket.status as StatusType)
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du changement de statut')
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleValidate = async () => {
    if (!ticket) return
    setIsValidating(true)
    try {
      await ticketInternalService.validate(ticket.id)
      toast.success('Ticket validé.')
      setIsValidateModalOpen(false)
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la validation')
    } finally {
      setIsValidating(false)
    }
  }

  const handleClose = async () => {
    if (!ticket) return
    setIsClosing(true)
    try {
      await ticketInternalService.close(ticket.id)
      toast.success('Ticket clôturé.')
      setIsCloseModalOpen(false)
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la clôture')
    } finally {
      setIsClosing(false)
    }
  }

  const handleDelete = async () => {
    if (!ticket) return
    setIsDeleting(true)
    try {
      await ticketInternalService.delete(ticket.id)
      toast.success('Ticket supprimé.')
      setIsDeleteModalOpen(false)
      setTicket(null)
      window.location.href = '/app/tickets?tab=internes'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  const openAssignModal = () => {
    setSelectedAssignUserId(ticket?.assigned_to_id ?? '')
    loadUsers()
    setIsAssignModalOpen(true)
  }

  const openStatusModal = () => {
    setNewStatus((ticket?.status as StatusType) ?? 'ouvert')
    setIsStatusModalOpen(true)
  }

  const handleSaveEstimated = async () => {
    if (!ticket || editEstimatedMinutes === '') return
    const minutes = Number(editEstimatedMinutes)
    if (minutes < 0) return
    setIsSavingEstimated(true)
    try {
      await ticketInternalService.update(ticket.id, { estimated_time: minutes })
      toast.success('Temps estimé enregistré.')
      setEditingEstimated(false)
      setEditEstimatedMinutes('')
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setIsSavingEstimated(false)
    }
  }

  const handleCancelEstimated = () => {
    setEditingEstimated(false)
    setEditEstimatedMinutes('')
  }

  const handleSaveActual = async () => {
    if (!ticket || editActualMinutes === '') return
    const minutes = Number(editActualMinutes)
    if (minutes < 0) return
    setIsSavingActual(true)
    try {
      await ticketInternalService.update(ticket.id, { actual_time: minutes })
      toast.success('Temps passé enregistré.')
      setEditingActual(false)
      setEditActualMinutes('')
      await loadTicket()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setIsSavingActual(false)
    }
  }

  const handleCancelActual = () => {
    setEditingActual(false)
    setEditActualMinutes('')
  }

  const startEditEstimated = () => {
    setEditEstimatedMinutes(ticket?.estimated_time ?? '')
    setEditingEstimated(true)
  }

  const startEditActual = () => {
    setEditActualMinutes(ticket?.actual_time ?? '')
    setEditingActual(true)
  }

  if (!canView) return <AccessDenied message="Vous n'avez pas la permission de voir ce ticket interne." />
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Ticket interne introuvable.
        <Link to="/app/tickets?tab=internes" className="ml-2 text-primary-600 dark:text-primary-400 hover:underline">Retour à la liste</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link
          to="/app/tickets?tab=internes"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 inline-flex items-center justify-center shrink-0"
          title="Retour à la liste"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-sm font-medium text-gray-500 dark:text-gray-400">{ticket.code}</span>
            <span className={`badge ${getStatusBadge(ticket.status)}`}>{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">·</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</span>
            {ticket.category && (
              <>
                <span className="text-sm text-gray-400 dark:text-gray-500">·</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ticket.title}</h1>
        </div>
        {/* Barre d'actions */}
        {(canAssign || canUpdate || canValidate || canClose || canDelete) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
            {canAssign && (
              <button
                type="button"
                onClick={openAssignModal}
                className="btn btn-secondary inline-flex items-center text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assigner
              </button>
            )}
            {canUpdate && (
              <button
                type="button"
                onClick={openStatusModal}
                className="btn btn-secondary inline-flex items-center text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Changer le statut
              </button>
            )}
            {canValidate && ticket.status === 'resolu' && !ticket.validated_by && (
              <button
                type="button"
                onClick={() => setIsValidateModalOpen(true)}
                className="btn btn-primary inline-flex items-center text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider
              </button>
            )}
            {canClose && ticket.status !== 'cloture' && (
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(true)}
                className="btn btn-secondary inline-flex items-center text-sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clôturer
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn btn-danger inline-flex items-center text-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Description
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{ticket.description || '—'}</p>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Priorité</span>
                <span>{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</span>
              </div>
              {ticket.estimated_time != null && ticket.estimated_time > 0 && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Estimé: {formatMinutes(ticket.estimated_time)}</span>
                </div>
              )}
              {ticket.actual_time != null && ticket.actual_time > 0 && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Temps passé: {formatMinutes(ticket.actual_time)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Mis à jour le {formatDate(ticket.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Gestion du temps : temps estimé et temps passé (saisis sur la page détails par l'assigné ou son chef) */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Gestion du temps
            </h2>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">Temps estimé</span>
                {!editingEstimated ? (
                  <>
                    <span className="text-gray-900 dark:text-gray-100">{formatMinutes(ticket.estimated_time ?? undefined)}</span>
                    {canEditTime && (
                      <button
                        type="button"
                        onClick={startEditEstimated}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={editEstimatedMinutes}
                      onChange={(e) => setEditEstimatedMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                      className="input w-24"
                      placeholder="min"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
                    <button type="button" onClick={handleSaveEstimated} disabled={isSavingEstimated} className="btn btn-primary inline-flex items-center gap-1 text-sm">
                      {isSavingEstimated ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {isSavingEstimated ? '...' : 'Enregistrer'}
                    </button>
                    <button type="button" onClick={handleCancelEstimated} className="btn btn-secondary text-sm">
                      Annuler
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">Temps passé</span>
                {!editingActual ? (
                  <>
                    <span className="text-gray-900 dark:text-gray-100">{formatMinutes(ticket.actual_time ?? undefined)}</span>
                    {canEditTime && (
                      <button
                        type="button"
                        onClick={startEditActual}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={editActualMinutes}
                      onChange={(e) => setEditActualMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                      className="input w-24"
                      placeholder="min"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
                    <button type="button" onClick={handleSaveActual} disabled={isSavingActual} className="btn btn-primary inline-flex items-center gap-1 text-sm">
                      {isSavingActual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {isSavingActual ? '...' : 'Enregistrer'}
                    </button>
                    <button type="button" onClick={handleCancelActual} className="btn btn-secondary text-sm">
                      Annuler
                    </button>
                  </div>
                )}
              </div>
              {canEditTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  L'assigné ou un utilisateur avec droit de modification peut saisir le temps estimé et le temps passé.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Créé par
            </h3>
            <p className="text-gray-900 dark:text-gray-100 font-medium">{userName(ticket.created_by)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {formatDate(ticket.created_at)}
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Département
            </h3>
            <p className="text-gray-900 dark:text-gray-100">{ticket.department?.name ?? ticket.department_id ?? '—'}</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Filiale
            </h3>
            <p className="text-gray-900 dark:text-gray-100">{ticket.filiale?.name ?? ticket.filiale_id ?? '—'}</p>
          </div>

          {ticket.assigned_to && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Assigné à
              </h3>
              <p className="text-gray-900 dark:text-gray-100">{userName(ticket.assigned_to)}</p>
            </div>
          )}

          {(ticket.status === 'resolu' || ticket.status === 'cloture') && ticket.validated_by && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                Validé par
              </h3>
              <p className="text-gray-900 dark:text-gray-100">{userName(ticket.validated_by)}</p>
              {ticket.validated_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {formatDate(ticket.validated_at)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Assigner */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assigner le ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigner à</label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              <select
                value={selectedAssignUserId}
                onChange={(e) => setSelectedAssignUserId(e.target.value ? Number(e.target.value) : '')}
                className="input w-full"
              >
                <option value="">— Non assigné —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="button" onClick={handleAssign} disabled={isAssigning} className="btn btn-primary inline-flex items-center gap-2">
              {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isAssigning ? 'En cours...' : 'Assigner'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Changer le statut */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Changer le statut">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nouveau statut</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as StatusType)}
              className="input w-full"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsStatusModalOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="button" onClick={handleChangeStatus} disabled={isChangingStatus} className="btn btn-primary inline-flex items-center gap-2">
              {isChangingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isChangingStatus ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Valider */}
      <ConfirmModal
        isOpen={isValidateModalOpen}
        onClose={() => setIsValidateModalOpen(false)}
        onConfirm={handleValidate}
        title="Valider le ticket"
        message="Confirmer la validation de ce ticket interne ?"
        confirmText="Valider"
        cancelText="Annuler"
        confirmButtonClass="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
        isLoading={isValidating}
      />

      {/* Modal Clôturer */}
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleClose}
        title="Clôturer le ticket"
        message="Confirmer la clôture de ce ticket interne ?"
        confirmText="Clôturer"
        cancelText="Annuler"
        confirmButtonClass="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
        isLoading={isClosing}
      />

      {/* Modal Supprimer */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le ticket"
        message="Êtes-vous sûr de vouloir supprimer ce ticket interne ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default TicketInternalDetails
