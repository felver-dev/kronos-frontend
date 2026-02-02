import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Calendar, Shield, Clock, Ticket, Loader2, AlertCircle, HardDrive, BarChart3, CheckCircle, XCircle, Building2, MapPin, Eye, EyeOff } from 'lucide-react'
import Modal from '../../components/Modal'
import EditUserForm from '../../components/forms/EditUserForm'
import ConfirmModal from '../../components/ConfirmModal'
import { userService, UserDTO, UpdateUserRequest } from '../../services/userService'
import { ticketService, TicketDTO } from '../../services/ticketService'
import { assetService, AssetDTO } from '../../services/assetService'
import { timeEntryService, TimeEntryDTO } from '../../services/timeEntryService'
import { useToastContext } from '../../contexts/ToastContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { usePermissionGuard } from '../../hooks/usePermissionGuard'

const UserDetails = () => {
  const { id } = useParams()
  const toast = useToastContext()
  const updateGuard = usePermissionGuard('users.update', 'modifier un utilisateur')
  const [user, setUser] = useState<UserDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isToggleActiveModalOpen, setIsToggleActiveModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetPasswordSubmitting, setIsResetPasswordSubmitting] = useState(false)
  
  // Nouvelles données
  const [assignedTickets, setAssignedTickets] = useState<TicketDTO[]>([])
  const [assignedAssets, setAssignedAssets] = useState<AssetDTO[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntryDTO[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false)

  useEffect(() => {
    loadUser()
  }, [id])

  // Afficher le nom du rôle tel que renvoyé par l'API (configurable par l'organisation)
  const formatRole = (role: string): string => role || '-'

  // Fonction pour charger l'utilisateur
  const loadUser = async () => {
    if (!id) {
      setError('ID utilisateur manquant')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await userService.getById(parseInt(id))
      setUser(data)
    } catch (err) {
      console.error('Erreur lors du chargement de l\'utilisateur:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'utilisateur')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'utilisateur')
    } finally {
      setLoading(false)
    }
  }

  // Charger les tickets assignés
  const loadAssignedTickets = async () => {
    if (!id) return
    setLoadingTickets(true)
    try {
      const response = await ticketService.getByAssignee(parseInt(id), 1, 50)
      setAssignedTickets(Array.isArray(response.tickets) ? response.tickets : [])
    } catch (err) {
      console.error('Erreur lors du chargement des tickets:', err)
      setAssignedTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  // Charger les actifs assignés
  const loadAssignedAssets = async () => {
    if (!id) return
    setLoadingAssets(true)
    try {
      const data = await assetService.getByUser(parseInt(id))
      setAssignedAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des actifs:', err)
      setAssignedAssets([])
    } finally {
      setLoadingAssets(false)
    }
  }

  // Charger les entrées de temps
  const loadTimeEntries = async () => {
    if (!id) return
    setLoadingTimeEntries(true)
    try {
      const data = await timeEntryService.getByUserId(parseInt(id))
      setTimeEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des entrées de temps:', err)
      setTimeEntries([])
    } finally {
      setLoadingTimeEntries(false)
    }
  }

  // Charger toutes les données
  useEffect(() => {
    if (id) {
      loadUser()
      loadAssignedTickets()
      loadAssignedAssets()
      loadTimeEntries()
    }
  }, [id])

  // Fonction pour formater la date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Non disponible'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  // Fonction pour modifier l'utilisateur
  const handleUpdate = async (data: UpdateUserRequest) => {
    if (!user) return
    
    // Vérifier la permission avant de modifier
    if (!updateGuard.checkPermission()) {
      return
    }

    setIsSubmitting(true)
    try {
      await userService.update(user.id, data)
      setIsEditModalOpen(false)
      toast.success('Utilisateur mis à jour avec succès')
      await loadUser() // Recharger les données de l'utilisateur
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification de l\'utilisateur')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour activer/désactiver l'utilisateur
  const handleToggleActive = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await userService.update(user.id, { is_active: !user.is_active })
      setIsToggleActiveModalOpen(false)
      toast.success(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès`)
      await loadUser() // Recharger les données de l'utilisateur
    } catch (err) {
      console.error('Erreur lors de la modification du statut:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification du statut')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (resetPasswordValue.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      toast.error('Les deux mots de passe ne correspondent pas')
      return
    }
    setIsResetPasswordSubmitting(true)
    try {
      await userService.resetPassword(user.id, resetPasswordValue)
      setIsResetPasswordModalOpen(false)
      setResetPasswordValue('')
      setResetPasswordConfirm('')
      setShowResetPassword(false)
      setShowResetPasswordConfirm(false)
      toast.success('Mot de passe réinitialisé avec succès')
    } catch (err) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation du mot de passe')
    } finally {
      setIsResetPasswordSubmitting(false)
    }
  }

  // Formater le temps (minutes en heures)
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  // Formater le statut du ticket
  const formatTicketStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      ouvert: 'Ouvert',
      en_cours: 'En cours',
      en_attente: 'En attente',
      cloture: 'Clôturé',
    }
    return statusMap[status] || status
  }

  // Obtenir le badge de statut du ticket
  const getTicketStatusBadge = (status: string): string => {
    const styles: Record<string, string> = {
      ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      en_cours: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      en_attente: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    }
    return styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Formater le statut de l'actif
  const formatAssetStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      available: 'Disponible',
      in_use: 'En utilisation',
      maintenance: 'En maintenance',
      retired: 'Hors service',
    }
    return statusMap[status] || status
  }

  // Obtenir le badge de statut de l'actif
  const getAssetStatusBadge = (status: string): string => {
    const styles: Record<string, string> = {
      available: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      in_use: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      maintenance: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      retired: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    }
    return styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Calculer les statistiques
  const stats = {
    totalTickets: assignedTickets.length,
    openTickets: assignedTickets.filter((t) => t.status === 'ouvert').length,
    inProgressTickets: assignedTickets.filter((t) => t.status === 'en_cours').length,
    closedTickets: assignedTickets.filter((t) => t.status === 'cloture').length,
    totalAssets: assignedAssets.length,
    totalTimeSpent: timeEntries.reduce((sum, entry) => sum + entry.time_spent, 0),
    validatedTimeEntries: timeEntries.filter((e) => e.validated).length,
    pendingTimeEntries: timeEntries.filter((e) => !e.validated).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des détails...</span>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Link
          to="/app/users"
          state={{ refresh: true }}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Link>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error || 'Utilisateur non trouvé'}</span>
          </div>
        </div>
      </div>
    )
  }

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` || user.username[0].toUpperCase()
  const fullName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user.username

  return (
    <div className="space-y-6">
      <Link
        to="/app/users"
        state={{ refresh: true }}
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Informations personnelles</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold text-2xl">
                    {initials}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {fullName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{formatRole(user.role)}</p>
                  {user.department && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {user.department.name} {user.department.code ? `(${user.department.code})` : ''}
                    </p>
                  )}
                  {user.department?.office && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {user.department.office.name} - {user.department.office.city}, {user.department.office.country}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rôle</p>
                    <p className="text-gray-900 dark:text-gray-100">{formatRole(user.role)}</p>
                  </div>
                </div>
                {user.department && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Département</p>
                      <p className="text-gray-900 dark:text-gray-100">
                        {user.department.name} {user.department.code ? `(${user.department.code})` : ''}
                      </p>
                      {user.department.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.department.description}</p>
                      )}
                    </div>
                  </div>
                )}
                {user.department?.office && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Siège</p>
                      <p className="text-gray-900 dark:text-gray-100">{user.department.office.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user.department.office.address && `${user.department.office.address}, `}
                        {user.department.office.commune && `${user.department.office.commune}, `}
                        {user.department.office.city}, {user.department.office.country}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Membre depuis</p>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dernière connexion</p>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(user.last_login)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tickets assignés</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTickets}</p>
                </div>
                <Ticket className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Actifs assignés</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalAssets}</p>
                </div>
                <HardDrive className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Temps total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(stats.totalTimeSpent)}</p>
                </div>
                <Clock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tickets ouverts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.openTickets}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>

          {/* Tickets assignés */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Ticket className="w-5 h-5 mr-2" />
              Tickets assignés ({stats.totalTickets})
            </h2>
            {loadingTickets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : assignedTickets.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun ticket assigné à cet utilisateur</p>
            ) : (
              <div className="space-y-3">
                {assignedTickets.slice(0, 10).map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/app/tickets/${ticket.id}`}
                    className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{ticket.code} - {ticket.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {ticket.category} • {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span className={`badge ${getTicketStatusBadge(ticket.status)} ml-4`}>
                        {formatTicketStatus(ticket.status)}
                      </span>
                    </div>
                  </Link>
                ))}
                {assignedTickets.length > 10 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                    ... et {assignedTickets.length - 10} autre(s) ticket(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actifs assignés */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <HardDrive className="w-5 h-5 mr-2" />
              Actifs assignés ({stats.totalAssets})
            </h2>
            {loadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : assignedAssets.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun actif assigné à cet utilisateur</p>
            ) : (
              <div className="space-y-3">
                {assignedAssets.slice(0, 10).map((asset) => (
                  <Link
                    key={asset.id}
                    to={`/app/assets/${asset.id}`}
                    className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{asset.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {asset.category?.name || 'Non catégorisé'} • {asset.serial_number || 'N/A'}
                        </p>
                      </div>
                      <span className={`badge ${getAssetStatusBadge(asset.status)} ml-4`}>
                        {formatAssetStatus(asset.status)}
                      </span>
                    </div>
                  </Link>
                ))}
                {assignedAssets.length > 10 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                    ... et {assignedAssets.length - 10} autre(s) actif(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gestion du temps */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Gestion du temps
            </h2>
            {loadingTimeEntries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Temps total passé</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(stats.totalTimeSpent)}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Entrées validées</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.validatedTimeEntries}</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pendingTimeEntries}</p>
                  </div>
                </div>
                {timeEntries.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dernières entrées de temps</h3>
                    <div className="space-y-2">
                      {timeEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {entry.ticket ? `${entry.ticket.code} - ${entry.ticket.title}` : `Ticket #${entry.ticket_id}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(entry.date)} • {formatTime(entry.time_spent)}
                            </p>
                          </div>
                          {entry.validated ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistiques et actions */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statut</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Statut du compte</span>
                <span className={`badge ${user.is_active 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {user.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistiques</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tickets ouverts</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.openTickets}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tickets en cours</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.inProgressTickets}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tickets clôturés</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.closedTickets}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Temps total passé</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatTime(stats.totalTimeSpent)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h2>
            <div className="space-y-2">
              <PermissionGuard permission="users.update">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full btn btn-primary"
                >
                  Modifier
                </button>
              </PermissionGuard>
              <PermissionGuard permission="users.update">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(true)}
                  className="w-full btn btn-secondary"
                >
                  Réinitialiser le mot de passe
                </button>
              </PermissionGuard>
              <PermissionGuard permission="users.update">
                <button 
                  onClick={() => setIsToggleActiveModalOpen(true)}
                  disabled={isSubmitting}
                  className={`w-full btn ${user.is_active ? 'btn-danger' : 'btn-secondary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Traitement...' : (user.is_active ? 'Désactiver' : 'Activer')}
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      {user && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Modifier l'utilisateur"
          size="md"
        >
          <EditUserForm
            user={user}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditModalOpen(false)}
            isSubmitting={isSubmitting}
          />
        </Modal>
      )}

      {/* Modal de confirmation pour activer/désactiver */}
      {user && (
        <ConfirmModal
          isOpen={isToggleActiveModalOpen}
          onClose={() => setIsToggleActiveModalOpen(false)}
          onConfirm={handleToggleActive}
          title={user.is_active ? 'Désactiver l\'utilisateur' : 'Activer l\'utilisateur'}
          message={
            user.is_active
              ? `Êtes-vous sûr de vouloir désactiver l'utilisateur "${user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}" ? Il ne pourra plus se connecter au système.`
              : `Êtes-vous sûr de vouloir activer l'utilisateur "${user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}" ? Il pourra à nouveau se connecter au système.`
          }
          confirmText={user.is_active ? 'Désactiver' : 'Activer'}
          cancelText="Annuler"
          confirmButtonClass={user.is_active ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600' : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'}
          isLoading={isSubmitting}
        />
      )}

      {/* Modal Réinitialiser le mot de passe */}
      {user && (
        <Modal
          isOpen={isResetPasswordModalOpen}
          onClose={() => {
            setIsResetPasswordModalOpen(false)
            setResetPasswordValue('')
            setResetPasswordConfirm('')
            setShowResetPassword(false)
            setShowResetPasswordConfirm(false)
          }}
          title="Réinitialiser le mot de passe"
          size="sm"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Définir un nouveau mot de passe pour {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="input pr-10"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showResetPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showResetPasswordConfirm ? 'text' : 'password'}
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="input pr-10"
                  placeholder="Confirmer le mot de passe"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowResetPasswordConfirm(!showResetPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showResetPasswordConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showResetPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetPasswordModalOpen(false)
                  setResetPasswordValue('')
                  setResetPasswordConfirm('')
                  setShowResetPassword(false)
                  setShowResetPasswordConfirm(false)
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isResetPasswordSubmitting || resetPasswordValue.length < 6 || resetPasswordValue !== resetPasswordConfirm}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetPasswordSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    En cours...
                  </>
                ) : (
                  'Réinitialiser'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default UserDetails
