import { useEffect, useState, useCallback } from 'react'
import { Bell, Filter, CheckCircle, Circle, ExternalLink, Calendar, User, Building2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../contexts/AuthContext'
import {
  notificationService,
  NotificationDTO,
  NotificationListResponse,
  NotificationHistoryFilters,
} from '../../services/notificationService'
import { userService, UserDTO } from '../../services/userService'
import { filialeService, FilialeDTO } from '../../services/filialeService'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 20

export const NotificationHistory = () => {
  const { hasPermission } = useAuth()
  const [data, setData] = useState<NotificationListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<NotificationHistoryFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  })
  const [users, setUsers] = useState<UserDTO[]>([])
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterFilialeId, setFilterFilialeId] = useState<string>('')
  const [filterIsRead, setFilterIsRead] = useState<'all' | 'read' | 'unread'>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterSearch, setFilterSearch] = useState<string>('')

  const canFilterByUser = hasPermission('users.view_all')
  const canFilterByFiliale =
    hasPermission('filiales.view') ||
    hasPermission('notifications.filter_by_filiale') ||
    canFilterByUser

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const opts: NotificationHistoryFilters = {
        page: filters.page,
        limit: filters.limit,
      }
      if (filterIsRead === 'read') opts.is_read = true
      if (filterIsRead === 'unread') opts.is_read = false
      if (filterDateFrom) opts.date_from = new Date(filterDateFrom).toISOString()
      if (filterDateTo) opts.date_to = new Date(filterDateTo + 'T23:59:59.999Z').toISOString()
      if (filterSearch.trim()) opts.search = filterSearch.trim()
      if (canFilterByUser && filterUserId) opts.user_id = parseInt(filterUserId, 10)
      if (canFilterByFiliale && filterFilialeId) opts.filiale_id = parseInt(filterFilialeId, 10)
      const res = await notificationService.getHistory(opts)
      setData(res)
    } catch {
      // Fallback si GET /notifications/history n'existe pas (backend ancien) : charger toutes les notifications et filtrer/paginer côté client
      try {
        const all = await notificationService.getAll()
        let list = Array.isArray(all) ? [...all] : []
        if (filterIsRead === 'read') list = list.filter((n) => n.is_read)
        if (filterIsRead === 'unread') list = list.filter((n) => !n.is_read)
        if (filterDateFrom) {
          const from = new Date(filterDateFrom).getTime()
          list = list.filter((n) => new Date(n.created_at).getTime() >= from)
        }
        if (filterDateTo) {
          const to = new Date(filterDateTo + 'T23:59:59.999Z').getTime()
          list = list.filter((n) => new Date(n.created_at).getTime() <= to)
        }
        if (filterSearch.trim()) {
          const q = filterSearch.trim().toLowerCase()
          list = list.filter(
            (n) =>
              (n.title && n.title.toLowerCase().includes(q)) ||
              (n.message && n.message.toLowerCase().includes(q))
          )
        }
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const total = list.length
        const page = Math.max(1, filters.page)
        const limit = Math.max(1, Math.min(100, filters.limit))
        const start = (page - 1) * limit
        const notifications = list.slice(start, start + limit)
        const totalPages = Math.ceil(total / limit) || 1
        const unreadCount = list.filter((n) => !n.is_read).length
        setData({
          notifications,
          unread_count: unreadCount,
          total,
          page,
          limit,
          total_pages: totalPages,
        })
      } catch (err) {
        console.error('Erreur chargement historique notifications:', err)
        setData(null)
      }
    } finally {
      setLoading(false)
    }
  }, [filters.page, filters.limit, filterIsRead, filterDateFrom, filterDateTo, filterSearch, filterUserId, filterFilialeId, canFilterByUser])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (canFilterByUser || canFilterByFiliale) {
      const load = []
      if (canFilterByUser) load.push(userService.getAll())
      else load.push(Promise.resolve([]))
      if (canFilterByFiliale) load.push(filialeService.getAll(true))
      else load.push(Promise.resolve([]))
      Promise.all(load).then(([u, f]) => {
        setUsers(Array.isArray(u) ? u : [])
        setFiliales(Array.isArray(f) ? f : [])
      }).catch(() => {})
    }
  }, [canFilterByUser, canFilterByFiliale])

  const applyFilters = async () => {
    setFilters((prev) => ({ ...prev, page: 1 }))
    setShowFilters(false)
    setLoading(true)
    try {
      const opts: NotificationHistoryFilters = {
        page: 1,
        limit: filters.limit,
      }
      if (filterIsRead === 'read') opts.is_read = true
      if (filterIsRead === 'unread') opts.is_read = false
      if (filterDateFrom) opts.date_from = new Date(filterDateFrom).toISOString()
      if (filterDateTo) opts.date_to = new Date(filterDateTo + 'T23:59:59.999Z').toISOString()
      if (filterSearch.trim()) opts.search = filterSearch.trim()
      if (canFilterByUser && filterUserId) opts.user_id = parseInt(filterUserId, 10)
      if (filterFilialeId) opts.filiale_id = parseInt(filterFilialeId, 10)
      const res = await notificationService.getHistory(opts)
      setData(res)
    } catch {
      try {
        const all = await notificationService.getAll()
        let list = Array.isArray(all) ? [...all] : []
        if (filterIsRead === 'read') list = list.filter((n) => n.is_read)
        if (filterIsRead === 'unread') list = list.filter((n) => !n.is_read)
        if (filterDateFrom) {
          const from = new Date(filterDateFrom).getTime()
          list = list.filter((n) => new Date(n.created_at).getTime() >= from)
        }
        if (filterDateTo) {
          const to = new Date(filterDateTo + 'T23:59:59.999Z').getTime()
          list = list.filter((n) => new Date(n.created_at).getTime() <= to)
        }
        if (filterSearch.trim()) {
          const q = filterSearch.trim().toLowerCase()
          list = list.filter(
            (n) =>
              (n.title && n.title.toLowerCase().includes(q)) ||
              (n.message && n.message.toLowerCase().includes(q))
          )
        }
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const total = list.length
        const limit = Math.max(1, Math.min(100, filters.limit))
        const notifications = list.slice(0, limit)
        setData({
          notifications,
          unread_count: list.filter((n) => !n.is_read).length,
          total,
          page: 1,
          limit,
          total_pages: Math.ceil(total / limit) || 1,
        })
      } catch {
        setData(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilterSearch('')
    setFilterUserId('')
    setFilterFilialeId('')
    setFilterIsRead('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilters((prev) => ({ ...prev, page: 1 }))
    setShowFilters(false)
  }

  const handleMarkAsRead = async (n: NotificationDTO) => {
    if (n.is_read) return
    try {
      await notificationService.markAsRead(n.id)
      await loadHistory()
    } catch (e) {
      console.error(e)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = data?.total_pages ?? 0
  const currentPage = data?.page ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Historique des notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Consultez et filtrez toutes vos notifications
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {showFilters ? 'Masquer' : 'Afficher'}
          </span>
        </button>
        {showFilters && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="pt-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <Search className="w-3.5 h-3.5 inline mr-1" />
                Nom du demandeur / Recherche (titre ou message)
              </label>
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Ex. ticket, validation, Dupont..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Statut
                </label>
                <select
                  value={filterIsRead}
                  onChange={(e) => setFilterIsRead(e.target.value as 'all' | 'read' | 'unread')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
                >
                  <option value="all">Toutes</option>
                  <option value="unread">Non lues</option>
                  <option value="read">Lues</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Date début
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Date fin
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
                />
              </div>
              {canFilterByUser && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    Utilisateur
                  </label>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
                  >
                    <option value="">Tous</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} {u.first_name || u.last_name ? `(${[u.first_name, u.last_name].filter(Boolean).join(' ')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {canFilterByFiliale && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    Filiale
                  </label>
                  <select
                    value={filterFilialeId}
                    onChange={(e) => setFilterFilialeId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm py-2 px-3"
                  >
                    <option value="">Toutes</option>
                    {filiales.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Résumé */}
      {data && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {data.total} notification{data.total !== 1 ? 's' : ''} au total
          {data.unread_count > 0 && ` · ${data.unread_count} non lue${data.unread_count !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Liste */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
          </div>
        ) : !data?.notifications?.length ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune notification</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                      <span className="sr-only">Lu</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Titre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      Message
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Lien
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.notifications.map((n) => (
                    <tr
                      key={n.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        {n.is_read ? (
                          <CheckCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" title="Lu" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n)}
                            className="text-primary-600 dark:text-primary-400 hover:opacity-80"
                            title="Marquer comme lu"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(n.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {n.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate hidden sm:table-cell">
                        {n.message}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {n.link_url ? (
                          <Link
                            to={n.link_url}
                            onClick={() => !n.is_read && handleMarkAsRead(n)}
                            className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ouvrir
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination — même design que la liste des tickets */}
            {(data?.total ?? 0) > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data?.total ?? 0}
                itemsPerPage={filters.limit}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                onItemsPerPageChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
                itemsPerPageOptions={PAGE_SIZE_OPTIONS}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
