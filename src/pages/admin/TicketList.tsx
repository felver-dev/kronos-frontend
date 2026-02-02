import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Loader2, Eye, Building2, User, Users, Tag } from 'lucide-react'
import Pagination from '../../components/Pagination'
import { ticketService, TicketDTO } from '../../services/ticketService'
import { userService, UserDTO } from '../../services/userService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'resolu', label: 'Résolu' },
  { value: 'cloture', label: 'Clôturé' },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 25

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    en_attente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    resolu: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
    cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  }
  return map[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

const getRequesterDisplay = (ticket: TicketDTO): string => {
  if (ticket.requester) {
    if (ticket.requester.first_name || ticket.requester.last_name) {
      return [ticket.requester.first_name, ticket.requester.last_name].filter(Boolean).join(' ')
    }
    return ticket.requester.username || '—'
  }
  return ticket.requester_name || '—'
}

const getAssigneesDisplay = (ticket: TicketDTO): { name: string; email?: string }[] => {
  const result: { name: string; email?: string }[] = []
  if (ticket.assignees?.length) {
    ticket.assignees.forEach((a) => {
      const u = a.user
      const name = (u?.first_name || u?.last_name)
        ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        : (u?.username || '—')
      result.push({ name, email: u?.email })
    })
  }
  if (ticket.assigned_to && !ticket.assignees?.length) {
    const u = ticket.assigned_to
    const name = (u.first_name || u.last_name)
      ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
      : (u.username || '—')
    result.push({ name, email: u.email })
  }
  return result
}

export const TicketList = () => {
  const { user, hasPermission } = useAuth()
  const [tickets, setTickets] = useState<TicketDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFilialeId, setFilterFilialeId] = useState<string>('')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [users, setUsers] = useState<UserDTO[]>([])
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])

  const canViewList =
    hasPermission('tickets.view_all') ||
    hasPermission('tickets.view_filiale') ||
    hasPermission('tickets.view_team') ||
    hasPermission('tickets.view_own')
  const canFilterByFiliale =
    hasPermission('tickets.view_all') || hasPermission('tickets.view_filiale') || hasPermission('filiales.view')
  const canFilterByUser =
    hasPermission('tickets.view_all') || hasPermission('tickets.view_team') || hasPermission('users.view_all')

  const loadTickets = useCallback(async () => {
    if (!canViewList) return
    setLoading(true)
    try {
      const opts: { status?: string; filiale_id?: number; user_id?: number } = {}
      if (filterStatus) opts.status = filterStatus
      if (filterFilialeId) opts.filiale_id = parseInt(filterFilialeId, 10)
      if (filterUserId) opts.user_id = parseInt(filterUserId, 10)
      const response = await ticketService.getAll(page, itemsPerPage, Object.keys(opts).length ? opts : undefined)
      setTickets(response.tickets ?? [])
      setTotalItems(response.pagination?.total ?? 0)
      setTotalPages(response.pagination?.total_pages ?? 1)
    } catch (err) {
      console.error('Erreur chargement liste des tickets:', err)
      setTickets([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [canViewList, page, itemsPerPage, filterStatus, filterFilialeId, filterUserId])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (canFilterByUser) {
      userService.getAll().then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => {})
    }
    if (canFilterByFiliale) {
      filialeService.getAll(true).then((data) => setFiliales(Array.isArray(data) ? data : [])).catch(() => {})
    }
  }, [canFilterByUser, canFilterByFiliale])

  const applyFilters = () => {
    setPage(1)
    loadTickets()
  }

  if (!canViewList) {
    return <AccessDenied message="Vous n'avez pas accès à la liste des tickets." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Liste des tickets</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Tableau des tickets avec filtres par statut, filiale et utilisateur assigné.
        </p>
      </div>

      {/* Filtres */}
      <div className="card">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-full"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {canFilterByFiliale && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filiale</label>
                <select
                  value={filterFilialeId}
                  onChange={(e) => setFilterFilialeId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Toutes les filiales</option>
                  {filiales.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {canFilterByUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Utilisateur assigné
                </label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Tous</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button type="button" onClick={applyFilters} className="btn btn-primary">
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            Chargement...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Code</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Titre</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 max-w-xs">
                      Description
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Filiale</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Demandeur</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Assignés</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">État</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Aucun ticket trouvé.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                            {ticket.code || `#${ticket.id}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{ticket.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {ticket.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {ticket.filiale?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {getRequesterDisplay(ticket)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {getAssigneesDisplay(ticket).length === 0
                            ? '—'
                            : getAssigneesDisplay(ticket).map((a) => (
                                <div key={a.id}>
                                  <span>{a.name}</span>
                                  {a.email && <div className="text-xs text-gray-500 dark:text-gray-400">{a.email}</div>}
                                </div>
                              ))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(
                              ticket.status
                            )}`}
                          >
                            {STATUS_OPTIONS.find((o) => o.value === ticket.status)?.label ?? ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/app/tickets/${ticket.id}`}
                            className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemsPerPageOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
