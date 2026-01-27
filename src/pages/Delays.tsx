import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Clock, CheckCircle, XCircle, Plus, Edit, FileText, User, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { delayService, DelayDTO } from '../services/delayService'
import { useAuth } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

type DelayItem = {
  id: number
  ticketId: number
  ticket?: {
    id: number
    code?: string
    title?: string
    status?: string
  }
  userId: number
  user?: {
    id: number
    username?: string
    firstName?: string
    lastName?: string
  }
  estimatedTime: number
  actualTime: number
  delayTime: number
  delayPercentage: number
  status: 'unjustified' | 'pending' | 'justified' | 'rejected'
  detectedAt?: string
  createdAt?: string
  justification?: {
    id: number
    delayId: number
    userId: number
    justification: string
    status: 'pending' | 'validated' | 'rejected'
    validatedBy?: number
    validatedAt?: string
    validationComment?: string
    createdAt?: string
  }
}

const Delays = () => {
  const toast = useToastContext()
  const { user } = useAuth()
  const [showJustifyForm, setShowJustifyForm] = useState(false)
  const [selectedDelay, setSelectedDelay] = useState<number | null>(null)
  const [justification, setJustification] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [delays, setDelays] = useState<DelayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mapDelay = (delay: DelayDTO): DelayItem => ({
    id: delay.id,
    ticketId: delay.ticket_id,
    ticket: delay.ticket
      ? {
          id: delay.ticket.id,
          code: delay.ticket.code,
          title: delay.ticket.title,
          status: delay.ticket.status,
        }
      : undefined,
    userId: delay.user_id,
    user: delay.user
      ? {
          id: delay.user.id,
          username: delay.user.username,
          firstName: delay.user.first_name,
          lastName: delay.user.last_name,
        }
      : undefined,
    estimatedTime: delay.estimated_time,
    actualTime: delay.actual_time,
    delayTime: delay.delay_time,
    delayPercentage: delay.delay_percentage,
    status: delay.status,
    detectedAt: delay.detected_at,
    createdAt: delay.created_at,
    justification: delay.justification
      ? {
          id: delay.justification.id,
          delayId: delay.justification.delay_id,
          userId: delay.justification.user_id,
          justification: delay.justification.justification,
          status: delay.justification.status,
          validatedBy: delay.justification.validated_by,
          validatedAt: delay.justification.validated_at,
          validationComment: delay.justification.validation_comment,
          createdAt: delay.justification.created_at,
        }
      : undefined,
  })

  const loadDelays = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const userId = Number(user.id)
      const response = await delayService.getByUserId(userId)
      setDelays((Array.isArray(response) ? response : []).map(mapDelay))
    } catch (err) {
      console.error('Erreur lors du chargement des retards:', err)
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des retards'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDelays()
  }, [user?.id])

  const selectedDelayDetails = useMemo(
    () => delays.find((d) => d.id === selectedDelay),
    [delays, selectedDelay]
  )

  const filteredDelays = delays.filter((delay) => {
    if (filterStatus === 'all') return true
    return delay.status === filterStatus
  })

  const handleJustify = (delayId: number) => {
    setSelectedDelay(delayId)
    const delay = delays.find((d) => d.id === delayId)
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
      const existing = delays.find((d) => d.id === selectedDelay)?.justification
      if (existing && existing.status === 'pending') {
        await delayService.updateJustification(selectedDelay, justification.trim())
      } else {
        await delayService.createJustification(selectedDelay, justification.trim())
      }
      setShowJustifyForm(false)
      setJustification('')
      setSelectedDelay(null)
      await loadDelays()
      toast.success('Justification enregistrée')
    } catch (err) {
      console.error('Erreur lors de la justification:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la justification')
    }
  }

  const formatTime = (totalMinutes: number) => {
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

  const getStatusBadge = (status: string) => {
    const styles = {
      unjustified: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      justified: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      rejected: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      unjustified: 'Non justifié',
      pending: 'En attente de validation',
      justified: 'Justifié validé',
      rejected: 'Justification rejetée',
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Justification des retards</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-gray-600 dark:text-gray-300">Justifiez les retards sur vos tickets</p>
          <button
            onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
            className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
            title="Comment justifier un retard ?"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        </div>
        {isInfoModalOpen && (
          <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">Comment justifier un retard ?</p>
                <p className="whitespace-pre-line">
                  Un retard est détecté automatiquement lorsque le temps réel dépasse le temps estimé d'un ticket.
                  {'\n\n'}Processus de justification :
                  {'\n'}• Détection automatique : Le système détecte les retards dès qu'ils se produisent
                  {'\n'}• Justification : Expliquez les raisons du retard (complexité, imprévus, dépendances, etc.)
                  {'\n'}• Validation : Votre responsable valide ou rejette la justification
                  {'\n'}• Suivi : Consultez le statut de vos justifications (en attente, validée, rejetée)
                  {'\n\n'}Conseils :
                  {'\n'}• Justifiez rapidement pour éviter les retards non justifiés
                  {'\n'}• Soyez précis dans vos explications
                  {'\n'}• Mentionnez les facteurs externes qui ont causé le retard
                  {'\n'}• Vous pouvez modifier une justification en attente de validation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement des retards...
        </div>
      )}
      {!loading && error && (
        <div className="card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Retards à justifier</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {delays.filter((d) => d.status === 'unjustified').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">En attente de validation</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {delays.filter((d) => d.status === 'pending').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Justifiés validés</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {delays.filter((d) => d.status === 'justified').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Temps de retard total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatTime(delays.reduce((acc, d) => acc + d.delayTime, 0))}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par statut :</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">Tous</option>
            <option value="unjustified">Non justifiés</option>
            <option value="pending">En attente</option>
            <option value="justified">Justifiés validés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>
      </div>

      {/* Liste des retards */}
      <div className="space-y-4">
        {filteredDelays.map((delay) => (
          <div key={delay.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <Link
                    to={`/app/tickets/${delay.ticketId}`}
                    className="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {delay.ticket?.code || `#${delay.ticketId}`} - {delay.ticket?.title || 'Ticket'}
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
                      {formatTime(delay.estimatedTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Temps réel</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatTime(delay.actualTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Retard</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      +{formatTime(delay.delayTime)} ({delay.delayPercentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                {/* Justification existante */}
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
                    {delay.justification.validatedAt && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Validé le {new Date(delay.justification.validatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {delay.justification.validationComment && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            "{delay.justification.validationComment}"
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
                    {selectedDelayDetails?.ticket?.code || `#${selectedDelayDetails?.ticketId}`} -{' '}
                    {selectedDelayDetails?.ticket?.title || 'Ticket'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Retard : +{formatTime(selectedDelayDetails?.delayTime || 0)} (
                    {(selectedDelayDetails?.delayPercentage || 0).toFixed(1)}%)
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

      {/* Message si aucun retard */}
      {filteredDelays.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            {filterStatus === 'all'
              ? 'Aucun retard enregistré'
              : `Aucun retard avec le statut "${getStatusLabel(filterStatus)}"`}
          </p>
        </div>
      )}
    </div>
  )
}

export default Delays
