import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Clock, AlertCircle, CheckCircle, TrendingUp, Calendar, Loader2, FolderKanban } from 'lucide-react'
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
import { timesheetService } from '../services/timesheetService'
import { delayService } from '../services/delayService'
import { projectService, ProjectDTO, ProjectTaskDTO } from '../services/projectService'
import { useAuth } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'

const PROJECT_STATUS: Record<string, string> = { active: 'Actif', completed: 'Clôturé', cancelled: 'Annulé' }

const EmployeeDashboard = () => {
  const toast = useToastContext()
  const { user, hasPermission } = useAuth()
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
  const [weeklyHours, setWeeklyHours] = useState<Array<{ name: string; heures: number }>>([])
  const [performanceData, setPerformanceData] = useState<Array<{ name: string; performance: number }>>([])
  const [monthlyPerformance, setMonthlyPerformance] = useState<Array<{ month: string; tickets: number }>>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<Array<{ name: string; value: number }>>([])

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

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const userId = Number(user.id)
        const [
          allTicketsSummary,
          inProgressTickets,
          resolvedTicketsSummary,
          recentTickets,
          timeEntries,
          delays,
          closedTickets,
          allTicketsData,
        ] = await Promise.all([
          ticketService.getMyTickets(1, 1, 'all'),
          ticketService.getMyTickets(1, 1, 'en_cours'),
          ticketService.getMyTickets(1, 1, 'cloture'),
          ticketService.getMyTickets(1, 5, 'all'),
          timesheetService.getTimeEntriesByUserId(userId),
          delayService.getByUserId(userId),
          ticketService.getMyTickets(1, 200, 'cloture'),
          ticketService.getMyTickets(1, 200, 'all'),
        ])

        const total = allTicketsSummary.pagination.total ?? 0
        const inProgress = inProgressTickets.pagination.total ?? 0
        const resolved = resolvedTicketsSummary.pagination.total ?? 0
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

        const recent = Array.isArray(recentTickets.tickets) ? recentTickets.tickets : []
        setMyTickets(recent)

        const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekData = Array.from({ length: 7 }).map((_, i) => {
          const date = new Date(weekStart)
          date.setDate(weekStart.getDate() + i)
          const dateKey = date.toISOString().split('T')[0]
          const minutes = safeEntries.reduce((sum, entry) => {
            const entryKey = new Date(entry.date).toISOString().split('T')[0]
            if (entryKey === dateKey) {
              return sum + (entry.time_spent || 0)
            }
            return sum
          }, 0)
          return { name: weekDays[i], heures: Math.round((minutes / 60) * 10) / 10 }
        })

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

        setWeeklyHours(weekData.slice(1, 6))
        setPerformanceData(performance)

        // Performance mensuelle (tickets résolus)
        const closedTicketList = closedTickets.tickets || []
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

        // Répartition des tickets par statut
        const allTicketsList = allTicketsData.tickets || []
        const statusCounts: Record<string, number> = {}
        allTicketsList.forEach((ticket) => {
          const status = ticket.status || 'autre'
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        setTicketsByStatus([
          { name: 'Ouverts', value: statusCounts['ouvert'] || 0 },
          { name: 'En cours', value: statusCounts['en_cours'] || 0 },
          { name: 'En attente', value: statusCounts['en_attente'] || 0 },
          { name: 'Clôturés', value: statusCounts['cloture'] || 0 },
        ])
        setMyStats({
          ticketsAssigned: total,
          ticketsInProgress: inProgress,
          ticketsResolved: resolved,
          ticketsOverdue: overdue,
          totalHours,
          efficiency,
        })

        // Projets (si droit)
        const canViewProjects =
          hasPermission('projects.view') ||
          hasPermission('projects.view_all') ||
          hasPermission('projects.view_team') ||
          hasPermission('projects.view_own')
        if (canViewProjects) {
          try {
            const allProjects = await projectService.getAll()
            const projects = Array.isArray(allProjects) ? allProjects : []
            const top5 = projects.slice(0, 5)
            const tasksArrays = await Promise.all(
              top5.map((p) => projectService.getTasks(p.id).catch(() => [] as ProjectTaskDTO[]))
            )
            let myTasksCount = 0
            tasksArrays.forEach((tasks) => {
              const list = Array.isArray(tasks) ? tasks : []
              myTasksCount += list.filter(
                (t) =>
                  (t.assignees || []).some((a) => Number(a.user_id) === userId) || Number(t.assigned_to_id) === userId
              ).length
            })
            const consumedHours = Math.round(projects.reduce((s, p) => s + (p.consumed_time || 0), 0) / 60)
            setMyProjects(projects)
            setMyProjectStats({
              total: projects.length,
              active: projects.filter((p) => p.status === 'active').length,
              myTasksCount,
              consumedHours,
            })
          } catch (e) {
            console.error('Erreur chargement projets:', e)
            setMyProjects([])
            setMyProjectStats({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
          }
        } else {
          setMyProjects([])
          setMyProjectStats({ total: 0, active: 0, myTasksCount: 0, consumedHours: 0 })
        }
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error)
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement du tableau de bord')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [user?.id, hasPermission])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mon tableau de bord</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Vue d'ensemble de mes activités</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement du dashboard...
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Heures travaillées cette semaine</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="heures" fill="#3b82f6" name="Heures" />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
      </div>

      {/* Mes tickets */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mes tickets récents</h2>
          <Link to="/app/tickets" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
            Voir tous →
          </Link>
        </div>
        <div className="space-y-4">
          {myTickets.map((ticket) => (
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

      {/* Indicateurs rapides */}
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
    </div>
  )
}

export default EmployeeDashboard
