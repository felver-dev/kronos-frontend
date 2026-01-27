import { useEffect, useMemo, useState } from 'react'
import { FileSearch, Search, Filter, Eye, User, Calendar, Activity } from 'lucide-react'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { auditService, AuditLogDTO } from '../../services/auditService'
import { userService, UserDTO } from '../../services/userService'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'

const Audit = () => {
  const { hasPermission } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [auditLogs, setAuditLogs] = useState<AuditLogDTO[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLogDTO | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await userService.getAll()
        setUsers(data)
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error)
      }
    }
    loadUsers()
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadLogs = async () => {
      // Vérifier les permissions avant de charger les données
      if (!hasPermission('audit.view_all') && !hasPermission('audit.view_team')) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const userId =
          filterUser !== 'all' && filterUser !== '' ? Number(filterUser) : undefined
        const action = filterAction !== 'all' ? filterAction : undefined
        const entityType = filterEntity !== 'all' ? filterEntity : undefined

        const response = await auditService.getAll({
          page: currentPage,
          limit: itemsPerPage,
          userId,
          action,
          entityType,
        })

        if (!isMounted) return
        setAuditLogs(response.logs)
        setTotalItems(response.pagination.total)
      } catch (error) {
        console.error('Erreur chargement logs d\'audit:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadLogs()
    return () => {
      isMounted = false
    }
  }, [currentPage, itemsPerPage, filterAction, filterEntity, filterUser])

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission('audit.view_all') && !hasPermission('audit.view_team')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les logs d'audit" />
  }

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return auditLogs
    return auditLogs.filter((log) => {
      const description = log.description?.toLowerCase() || ''
      const username = log.user?.username?.toLowerCase() || ''
      const entityId = log.entity_id ? String(log.entity_id) : ''
      return (
        description.includes(term) ||
        username.includes(term) ||
        entityId.includes(term)
      )
    })
  }, [auditLogs, searchTerm])

  const getActionBadge = (action: string) => {
    const styles = {
      create: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      assign: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      validate: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
    }
    return styles[action as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getEntityBadge = (entityType: string) => {
    const styles = {
      ticket: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      user: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      asset: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      incident: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    }
    return styles[entityType as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderJson = (value?: Record<string, any>) => {
    if (!value || Object.keys(value).length === 0) {
      return <span className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée</span>
    }
    return (
      <pre className="text-xs text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Logs d'audit</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Traçabilité complète de toutes les actions</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
            </div>
            <FileSearch className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Créations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredLogs.filter((l) => l.action === 'create').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Modifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredLogs.filter((l) => l.action === 'update').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Suppressions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredLogs.filter((l) => l.action === 'delete').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Champ de recherche */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          {/* Select des actions */}
          <div className="relative">
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none block w-full lg:w-56 px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200 cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-gray-700">Toutes les actions</option>
              <option value="create" className="bg-white dark:bg-gray-700">Création</option>
              <option value="update" className="bg-white dark:bg-gray-700">Modification</option>
              <option value="delete" className="bg-white dark:bg-gray-700">Suppression</option>
              <option value="assign" className="bg-white dark:bg-gray-700">Assignation</option>
              <option value="validate" className="bg-white dark:bg-gray-700">Validation</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Select des entités */}
          <div className="relative">
            <select
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none block w-full lg:w-56 px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200 cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-gray-700">Toutes les entités</option>
              <option value="ticket" className="bg-white dark:bg-gray-700">Tickets</option>
              <option value="user" className="bg-white dark:bg-gray-700">Utilisateurs</option>
              <option value="asset" className="bg-white dark:bg-gray-700">Actifs</option>
              <option value="incident" className="bg-white dark:bg-gray-700">Incidents</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Select des utilisateurs */}
          <div className="relative">
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none block w-full lg:w-56 px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all duration-200 cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-gray-700">Tous les utilisateurs</option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="bg-white dark:bg-gray-700">
                  {(user.first_name || user.last_name)
                    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                    : user.username}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Bouton Plus de filtres */}
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterAction('all')
              setFilterEntity('all')
              setFilterUser('all')
              setCurrentPage(1)
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow"
          >
            <Filter className="w-5 h-5 mr-2" />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Entité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(log.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-2">
                        <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.user ? `${log.user.first_name ?? ''} ${log.user.last_name ?? ''}`.trim() : 'Système'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{log.user?.username || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${getActionBadge(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className={`badge ${getEntityBadge(log.entity_type)}`}>
                        {log.entity_type}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: {log.entity_id ?? '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{log.description || '-'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedLog(log)
                        setIsDetailsOpen(true)
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                      title="Voir détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Aucun log d'audit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage) || 1}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value)
            setCurrentPage(1)
          }}
        />
      </div>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedLog(null)
        }}
        title="Détails du log d'audit"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date / Heure</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(selectedLog.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Utilisateur</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedLog.user
                    ? `${selectedLog.user.first_name ?? ''} ${selectedLog.user.last_name ?? ''}`.trim() || selectedLog.user.username
                    : 'Système'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Action</p>
                <span className={`badge ${getActionBadge(selectedLog.action)}`}>{selectedLog.action}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entité</p>
                <span className={`badge ${getEntityBadge(selectedLog.entity_type)}`}>{selectedLog.entity_type}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {selectedLog.entity_id ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Adresse IP</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">User Agent</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                  {selectedLog.user_agent || '-'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.description || '-'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Anciennes valeurs</p>
                {renderJson(selectedLog.old_values)}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Nouvelles valeurs</p>
                {renderJson(selectedLog.new_values)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Audit
