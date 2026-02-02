import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Clock, AlertCircle, CheckCircle, TrendingUp, Calendar, Loader2, FolderKanban, Activity, ShoppingCart, FileText, Download, ArrowDown } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ticketService, TicketDTO } from '../services/ticketService'
import { ticketInternalService, TicketInternalDTO, TicketInternalPerformanceDTO } from '../services/ticketInternalService'
import { reportsService, WorkloadByAgentDTO } from '../services/reportsService'
import { timesheetService } from '../services/timesheetService'
import { delayService } from '../services/delayService'
import { projectService, ProjectDTO, ProjectTaskDTO } from '../services/projectService'
import { auditService, AuditLogDTO } from '../services/auditService'
import { useAuth } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

const PROJECT_STATUS: Record<string, string> = { active: 'Actif', completed: 'Clôturé', cancelled: 'Annulé' }

const EmployeeDashboard = () => {
  const toast = useToastContext()
  const { user, hasPermission, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [myProjects, setMyProjects] = useState<ProjectDTO[]>([])
  const [myProjectStats, setMyProjectStats] = useState({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
  const [myStats, setMyStats] = useState({
    ticketsAssigned: 0,
    ticketsInProgress: 0,
    ticketsResolved: 0,
    ticketsOverdue: 0,
    totalHours: 0,
    efficiency: 0,
  })
  const [myTickets, setMyTickets] = useState<TicketDTO[]>([])
  const [performanceData, setPerformanceData] = useState<Array<{ name: string; performance: number }>>([])
  const [monthlyPerformance, setMonthlyPerformance] = useState<Array<{ month: string; tickets: number }>>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<Array<{ name: string; value: number }>>([])
  const [recentActivities, setRecentActivities] = useState<AuditLogDTO[]>([])
  const [dashboardTab, setDashboardTab] = useState<'normaux' | 'internes'>('normaux')
  const [myInternalTickets, setMyInternalTickets] = useState<TicketInternalDTO[]>([])
  const [internalTotalCount, setInternalTotalCount] = useState(0)
  const [internalPerformance, setInternalPerformance] = useState<TicketInternalPerformanceDTO | null>(null)
  /** Stats tickets internes (total, open, closed, by_status) depuis l’API dashboard pour afficher les vraies valeurs */
  const [loadError, setLoadError] = useState<'timeout' | 'error' | null>(null)
  /** Détails de performance par technicien (tickets normaux + internes, périmètre département/filiale/global) */
  const [performanceDetails, setPerformanceDetails] = useState<WorkloadByAgentDTO[]>([])
  const [loadingPerformanceDetails, setLoadingPerformanceDetails] = useState(false)

  const statusLabels: Record<string, string> = {
    ouvert: 'Ouvert',
    en_cours: 'En cours',
    en_attente: 'En attente',
    cloture: 'Résolu',
  }

  const priorityLabels: Record<string, string> = {
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute',
    critical: 'Critique',
  }

  const getStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      en_attente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    }
    return styles[status || ''] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getPriorityBadge = (priority?: string) => {
    const styles: Record<string, string> = {
      low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    }
    return styles[priority || ''] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const formatDate = (date?: string) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR')
    } catch {
      return date
    }
  }

  const LOAD_TIMEOUT_MS = 20000 // 20 s max pour éviter le loader infini

  useEffect(() => {
    let isMounted = true
    const loadDashboard = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }
      setLoading(true)
      const userId = Number(user.id)
      const canViewProjects =
        hasPermission('projects.view') ||
        hasPermission('projects.view_all') ||
        hasPermission('projects.view_team') ||
        hasPermission('projects.view_own')
      const canViewAudit =
        hasPermission('audit.view_all') || hasPermission('audit.view_team') || hasPermission('audit.view_own')
      const canViewTicketInternes =
        hasPermission('tickets_internes.view_own') ||
        hasPermission('tickets_internes.view_department') ||
        hasPermission('tickets_internes.view_filiale') ||
        hasPermission('tickets_internes.view_all')

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai de chargement dépassé')), LOAD_TIMEOUT_MS)
      )

      try {
        // Phase 1 : 3 requêtes — limite de tickets pour alléger (total via pagination, liste 5 derniers)
        const [myTicketsRes, timeEntries, delays] = await Promise.race([
          Promise.all([
            ticketService.getMyTickets(1, 15, 'all'),
            timesheetService.getTimeEntriesByUserId(userId),
            delayService.getByUserId(userId),
          ]),
          timeoutPromise,
        ])

        const allTicketsList = myTicketsRes.tickets ?? []
        const total = myTicketsRes.pagination?.total ?? 0
        const inProgress = allTicketsList.filter((t) => t.status === 'en_cours').length
        const resolved = allTicketsList.filter((t) => t.status === 'cloture' || t.status === 'resolu').length
        const overdue = Array.isArray(delays) ? delays.length : 0

        const safeEntries = Array.isArray(timeEntries) ? timeEntries : []
        const now = new Date()
        const month = now.getMonth()
        const year = now.getFullYear()
        const monthMinutes = safeEntries.reduce((sum, entry) => {
          const entryDate = new Date(entry.date)
          if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
            return sum + (entry.time_spent || 0)
          }
          return sum
        }, 0)
        const totalHours = Math.round((monthMinutes / 60) * 10) / 10
        const efficiency = total > 0 ? Math.round((resolved / total) * 100) : 0

        setMyTickets(allTicketsList.slice(0, 5))

        const lastFourWeeks = Array.from({ length: 4 }).map((_, idx) => {
          const ref = new Date()
          ref.setDate(ref.getDate() - idx * 7)
          const weekKey = `Semaine ${4 - idx}`
          return { label: weekKey, start: ref }
        })
        const performance = lastFourWeeks.map((week) => {
          const weekStartDate = new Date(week.start)
          weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay())
          const weekEndDate = new Date(weekStartDate)
          weekEndDate.setDate(weekStartDate.getDate() + 6)
          const weekMinutes = safeEntries.reduce((sum, entry) => {
            const d = new Date(entry.date)
            if (d >= weekStartDate && d <= weekEndDate) {
              return sum + (entry.time_spent || 0)
            }
            return sum
          }, 0)
          const weekHours = Math.round((weekMinutes / 60) * 10) / 10
          return { name: week.label, performance: weekHours > 0 ? Math.min(100, Math.round(weekHours * 10)) : 0 }
        })
        setPerformanceData(performance)

        const closedTicketList = allTicketsList.filter((t) => t.status === 'cloture' || t.status === 'resolu')
        const months = Array.from({ length: 4 }).map((_, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() - (3 - i))
          return {
            key: `${date.getFullYear()}-${date.getMonth() + 1}`,
            label: date.toLocaleDateString('fr-FR', { month: 'short' }),
          }
        })
        const monthlyCounts: Record<string, number> = {}
        closedTicketList.forEach((ticket) => {
          const closedAt = ticket.closed_at || ticket.updated_at
          if (!closedAt) return
          const d = new Date(closedAt)
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`
          monthlyCounts[key] = (monthlyCounts[key] || 0) + 1
        })
        setMonthlyPerformance(
          months.map((m) => ({
            month: m.label,
            tickets: monthlyCounts[m.key] || 0,
          })),
        )

        const statusCounts: Record<string, number> = {}
        allTicketsList.forEach((ticket) => {
          const status = ticket.status || 'autre'
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        setTicketsByStatus([
          { name: 'Ouverts', value: statusCounts['ouvert'] || 0 },
          { name: 'En cours', value: statusCounts['en_cours'] || 0 },
          { name: 'En attente', value: statusCounts['en_attente'] || 0 },
          { name: 'Clôturés', value: (statusCounts['cloture'] || 0) + (statusCounts['resolu'] || 0) },
        ])
        setMyStats({
          ticketsAssigned: total,
          ticketsInProgress: inProgress,
          ticketsResolved: resolved,
          ticketsOverdue: overdue,
          totalHours,
          efficiency,
        })

        setLoading(false)

        // Phase 2 : projets — en arrière-plan (ne bloque plus l'affichage)
        if (isMounted && canViewProjects) {
          projectService.getAll({ scope: 'own' }).then((allProjects) => {
            if (!isMounted) return
            const projects = Array.isArray(allProjects) ? allProjects : []
            // Récupérer les tâches de tous les projets (max 25) pour un comptage exact des tâches assignées
            const projectsToFetchTasks = projects.slice(0, 25)
            Promise.all(projectsToFetchTasks.map((p) => projectService.getTasks(p.id).catch(() => [] as ProjectTaskDTO[])))
              .then((tasksArrays) => {
                if (!isMounted) return
                let myTasksCount = 0
                tasksArrays.forEach((tasks) => {
                  const list = Array.isArray(tasks) ? tasks : []
                  myTasksCount += list.filter(
                    (t) =>
                      (t.assignees || []).some((a) => Number(a.user_id) === userId) || Number(t.assigned_to_id) === userId
                  ).length
                })
                // consumed_time est en minutes côté API
                const totalMinutes = projects.reduce((s, p) => s + (p.consumed_time ?? 0), 0)
                const consumedHours = Math.round(totalMinutes / 60)
                setMyProjects(projects)
                setMyProjectStats({
                  total: projects.length,
                  active: projects.filter((p) => p.status === 'active').length,
                  myTasksCount,
                  consumedHours,
                })
              })
              .catch(() => {
                if (isMounted) {
                  setMyProjects([])
                  setMyProjectStats({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
                }
              })
          }).catch(() => {
            if (isMounted) {
              setMyProjects([])
              setMyProjectStats({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
            }
          })
        } else if (isMounted) {
          setMyProjects([])
          setMyProjectStats({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
        }

        // Phase 3 : audit + tickets internes + ma performance sur les tickets internes — en arrière-plan
        if (isMounted && canViewAudit && canViewTicketInternes) {
          Promise.all([
            auditService.getAll({ page: 1, limit: 10, userId }).catch(() => ({ logs: [] })),
            ticketInternalService.getAll(1, 50).catch(() => ({ tickets: [], pagination: { total: 0 } })),
            ticketInternalService.getMyPerformance().catch(() => null),
          ]).then(([auditRes, internalRes, perf]) => {
            if (!isMounted) return
            setRecentActivities(auditRes?.logs ?? [])
            setMyInternalTickets(internalRes?.tickets ?? [])
            setInternalTotalCount(internalRes?.pagination?.total ?? 0)
            setInternalPerformance(perf ?? null)
          })
        } else if (isMounted && canViewAudit) {
          auditService.getAll({ page: 1, limit: 10, userId }).then((auditRes) => {
            if (isMounted) setRecentActivities(auditRes?.logs ?? [])
          }).catch(() => { if (isMounted) setRecentActivities([]) })
        } else if (isMounted) {
          setRecentActivities([])
        }

        if (isMounted && !canViewAudit && canViewTicketInternes) {
          Promise.all([
            ticketInternalService.getAll(1, 50).catch(() => ({ tickets: [], pagination: { total: 0 } })),
            ticketInternalService.getMyPerformance().catch(() => null),
          ]).then(([internalRes, perf]) => {
            if (!isMounted) return
            setMyInternalTickets(internalRes?.tickets ?? [])
            setInternalTotalCount(internalRes?.pagination?.total ?? 0)
            setInternalPerformance(perf ?? null)
          }).catch(() => {
            if (isMounted) {
              setMyInternalTickets([])
              setInternalTotalCount(0)
              setInternalPerformance(null)
            }
          })
        } else if (isMounted) {
          setMyInternalTickets([])
          setInternalTotalCount(0)
          setInternalPerformance(null)
        }

        // Phase 4 : détails de performance par technicien (département / filiale / global)
        const canViewTeamPerformance =
          hasPermission('reports.view_team') ||
          hasPermission('reports.view_filiale') ||
          hasPermission('reports.view_global')
        if (isMounted && canViewTeamPerformance) {
          const scope: 'department' | 'filiale' | 'global' = hasPermission('reports.view_team')
            ? 'department'
            : hasPermission('reports.view_filiale')
              ? 'filiale'
              : 'global'
          setLoadingPerformanceDetails(true)
          reportsService
            .getWorkloadByAgent('month', scope)
            .then((data) => {
              if (isMounted && Array.isArray(data)) setPerformanceDetails(data)
            })
            .catch(() => {
              if (isMounted) setPerformanceDetails([])
            })
            .finally(() => {
              if (isMounted) setLoadingPerformanceDetails(false)
            })
        } else if (isMounted && user) {
          // Sans droit rapports : afficher au moins la performance de l'utilisateur (tickets normaux)
          setPerformanceDetails([
            {
              user_id: Number(user.id),
              user: {
                id: Number(user.id),
                username: user.username ?? '',
                first_name: user.firstName,
                last_name: user.lastName,
              },
              ticket_count: total,
              resolved_count: resolved,
              in_progress_count: inProgress,
              pending_count: 0,
              open_count: Math.max(0, total - inProgress - resolved),
              delayed_count: overdue,
              average_time: 0,
              total_time: Math.round(totalHours * 60),
              efficiency,
            } as WorkloadByAgentDTO,
          ])
        } else if (isMounted) {
          setPerformanceDetails([])
        }
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error)
        if (isMounted) {
          const isTimeout = error instanceof Error && error.message === 'Délai de chargement dépassé'
          setLoadError(isTimeout ? 'timeout' : 'error')
          if (!isTimeout) {
            toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement du tableau de bord')
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboard()
    return () => { isMounted = false }
  }, [user?.id, hasPermission, authLoading])

  const canViewTicketInternes =
    hasPermission('tickets_internes.view_own') ||
    hasPermission('tickets_internes.view_department') ||
    hasPermission('tickets_internes.view_filiale') ||
    hasPermission('tickets_internes.view_all')

  const internalStatusLabels: Record<string, string> = {
    ouvert: 'Ouvert',
    en_cours: 'En cours',
    en_attente: 'En attente',
    valide: 'Validé',
    cloture: 'Clôturé',
  }

  // Répartition par statut des tickets internes (panier) pour les graphiques
  const internalTicketsByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    myInternalTickets.forEach((t) => {
      const s = t.status || 'autre'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    })
    return [
      { name: 'Ouverts', value: statusCounts['ouvert'] || 0 },
      { name: 'En cours', value: statusCounts['en_cours'] || 0 },
      { name: 'En attente', value: statusCounts['en_attente'] || 0 },
      { name: 'Validés', value: statusCounts['valide'] || 0 },
      { name: 'Clôturés', value: statusCounts['cloture'] || 0 },
    ].filter((row) => row.value > 0)
  }, [myInternalTickets])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mon tableau de bord</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Vue d'ensemble de mes activités</p>
        </div>
        <Link
          to="/app/panier"
          className="btn btn-secondary inline-flex items-center gap-2 shrink-0"
        >
          <ShoppingCart className="w-5 h-5" />
          Mon panier
        </Link>
      </div>

      {canViewTicketInternes && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setDashboardTab('normaux')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              dashboardTab === 'normaux'
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Tickets normaux
          </button>
          <button
            type="button"
            onClick={() => setDashboardTab('internes')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              dashboardTab === 'internes'
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Tickets internes
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement du dashboard...
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardTab === 'normaux' ? (
          <>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Mes tickets</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{myStats.ticketsAssigned}</p>
                </div>
                <Ticket className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">En cours</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{myStats.ticketsInProgress}</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Résolus ce mois</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{myStats.ticketsResolved}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">En retard</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{myStats.ticketsOverdue}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{internalTotalCount}</p>
                </div>
                <Ticket className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ouverts / En cours</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {myInternalTickets.filter((t) => ['ouvert', 'en_cours', 'en_attente', 'valide'].includes(t.status || '')).length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Clôturés</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {myInternalTickets.filter((t) => (t.status || '') === 'cloture').length}
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
                  <p className="text-sm text-gray-600 dark:text-gray-300">Tickets internes</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{myInternalTickets.length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Graphiques — selon l'onglet : tickets normaux ou tickets internes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance sur 4 semaines</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="performance" stroke="#10b981" name="Performance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {dashboardTab === 'normaux' ? (
          <>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tickets résolus par mois</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#6366f1" name="Tickets résolus" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition des tickets par statut</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ticketsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" name="Nombre de tickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tickets internes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Les tickets internes n'ont pas d'évolution par mois sur ce tableau de bord. Consultez la répartition par statut à droite et la liste « Mes tickets internes » ci-dessous.
              </p>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition de mes tickets internes par statut</h2>
              {internalTicketsByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-gray-500 dark:text-gray-400 text-sm">
                  Aucune donnée. Vos tickets internes (tous statuts) apparaîtront ici. Voir <Link to="/app/panier" className="text-primary-600 dark:text-primary-400 hover:underline">Mon panier</Link> pour les tickets en cours.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={internalTicketsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" name="Tickets internes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>

      {/* Détails de performance : équipe si droit rapports, sinon uniquement ses indicateurs */}
      <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Détails de performance</h2>
            <button
              type="button"
              onClick={() => {
                const headers = [
                  'Technicien',
                  'Assignés',
                  'Résolus',
                  'En cours',
                  'En attente',
                  'Ouverts',
                  'En retard',
                  'Efficacité (%)',
                  'Temps moyen (min)',
                  'Temps total (min)',
                ]
                const rows = performanceDetails.map((row) => {
                  const name =
                    row.user?.first_name || row.user?.last_name
                      ? [row.user.first_name, row.user.last_name].filter(Boolean).join(' ')
                      : row.user?.username ?? `#${row.user_id}`
                  const totalMin = row.total_time ?? 0
                  const totalStr = totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` : `${totalMin} min`
                  return [
                    name,
                    row.ticket_count,
                    row.resolved_count,
                    row.in_progress_count,
                    row.pending_count,
                    row.open_count,
                    row.delayed_count,
                    Math.round(row.efficiency ?? 0).toFixed(1),
                    row.resolved_count > 0 && row.average_time != null ? Math.round(row.average_time).toString() : '—',
                    row.total_time != null && row.total_time > 0 ? totalMin.toString() : '—',
                  ]
                })
                const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `details-performance-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              disabled={loadingPerformanceDetails || performanceDetails.length === 0}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          </div>
          {loadingPerformanceDetails ? (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Chargement…
            </div>
          ) : performanceDetails.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucune donnée de performance pour cette période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">Technicien</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">Assignés</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">Résolus</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">En cours</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">En attente</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">Ouverts</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">En retard</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      Efficacité
                      <ArrowDown className="w-4 h-4 opacity-70" />
                    </th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">Temps moyen</th>
                    <th className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">Temps total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...performanceDetails]
                    .sort((a, b) => (b.efficiency ?? 0) - (a.efficiency ?? 0))
                    .map((row) => {
                      const name =
                        row.user?.first_name || row.user?.last_name
                          ? [row.user.first_name, row.user.last_name].filter(Boolean).join(' ')
                          : row.user?.username ?? `#${row.user_id}`
                      const totalMin = row.total_time ?? 0
                      const totalStr =
                        totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` : totalMin > 0 ? `${totalMin} min` : '—'
                      const avgStr =
                        row.resolved_count > 0 && row.average_time != null
                          ? `${Math.round(row.average_time)} min`
                          : '—'
                      const eff = row.efficiency ?? 0
                      return (
                        <tr key={row.user_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{name}</td>
                          <td className="py-2 px-2">{row.ticket_count}</td>
                          <td className="py-2 px-2">{row.resolved_count}</td>
                          <td className="py-2 px-2">{row.in_progress_count}</td>
                          <td className="py-2 px-2">{row.pending_count}</td>
                          <td className="py-2 px-2">{row.open_count}</td>
                          <td className="py-2 px-2">
                            <span className={row.delayed_count > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                              {row.delayed_count}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
                                  style={{ width: `${Math.min(100, eff)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium tabular-nums w-12">{eff.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 tabular-nums">{avgStr}</td>
                          <td className="py-2 px-2 tabular-nums">{totalStr}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Mes tickets (normaux) ou Mes tickets internes (panier) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {dashboardTab === 'internes' ? 'Mes tickets internes' : 'Mes tickets récents'}
          </h2>
          <Link
            to={dashboardTab === 'internes' ? '/app/panier' : '/app/tickets'}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
          >
            {dashboardTab === 'internes' ? 'Mon panier →' : 'Voir tous →'}
          </Link>
        </div>
        <div className="space-y-4">
          {dashboardTab === 'internes'
            ? myInternalTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/app/ticket-internes/${ticket.id}`}
                  className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.code || `#${ticket.id}`}</span>
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                          {internalStatusLabels[ticket.status || ''] || ticket.status}
                        </span>
                        {ticket.priority && (
                          <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                            {priorityLabels[ticket.priority] || ticket.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">{ticket.title || '—'}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Créé le: {formatDate(ticket.created_at)}
                        </div>
                        {(ticket.estimated_time != null || ticket.actual_time != null) && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {ticket.estimated_time != null ? `Estimé: ${Math.round(ticket.estimated_time / 60)}h` : ''}
                            {ticket.actual_time != null ? ` | Réel: ${Math.round(ticket.actual_time / 60)}h` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            : myTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/app/tickets/${ticket.id}`}
                  className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.code || `#${ticket.id}`}</span>
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                          {statusLabels[ticket.status] || ticket.status}
                        </span>
                        <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                          {priorityLabels[ticket.priority || ''] || ticket.priority || '—'}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">{ticket.title}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Créé le: {formatDate(ticket.created_at)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Estimé: {ticket.estimated_time ? `${Math.round(ticket.estimated_time / 60)}h` : '—'}
                          {ticket.actual_time ? ` | Réel: ${Math.round(ticket.actual_time / 60)}h` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* Dernières activités */}
      {(hasPermission('audit.view_all') ||
        hasPermission('audit.view_team') ||
        hasPermission('audit.view_own')) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Dernières activités
            </h2>
            <Link to="/app/audit" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
              Voir les logs d'audit →
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Aucune activité récente.</p>
            ) : (
              recentActivities.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.action === 'create' ? 'Création' : log.action === 'update' ? 'Modification' : log.action === 'delete' ? 'Suppression' : log.action}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 mx-1">·</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {log.entity_type === 'ticket' ? 'Ticket' : log.entity_type === 'user' ? 'Utilisateur' : log.entity_type}
                      {log.entity_id != null ? ` #${log.entity_id}` : ''}
                    </span>
                    {log.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{log.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mes projets */}
      {(hasPermission('projects.view') ||
        hasPermission('projects.view_all') ||
        hasPermission('projects.view_team') ||
        hasPermission('projects.view_own')) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Mes projets
            </h2>
            <Link to="/app/projects" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
              Voir tous →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Projets</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{myProjectStats.total}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Actifs</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{myProjectStats.active}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Tâches assignées</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{myProjectStats.myTasksCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Heures consommées</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{myProjectStats.consumedHours} h</p>
            </div>
          </div>
          {myProjects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucun projet.</p>
          ) : (
            <>
              {/* Graphiques projets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Répartition par statut</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    {(() => {
                      const statusData = [
                        { name: 'Actifs', value: myProjects.filter((p) => p.status === 'active').length, color: '#10b981' },
                        { name: 'Clôturés', value: myProjects.filter((p) => p.status === 'completed').length, color: '#3b82f6' },
                        { name: 'Annulés', value: myProjects.filter((p) => p.status === 'cancelled').length, color: '#6b7280' },
                      ].filter((d) => d.value > 0)
                      if (statusData.length === 0) return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">Aucune donnée</div>
                      return (
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" label={({ name, percent }) => (percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}>
                            {statusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v} projet${v > 1 ? 's' : ''}`} />
                        </PieChart>
                      )
                    })()}
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temps consommé par projet (h)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[...myProjects]
                        .sort((a, b) => (b.consumed_time || 0) - (a.consumed_time || 0))
                        .slice(0, 5)
                        .map((p) => ({ name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name, heures: Math.round(((p.consumed_time || 0) / 60) * 10) / 10 }))}
                      layout="vertical"
                      margin={{ left: 4, right: 8 }}
                    >
                      <XAxis type="number" unit=" h" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${v} h`} />
                      <Bar dataKey="heures" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
              {myProjects.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to={`/app/projects/${p.id}`}
                  className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                      <span
                        className={`ml-2 badge text-xs ${
                          p.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                            : p.status === 'completed'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {PROJECT_STATUS[p.status] || p.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round((p.consumed_time || 0) / 60)} h
                      {p.total_budget_time != null ? ` / ${Math.round(p.total_budget_time / 60)} h` : ''}
                    </span>
                  </div>
                </Link>
              ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Indicateurs rapides (tickets normaux uniquement) */}
      {dashboardTab === 'normaux' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Heures totales ce mois</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myStats.totalHours}h</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Efficacité</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myStats.efficiency}%</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Retards à justifier</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myStats.ticketsOverdue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance sur les tickets internes (assignés à moi) — visible par tout utilisateur avec droit tickets_internes */}
      {dashboardTab === 'internes' && canViewTicketInternes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Temps total passé (tickets internes)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {internalPerformance != null
                    ? `${Math.round((internalPerformance.total_time_spent / 60) * 10) / 10}h`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Efficacité (tickets internes)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {internalPerformance != null
                    ? `${Math.round(internalPerformance.efficiency)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tickets internes résolus</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {internalPerformance != null ? internalPerformance.resolved : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard
