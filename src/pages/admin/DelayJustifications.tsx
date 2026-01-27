import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle, Loader2, AlertCircle, MessageSquare, Clock, User, TrendingUp, Link as LinkIcon, Plus, Edit, FileText } from 'lucide-react'
import { delayService, DelayJustificationDTO, DelayDTO } from '../../services/delayService'
import { useToastContext } from '../../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { userService, UserDTO } from '../../services/userService'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'

const DelayJustifications = () => {
  const toast = useToastContext()
  const { user, hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [delays, setDelays] = useState<DelayDTO[]>([])
  const [myDelays, setMyDelays] = useState<DelayDTO[]>([])
  const [justifications, setJustifications] = useState<DelayJustificationDTO[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'unjustified' | 'pending' | 'justified' | 'rejected'>('all')
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<'validate' | 'reject' | null>(null)
  const [viewMode, setViewMode] = useState<'delays' | 'justifications' | 'my-delays'>('delays')
  const [showJustifyForm, setShowJustifyForm] = useState(false)
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null)
  const [justification, setJustification] = useState('')

  const hasViewAll = hasPermission('delays.view_all')
  const hasViewDepartment = hasPermission('delays.view_department')
  const hasViewOwn = hasPermission('delays.view_own')
  const showUserFilter = hasViewDepartment || hasViewAll
  const onlyViewOwn = hasViewOwn && !hasViewDepartment && !hasViewAll
  const filterLabel = hasViewAll ? 'Utilisateur' : 'Membre du département'
  const departmentMembers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.department_id != null && user?.department_id != null && u.department_id === user.department_id
      ),
    [users, user?.department_id]
  )
  const filterUserOptions = hasViewAll ? users : departmentMembers

  const loadDelays = async () => {
    try {
      const params =
        showUserFilter && filterUserId !== 'all'
          ? { user_id: parseInt(filterUserId, 10) }
          : undefined
      const data = await delayService.getAll(params)
      setDelays(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des retards:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des retards')
      setDelays([])
    }
  }

  const loadJustifications = async () => {
    try {
      const data = await delayService.getJustificationsHistory()
      setJustifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des justifications:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des justifications')
      setJustifications([])
    }
  }

  const loadMyDelays = async () => {
    if (!user?.id) return
    try {
      const userId = Number(user.id)
      const data = await delayService.getByUserId(userId)
      setMyDelays(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement de mes retards:', error)
      setMyDelays([])
    }
  }

  const loadUsers = async () => {
    try {
      const data = await userService.getAll()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      setUsers([])
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadDelays(), loadJustifications(), loadUsers(), loadMyDelays()]).finally(() => {
      setLoading(false)
    })
  }, [user?.id, filterUserId])

  const filteredDelays = useMemo(() => {
    let filtered = delays
    if (filterStatus !== 'all') {
      filtered = filtered.filter((d) => d.status === filterStatus)
    }
    return filtered
  }, [filterStatus, delays])

  const filteredJustifications = useMemo(() => {
    let filtered = justifications
    if (onlyViewOwn && user?.id) {
      filtered = filtered.filter((j) => j.user_id === Number(user.id))
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter((j) => j.status === 'pending')
      } else if (filterStatus === 'justified') {
        filtered = filtered.filter((j) => j.status === 'validated')
      } else if (filterStatus === 'rejected') {
        filtered = filtered.filter((j) => j.status === 'rejected')
      }
    }
    if (filterUserId !== 'all') {
      const userId = parseInt(filterUserId, 10)
      filtered = filtered.filter((j) => j.user_id === userId)
    }
    return filtered
  }, [filterStatus, filterUserId, justifications, onlyViewOwn, user?.id])

  const stats = useMemo(() => {
    return {
      total: delays.length,
      unjustified: delays.filter((d) => d.status === 'unjustified').length,
      pending: delays.filter((d) => d.status === 'pending').length,
      justified: delays.filter((d) => d.status === 'justified').length,
      rejected: delays.filter((d) => d.status === 'rejected').length,
      totalDelayTime: delays.reduce((acc, d) => acc + d.delay_time, 0),
    }
  }, [delays])

  const formatTime = (totalMinutes: number) => {
    const minutes = Math.max(0, Math.floor(totalMinutes))
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours < 24) {
      return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    const parts = [`${days} j`]
    if (remainingHours > 0) {
      parts.push(`${remainingHours} h`)
    }
    if (mins > 0) {
      parts.push(`${mins} min`)
    }
    return parts.join(' ')
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      unjustified: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      justified: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      rejected: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      validated: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      unjustified: 'Non justifié',
      pending: 'En attente de validation',
      justified: 'Justifié validé',
      rejected: 'Justification rejetée',
      validated: 'Validée',
    }
    return labels[status as keyof typeof labels] || status
  }

  const openActionModal = (id: number, action: 'validate' | 'reject') => {
    setSelectedId(id)
    setPendingAction(action)
    setComment('')
    setShowCommentModal(true)
  }

  const submitAction = async () => {
    if (!selectedId || !pendingAction) return
    setActionLoading(selectedId)
    try {
      await delayService.validateJustification(selectedId, {
        validated: pendingAction === 'validate',
        comment: comment.trim() || undefined,
      })
      toast.success(pendingAction === 'validate' ? 'Justification validée' : 'Justification rejetée')
      setShowCommentModal(false)
      setSelectedId(null)
      setPendingAction(null)
      setComment('')
      await Promise.all([loadDelays(), loadJustifications()])
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la validation')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return date
    }
  }

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
    }
    return `#${userId}`
  }

  const handleJustify = (delayId: number) => {
    setSelectedDelay(delayId)
    const delay = myDelays.find((d) => d.id === delayId)
    if (delay?.justification) {
      setJustification(delay.justification.justification)
    } else {
      setJustification('')
    }
    setShowJustifyForm(true)
  }

  const handleSubmitJustification = async () => {
    if (!justification.trim() || !selectedDelay) return
    try {
      const existing = myDelays.find((d) => d.id === selectedDelay)?.justification
      if (existing && existing.status === 'pending') {
        await delayService.updateJustification(selectedDelay, justification.trim())
      } else {
        await delayService.createJustification(selectedDelay, justification.trim())
      }
      setShowJustifyForm(false)
      setJustification('')
      setSelectedDelay(null)
      await Promise.all([loadMyDelays(), loadDelays(), loadJustifications()])
      toast.success('Justification enregistrée')
    } catch (err) {
      console.error('Erreur lors de la justification:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la justification')
    }
  }

  const filteredMyDelays = useMemo(() => {
    let filtered = myDelays
    if (filterStatus !== 'all') {
      filtered = filtered.filter((d) => d.status === filterStatus)
    }
    return filtered
  }, [filterStatus, myDelays])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Justification des retards</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez les retards et validez les justifications des techniciens
          </p>
        </div>
        {myDelays.length > 0 && !onlyViewOwn && (
          <button
            onClick={() => setViewMode('my-delays')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/20 transition-colors"
          >
            Mes retards ({myDelays.filter((d) => d.status === 'unjustified' || d.status === 'pending').length})
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total retards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Non justifiés</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.unjustified}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">En attente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Justifiés validés</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.justified}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Temps de retard total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(stats.totalDelayTime)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Mode d'affichage et filtres */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vue</label>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('delays')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'delays'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Retards
              </button>
              <button
                onClick={() => setViewMode('justifications')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'justifications'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Justifications
              </button>
              {myDelays.length > 0 && !onlyViewOwn && (
                <button
                  onClick={() => setViewMode('my-delays')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'my-delays'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Mes retards
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut </label>
            <select
              className="input max-w-xs h-[38px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <option value="all">Tous</option>
              <option value="unjustified">Non justifiés</option>
              <option value="pending">En attente</option>
              <option value="justified">Justifiés validés</option>
              <option value="rejected">Rejetés</option>
            </select>
          </div>
          {showUserFilter && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{filterLabel}</label>
              <select
                className="input max-w-xs h-[38px]"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
              >
                <option value="all">Tous</option>
                {filterUserOptions.map((u) => (
                  <option key={u.id} value={u.id.toString()}>
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement...
        </div>
      ) : viewMode === 'my-delays' ? (
        filteredMyDelays.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Aucun retard à justifier</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMyDelays.map((delay) => (
              <div key={delay.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        to={`/app/tickets/${delay.ticket_id}`}
                        className="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {delay.ticket?.code || `#${delay.ticket_id}`} - {delay.ticket?.title || 'Ticket'}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${getStatusBadge(delay.status)}`}>
                          {getStatusLabel(delay.status)}
                        </span>
                        {(delay.justification?.status === 'pending' ||
                          !delay.justification ||
                          delay.justification.status === 'rejected' ||
                          delay.status === 'unjustified') && (
                          <button
                            onClick={() => handleJustify(delay.id)}
                            className="btn btn-primary flex items-center"
                          >
                            {delay.justification?.status === 'pending' ? (
                              <>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Justifier
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temps estimé</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatTime(delay.estimated_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temps réel</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatTime(delay.actual_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Retard</p>
                        <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                          +{formatTime(delay.delay_time)} ({delay.delay_percentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {delay.justification && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Justification</h4>
                          {delay.justification.status === 'pending' && (
                            <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                              En attente
                            </span>
                          )}
                          {delay.justification.status === 'validated' && (
                            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              Validée
                            </span>
                          )}
                          {delay.justification.status === 'rejected' && (
                            <span className="badge bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                              Rejetée
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{delay.justification.justification}</p>
                        {delay.justification.validated_at && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Validé le {formatDate(delay.justification.validated_at)}
                              </span>
                            </div>
                            {delay.justification.validation_comment && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                "{delay.justification.validation_comment}"
                              </p>
                            )}
                          </div>
                        )}
                        {delay.justification.status === 'pending' && (
                          <button
                            onClick={() => handleJustify(delay.id)}
                            className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier la justification
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : viewMode === 'delays' ? (
        filteredDelays.length === 0 ? (
          <div className="card text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Aucun retard à afficher</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDelays.map((delay) => (
              <div key={delay.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/app/tickets/${delay.ticket_id}`}
                          className="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {delay.ticket?.code || `#${delay.ticket_id}`} - {delay.ticket?.title || 'Ticket'}
                        </Link>
                        <span className={`badge ${getStatusBadge(delay.status)}`}>
                          {getStatusLabel(delay.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Technicien
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {getUserName(delay.user_id)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Temps estimé
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatTime(delay.estimated_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temps réel</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatTime(delay.actual_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Retard</p>
                        <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                          +{formatTime(delay.delay_time)} ({delay.delay_percentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {delay.justification && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Justification</h4>
                          <span className={`badge ${getStatusBadge(delay.justification.status)}`}>
                            {getStatusLabel(delay.justification.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {delay.justification.justification}
                        </p>
                        {delay.justification.validated_at && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Validé le {formatDate(delay.justification.validated_at)}
                              </span>
                            </div>
                            {delay.justification.validation_comment && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                "{delay.justification.validation_comment}"
                              </p>
                            )}
                          </div>
                        )}
                        {delay.justification.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => openActionModal(delay.justification!.id, 'validate')}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                              disabled={actionLoading === delay.justification!.id}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Valider
                            </button>
                            <button
                              onClick={() => openActionModal(delay.justification!.id, 'reject')}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
                              disabled={actionLoading === delay.justification!.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!delay.justification && delay.status === 'unjustified' && (
                      <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          Aucune justification fournie. Le technicien doit justifier ce retard.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredJustifications.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Aucune justification à afficher</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Justification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Créée le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJustifications.map((justification) => (
                <tr key={justification.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {getUserName(justification.user_id)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {justification.ticket_id ? (
                      <Link
                        to={`/app/tickets/${justification.ticket_id}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {justification.ticket_code || `#${justification.ticket_id}`}
                        {justification.ticket_title ? ` - ${justification.ticket_title}` : ''}
                      </Link>
                    ) : (
                      `#${justification.delay_id}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 max-w-md">
                    <p className="truncate" title={justification.justification}>
                      {justification.justification}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`badge ${getStatusBadge(justification.status)}`}>
                      {getStatusLabel(justification.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(justification.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {justification.status === 'pending' ? (
                      <PermissionGuard permission="delays.validate">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openActionModal(justification.id, 'validate')}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                            disabled={actionLoading === justification.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider
                          </button>
                          <button
                            onClick={() => openActionModal(justification.id, 'reject')}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
                            disabled={actionLoading === justification.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </button>
                        </div>
                      </PermissionGuard>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCommentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {pendingAction === 'validate' ? 'Valider la justification' : 'Rejeter la justification'}
                </h2>
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                className="input min-h-[120px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={submitAction}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de justification */}
      {showJustifyForm && selectedDelay && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Justifier le retard</h2>
                <button
                  onClick={() => {
                    setShowJustifyForm(false)
                    setJustification('')
                    setSelectedDelay(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {selectedDelay && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ticket concerné :</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {myDelays.find((d) => d.id === selectedDelay)?.ticket?.code || `#${selectedDelay}`} -{' '}
                    {myDelays.find((d) => d.id === selectedDelay)?.ticket?.title || 'Ticket'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Retard : +{formatTime(myDelays.find((d) => d.id === selectedDelay)?.delay_time || 0)} (
                    {(myDelays.find((d) => d.id === selectedDelay)?.delay_percentage || 0).toFixed(1)}%)
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Expliquez les raisons du retard (complexité, imprévus, dépendances, etc.)..."
                  className="input"
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Vous ne pouvez pas retirer le retard, mais vous pouvez expliquer les circonstances.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowJustifyForm(false)
                    setJustification('')
                    setSelectedDelay(null)
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitJustification}
                  disabled={!justification.trim()}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Soumettre la justification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DelayJustifications
