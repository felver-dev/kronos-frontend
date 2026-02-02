import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, AlertTriangle, Clock, ExternalLink, Loader2, RefreshCw, FileText } from 'lucide-react'
import { ticketService, TicketDTO } from '../services/ticketService'
import { ticketInternalService, TicketInternalDTO } from '../services/ticketInternalService'

const formatTime = (totalMinutes?: number | null): string => {
  if (totalMinutes == null || totalMinutes < 0) return '—'
  const minutes = Math.floor(totalMinutes)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Alerte quand ≥ 80 % du temps estimé est consommé.
 * - Dépassé : temps réel ≥ temps estimé
 * - Presque épuisé : temps réel ≥ 80 % du temps estimé (et < 100 %)
 */
function getAlerte(t: TicketDTO): 'depasse' | 'presque' | null {
  const est = t.estimated_time ?? 0
  const act = t.actual_time ?? 0
  if (est <= 0) return null
  if (act >= est) return 'depasse'
  if (act >= est * 0.8) return 'presque'
  return null
}

const statusLabels: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente: 'En attente',
  resolu: 'Résolu',
  cloture: 'Clôturé',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

const limit = 50

const MonPanier = () => {
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [ticketInternes, setTicketInternes] = useState<TicketInternalDTO[]>([])
  const [totalInternes, setTotalInternes] = useState(0)
  const [pageInternes, setPageInternes] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const [r, rInternes] = await Promise.all([
        ticketService.getPanier(page, limit),
        ticketInternalService.getPanier(pageInternes, limit),
      ])
      setTickets(r.tickets ?? [])
      setTotal(r.pagination?.total ?? 0)
      setTicketInternes(rInternes.tickets ?? [])
      setTotalInternes(rInternes.pagination?.total ?? 0)
    } catch (e) {
      console.error('Erreur chargement panier:', e)
      setTickets([])
      setTotal(0)
      setTicketInternes([])
      setTotalInternes(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, pageInternes])

  const withAlerte = tickets.filter((t) => getAlerte(t) !== null)
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const totalPagesInternes = Math.max(1, Math.ceil(totalInternes / limit))
  const hasAny = tickets.length > 0 || ticketInternes.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            Mon panier
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Tickets et tickets internes qui vous sont assignés et non clôturés. Ils disparaissent du panier à la clôture.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Bandeau alertes : ≥ 80 % du temps estimé consommé, avec liens vers les tickets */}
      {withAlerte.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-amber-800 dark:text-amber-200">
              <strong>{withAlerte.length}</strong> ticket{withAlerte.length > 1 ? 's' : ''} dont le temps estimé est
              dépassé à 80 % ou plus (presque épuisé ou dépassé).
            </p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Voir :{' '}
            {withAlerte.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ', '}
                <Link
                  to={`/app/tickets/${t.id}`}
                  className="font-mono text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {t.code}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : !hasAny ? (
        <div className="card text-center py-16">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Panier vide</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Aucun ticket ni ticket interne ne vous est assigné pour le moment. Dès qu’un ticket vous sera assigné, il apparaîtra ici.
            Une fois un ticket clôturé, il disparaît du panier.
          </p>
        </div>
      ) : (
        <>
          {tickets.length > 0 && (
          <div className="card overflow-hidden">
            <h2 className="px-4 py-3 text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
              Tickets
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code / Titre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Estimé / Réel
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alerte
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Voir
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((t) => {
                    const alerte = getAlerte(t)
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{t.code}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[220px]" title={t.title}>
                            {t.title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              t.status === 'en_cours'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                : t.status === 'en_attente'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                  : t.status === 'ouvert'
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {statusLabels[t.status] ?? t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              t.priority === 'critical'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                : t.priority === 'high'
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                                  : t.priority === 'medium'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            }`}
                          >
                            {priorityLabels[t.priority ?? 'medium'] ?? t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {formatTime(t.estimated_time)} / {formatTime(t.actual_time)}
                        </td>
                        <td className="px-4 py-3">
                          {alerte === 'depasse' && (
                            <Link
                              to={`/app/tickets/${t.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:opacity-90"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Dépassé
                            </Link>
                          )}
                          {alerte === 'presque' && (
                            <Link
                              to={`/app/tickets/${t.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:opacity-90"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Presque épuisé
                            </Link>
                          )}
                          {!alerte && <span className="text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/app/tickets/${t.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-sm"
                          >
                            Voir <ExternalLink className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {ticketInternes.length > 0 && (
          <div className="card overflow-hidden">
            <h2 className="px-4 py-3 text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Tickets internes
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code / Titre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Département / Filiale
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Voir
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ticketInternes.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{t.code}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[220px]" title={t.title}>
                          {t.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            t.status === 'en_cours'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : t.status === 'en_attente'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                : t.status === 'resolu'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                                  : t.status === 'ouvert'
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {statusLabels[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            t.priority === 'critical'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : t.priority === 'high'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                                : t.priority === 'medium'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          }`}
                        >
                          {priorityLabels[t.priority ?? 'medium'] ?? t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {t.department?.name ?? '—'} / {t.filiale?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/app/ticket-internes/${t.id}`}
                          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-sm"
                        >
                          Voir <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPagesInternes > 1 && (
              <div className="flex justify-center gap-2 py-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPageInternes((p) => Math.max(1, p - 1))}
                  disabled={pageInternes <= 1}
                  className="btn btn-secondary text-sm disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="flex items-center px-4 text-gray-600 dark:text-gray-400 text-sm">
                  Page {pageInternes} / {totalPagesInternes}
                </span>
                <button
                  type="button"
                  onClick={() => setPageInternes((p) => Math.min(totalPagesInternes, p + 1))}
                  disabled={pageInternes >= totalPagesInternes}
                  className="btn btn-secondary text-sm disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
          )}

          {totalPages > 1 && tickets.length > 0 && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="flex items-center px-4 text-gray-600 dark:text-gray-400">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}


export default MonPanier
