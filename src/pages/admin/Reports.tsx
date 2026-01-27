import { useEffect, useMemo, useState } from 'react'
import { Download, Clock, Ticket, AlertCircle, Users, HardDrive, FolderKanban } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import {
  reportsService,
  TicketCountReportDTO,
  TicketTypeDistributionDTO,
  AverageResolutionTimeDTO,
  WorkloadByAgentDTO,
  SLAComplianceReportDTO,
  AssetReportDTO,
  KnowledgeReportDTO,
  DashboardDTO,
} from '../../services/reportsService'
import { slaService, SLAViolationDTO } from '../../services/slaService'
import { ticketService, TicketDTO } from '../../services/ticketService'
import { projectService, ProjectDTO } from '../../services/projectService'
import { Link } from 'react-router-dom'

export interface ReportsProps {
  /** Titre affiché en en-tête (défaut: "Dashboard") */
  title?: string
  /** Sous-titre / description (défaut: "Vue d'ensemble de votre système Kronos") */
  subtitle?: string
}

const Reports = ({ title = 'Dashboard', subtitle = "Vue d'ensemble de votre système Kronos" }: ReportsProps) => {
  const { hasPermission } = useAuth()
  const [selectedReport, setSelectedReport] = useState('overview')
  const [dateRange, setDateRange] = useState('month')
  const [loading, setLoading] = useState(false)
  const [ticketCountReport, setTicketCountReport] = useState<TicketCountReportDTO | null>(null)
  const [ticketDistribution, setTicketDistribution] = useState<TicketTypeDistributionDTO | null>(null)
  const [averageResolution, setAverageResolution] = useState<AverageResolutionTimeDTO | null>(null)
  const [workloadByAgent, setWorkloadByAgent] = useState<WorkloadByAgentDTO[]>([])
  const [slaCompliance, setSlaCompliance] = useState<SLAComplianceReportDTO | null>(null)
  const [assetSummary, setAssetSummary] = useState<AssetReportDTO | null>(null)
  const [knowledgeSummary, setKnowledgeSummary] = useState<KnowledgeReportDTO | null>(null)
  const [dashboard, setDashboard] = useState<DashboardDTO | null>(null)
  const [slaViolations, setSlaViolations] = useState<SLAViolationDTO[]>([])
  const [loadingViolations, setLoadingViolations] = useState(false)
  const [violationFilterCategory, setViolationFilterCategory] = useState<string>('all')
  const [recentTickets, setRecentTickets] = useState<TicketDTO[]>([])
  const [loadingRecentTickets, setLoadingRecentTickets] = useState(false)
  const [projectList, setProjectList] = useState<ProjectDTO[]>([])
  const [projectMembersList, setProjectMembersList] = useState<{ projectId: number; projectName: string; members: string[] }[]>([])
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false)

  const canViewProjects =
    hasPermission('projects.view') ||
    hasPermission('projects.view_all') ||
    hasPermission('projects.view_team') ||
    hasPermission('projects.view_own')

  useEffect(() => {
    let isMounted = true
    const loadReports = async () => {
      // Vérifier les permissions avant de charger les données
      if (!hasPermission('reports.view_global') && !hasPermission('reports.view_team')) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [
          ticketCount,
          distribution,
          avgResolution,
          workload,
          sla,
          assets,
          knowledge,
          dashboardData,
          projectsData = [],
        ] = await Promise.all([
          // Pour le dashboard, on utilise "year" pour avoir tous les tickets dans le graphe
          reportsService.getTicketCountReport(selectedReport === 'overview' ? 'year' : dateRange),
          reportsService.getTicketTypeDistribution(),
          reportsService.getAverageResolutionTime(),
          reportsService.getWorkloadByAgent(dateRange),
          reportsService.getSlaCompliance(dateRange),
          reportsService.getAssetSummary(dateRange),
          reportsService.getKnowledgeSummary(dateRange),
          reportsService.getDashboard(dateRange),
          canViewProjects ? projectService.getAll().then((r) => (Array.isArray(r) ? r : [])).catch(() => []) : Promise.resolve([]),
        ])

        if (!isMounted) return
        console.log('Ticket Distribution Data:', distribution)
        console.log('Ticket Count Report Data:', ticketCount)
        console.log('Breakdown:', ticketCount?.breakdown)
        console.log('Total tickets:', ticketCount?.count)
        console.log('Period:', ticketCount?.period)
        console.log('Date range selected:', dateRange)
        setTicketCountReport(ticketCount)
        setTicketDistribution(distribution)
        console.log('Average Resolution Time:', avgResolution)
        console.log('Average time value:', avgResolution?.average_time, 'minutes')
        setAverageResolution(avgResolution)
        setWorkloadByAgent(workload)
        setSlaCompliance(sla)
        setAssetSummary(assets)
        setKnowledgeSummary(knowledge)
        setDashboard(dashboardData)
        setProjectList(Array.isArray(projectsData) ? projectsData : [])
      } catch (error) {
        console.error('Erreur chargement rapports:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const loadViolations = async () => {
      if (selectedReport !== 'sla') return
      setLoadingViolations(true)
      try {
        const violations = await slaService.getAllViolations({
          period: dateRange,
          category: violationFilterCategory !== 'all' ? violationFilterCategory : undefined,
        })
        if (isMounted) {
          setSlaViolations(Array.isArray(violations) ? violations : [])
        }
      } catch (error) {
        console.error('Erreur chargement violations:', error)
        if (isMounted) {
          setSlaViolations([])
        }
      } finally {
        if (isMounted) {
          setLoadingViolations(false)
        }
      }
    }

    const loadRecentTickets = async () => {
      setLoadingRecentTickets(true)
      try {
        const response = await ticketService.getAll(1, 5)
        if (isMounted) {
          setRecentTickets(response.tickets || [])
        }
      } catch (error) {
        console.error('Erreur chargement tickets récents:', error)
        if (isMounted) {
          setRecentTickets([])
        }
      } finally {
        if (isMounted) {
          setLoadingRecentTickets(false)
        }
      }
    }

    loadReports()
    loadRecentTickets()
    if (selectedReport === 'sla') {
      loadViolations()
    }
    return () => {
      isMounted = false
    }
  }, [dateRange, selectedReport, violationFilterCategory, canViewProjects])

  // Charger les membres des projets quand l'onglet Projets est sélectionné
  useEffect(() => {
    if (selectedReport !== 'projets' || projectList.length === 0 || !canViewProjects) {
      setProjectMembersList([])
      return
    }
    let isMounted = true
    setLoadingProjectMembers(true)
    const top10 = projectList.slice(0, 10)
    Promise.all(top10.map((p) => projectService.getMembers(p.id).catch(() => [])))
      .then((membersArrays) => {
        if (!isMounted) return
        setProjectMembersList(
          top10.map((p, i) => ({
            projectId: p.id,
            projectName: p.name,
            members: (membersArrays[i] || [])
              .map((m) => m.user?.username || `#${m.user_id}`)
              .filter(Boolean),
          }))
        )
      })
      .catch(() => { if (isMounted) setProjectMembersList([]) })
      .finally(() => { if (isMounted) setLoadingProjectMembers(false) })
    return () => { isMounted = false }
  }, [selectedReport, projectList, canViewProjects])

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission('reports.view_global') && !hasPermission('reports.view_team')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les rapports" />
  }

  const ticketTrend = useMemo(() => {
    if (!ticketCountReport?.breakdown || ticketCountReport.breakdown.length === 0) {
      console.log('No breakdown data available', ticketCountReport)
      return []
    }
    console.log('Processing breakdown:', ticketCountReport.breakdown)
    const isMonthView = dateRange === 'quarter' || dateRange === 'year'
    return ticketCountReport.breakdown.map((item) => {
      // item.date peut être une string ISO (depuis JSON) ou déjà un objet Date
      const dateStr = typeof item.date === 'string' ? item.date : (item.date != null ? String(item.date) : '')
      const date = new Date(dateStr)
      const label = Number.isNaN(date.getTime())
        ? dateStr
        : date.toLocaleDateString('fr-FR', isMonthView ? { month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short' })
      return {
        name: label,
        créés: item.created ?? item.count,
        clôturés: item.closed ?? 0,
        'en cours': item.in_progress ?? 0,
        'en attente': item.pending ?? 0,
        ouverts: item.open ?? 0,
      }
    })
  }, [ticketCountReport, dateRange])

  const ticketByCategory = useMemo(() => {
    if (!ticketDistribution) {
      return []
    }
    const categories = [
      { name: 'Incidents', value: ticketDistribution.incidents ?? 0, color: '#ef4444' },
      { name: 'Demandes', value: ticketDistribution.demandes ?? 0, color: '#3b82f6' },
      { name: 'Changements', value: ticketDistribution.changements ?? 0, color: '#10b981' },
      { name: 'Développements', value: ticketDistribution.developpements ?? 0, color: '#f59e0b' },
      { name: 'Assistance', value: ticketDistribution.assistance ?? 0, color: '#8b5cf6' },
      { name: 'Support', value: ticketDistribution.support ?? 0, color: '#06b6d4' },
    ]
    // Filtrer les catégories avec des valeurs > 0
    const filtered = categories.filter(cat => cat.value > 0)
    
    // Calculer le total pour vérifier
    const total = filtered.reduce((sum, cat) => sum + cat.value, 0)
    console.log('Ticket by category - Total:', total, 'Categories:', filtered.map(c => `${c.name}: ${c.value}`).join(', '))
    
    return filtered
  }, [ticketDistribution])

  const slaTotalTickets = slaCompliance?.total_tickets ?? 0
  const slaViolationsCount = slaCompliance?.total_violations ?? 0
  const slaOnTime = Math.max(slaTotalTickets - slaViolationsCount, 0)
  const slaPerformance = [
    { name: 'Respecté', value: slaOnTime, color: '#10b981' },
    { name: 'En risque', value: 0, color: '#f59e0b' },
    { name: 'Dépassé', value: slaViolationsCount, color: '#ef4444' },
  ]

  const [performanceSortBy, setPerformanceSortBy] = useState<'name' | 'tickets' | 'resolved' | 'efficiency' | 'avgTime' | 'delayed'>('efficiency')
  const [performanceSortOrder, setPerformanceSortOrder] = useState<'asc' | 'desc'>('desc')
  const [performancePage, setPerformancePage] = useState(1)
  const performancePerPage = 10

  const technicianPerformance = useMemo(() => {
    let filtered = workloadByAgent.map((agent) => {
      const name = agent.user
        ? `${agent.user.first_name ?? ''} ${agent.user.last_name ?? ''}`.trim() || agent.user.username
        : `Utilisateur #${agent.user_id}`
      const efficiency = agent.efficiency || (agent.ticket_count > 0 ? Math.round((agent.resolved_count / agent.ticket_count) * 100) : 0)
      return {
        name,
        userId: agent.user_id,
        tickets: agent.ticket_count,
        resolved: agent.resolved_count,
        inProgress: agent.in_progress_count || 0,
        pending: agent.pending_count || 0,
        open: agent.open_count || 0,
        delayed: agent.delayed_count || 0,
        efficiency,
        avgTime: Math.round(agent.average_time || 0),
        totalTime: agent.total_time || 0,
      }
    })

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0
      switch (performanceSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'tickets':
          comparison = a.tickets - b.tickets
          break
        case 'resolved':
          comparison = a.resolved - b.resolved
          break
        case 'efficiency':
          comparison = a.efficiency - b.efficiency
          break
        case 'avgTime':
          comparison = a.avgTime - b.avgTime
          break
        case 'delayed':
          comparison = a.delayed - b.delayed
          break
      }
      return performanceSortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [workloadByAgent, performanceSortBy, performanceSortOrder])

  const performancePaginated = useMemo(() => {
    const start = (performancePage - 1) * performancePerPage
    return technicianPerformance.slice(start, start + performancePerPage)
  }, [technicianPerformance, performancePage])

  const performanceTotalPages = Math.ceil(technicianPerformance.length / performancePerPage)

  // Données pour les graphiques
  const performanceChartData = useMemo(() => {
    return technicianPerformance.slice(0, 10).map((tech) => ({
      name: tech.name.length > 15 ? tech.name.substring(0, 15) + '...' : tech.name,
      tickets: tech.tickets,
      resolved: tech.resolved,
      efficiency: tech.efficiency,
      delayed: tech.delayed,
    }))
  }, [technicianPerformance])

  const projectStats = useMemo(() => {
    const list = projectList || []
    const active = list.filter((p) => p.status === 'active').length
    const completed = list.filter((p) => p.status === 'completed').length
    const cancelled = list.filter((p) => p.status === 'cancelled').length
    const overBudget = list.filter(
      (p) => p.total_budget_time != null && p.total_budget_time > 0 && (p.consumed_time || 0) > p.total_budget_time
    ).length
    const totalBudgetH = list.reduce((s, p) => s + (p.total_budget_time || 0) / 60, 0)
    const totalConsumedH = list.reduce((s, p) => s + (p.consumed_time || 0) / 60, 0)
    return { total: list.length, active, completed, cancelled, overBudget, totalBudgetH, totalConsumedH }
  }, [projectList])

  const projectStatusPieData = useMemo(() => {
    const d = [
      { name: 'Actifs', value: projectStats.active, color: '#10b981' },
      { name: 'Clôturés', value: projectStats.completed, color: '#3b82f6' },
      { name: 'Annulés', value: projectStats.cancelled, color: '#6b7280' },
    ]
    return d.filter((x) => x.value > 0)
  }, [projectStats.active, projectStats.completed, projectStats.cancelled])

  const projectTopByConsumed = useMemo(() => {
    return [...(projectList || [])]
      .sort((a, b) => (b.consumed_time || 0) - (a.consumed_time || 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
        heures: Math.round(((p.consumed_time || 0) / 60) * 10) / 10,
      }))
  }, [projectList])

  const kpis = [
    {
      name: 'Tickets créés',
      value: ticketCountReport ? `${ticketCountReport.count}` : '—',
      icon: Ticket,
      color: 'text-blue-600',
    },
    {
      name: 'Utilisateurs actifs',
      value: dashboard?.users ? `${dashboard.users.active}` : '—',
      icon: Users,
      color: 'text-primary-600',
    },
    {
      name: 'Actifs IT',
      value: dashboard?.assets ? `${dashboard.assets.total}` : '—',
      icon: HardDrive,
      color: 'text-green-600',
    },
    ...(canViewProjects
      ? [
          {
            name: 'Projets actifs',
            value: `${projectStats.active}`,
            icon: FolderKanban,
            color: 'text-emerald-600',
          },
        ]
      : []),
    {
      name: 'Heures travaillées',
      value: dashboard?.worked_hours ? `${Math.round(dashboard.worked_hours.total_hours).toLocaleString('fr-FR')}h` : '—',
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      name: 'Temps moyen de résolution',
      value: averageResolution ? `${averageResolution.average_time} min` : '—',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      name: 'Conformité SLA',
      value: slaCompliance ? `${slaCompliance.overall_compliance.toFixed(0)}%` : '—',
      icon: AlertCircle,
      color: 'text-green-600',
    },
  ]

  const assetStatusLabels: Record<string, string> = {
    available: 'Disponible',
    in_use: 'En usage',
    maintenance: 'Maintenance',
    retired: 'Retiré',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <button className="btn btn-primary flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      {/* Sélection du type de rapport */}
      <div className="card">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedReport('overview')}
            className={`btn ${selectedReport === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setSelectedReport('tickets')}
            className={`btn ${selectedReport === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Tickets
          </button>
          <button
            onClick={() => setSelectedReport('performance')}
            className={`btn ${selectedReport === 'performance' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Performance
          </button>
          <button
            onClick={() => setSelectedReport('sla')}
            className={`btn ${selectedReport === 'sla' ? 'btn-primary' : 'btn-secondary'}`}
          >
            SLA
          </button>
          {canViewProjects && (
            <button
              onClick={() => setSelectedReport('projets')}
              className={`btn ${selectedReport === 'projets' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Projets
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.name} className="card">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-6 h-6 ${kpi.color}`} />
                {loading ? (
                  <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : null}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{kpi.name}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
            </div>
          )
        })}
      </div>

      {/* Graphiques principaux */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Évolution des tickets</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : ticketTrend.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Aucune donnée disponible</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                      {ticketCountReport 
                        ? `Aucun ticket trouvé pour cette période (${dateRange === 'week' ? 'cette semaine' : dateRange === 'month' ? 'ce mois' : dateRange === 'quarter' ? 'ce trimestre' : 'cette année'})`
                        : 'Chargement des données...'}
                    </p>
                    {ticketCountReport && ticketCountReport.count > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Total: {ticketCountReport.count} ticket(s) trouvé(s), mais aucune répartition par date disponible.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ticketTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value} ticket${value > 1 ? 's' : ''}`} />
                    <Legend />
                    <Line type="monotone" dataKey="créés" stroke="#3b82f6" name="Créés" strokeWidth={2} />
                    <Line type="monotone" dataKey="clôturés" stroke="#10b981" name="Clôturés" strokeWidth={2} />
                    <Line type="monotone" dataKey="en cours" stroke="#f59e0b" name="En cours" strokeWidth={2} />
                    <Line type="monotone" dataKey="en attente" stroke="#8b5cf6" name="En attente" strokeWidth={2} />
                    <Line type="monotone" dataKey="ouverts" stroke="#06b6d4" name="Ouverts" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition par catégorie</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : ticketByCategory.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Aucune donnée disponible</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {ticketDistribution ? 'Aucun ticket trouvé pour cette période' : 'Chargement des données...'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ticketByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ticketByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => {
                          const total = ticketByCategory.reduce((sum, cat) => sum + cat.value, 0)
                          const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                          return `${value} ticket${value > 1 ? 's' : ''} (${percent}%)`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Total: {ticketByCategory.reduce((sum, cat) => sum + cat.value, 0)} ticket(s)
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tickets récents */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tickets récents</h2>
            {loadingRecentTickets ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                <p>Aucun ticket récent.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => {
                  const statusLabels: Record<string, string> = {
                    ouvert: 'Ouvert',
                    en_cours: 'En cours',
                    en_attente: 'En attente',
                    cloture: 'Clôturé',
                    open: 'Ouvert',
                    in_progress: 'En cours',
                    pending: 'En attente',
                    closed: 'Clôturé',
                  }
                  const priorityLabels: Record<string, string> = {
                    faible: 'Faible',
                    normale: 'Normale',
                    moyenne: 'Moyenne',
                    elevee: 'Élevée',
                    critique: 'Critique',
                    low: 'Faible',
                    normal: 'Normale',
                    medium: 'Moyenne',
                    high: 'Élevée',
                    critical: 'Critique',
                  }
                  const statusColor: Record<string, string> = {
                    ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                    en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                    en_attente: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
                    cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
                    open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                    in_progress: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                    pending: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
                    closed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
                  }
                  return (
                    <Link
                      key={ticket.id}
                      to={`/admin/tickets/${ticket.id}`}
                      className="block border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.code || `#${ticket.id}`}</span>
                            <span className={`badge ${statusColor[ticket.status.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                              {statusLabels[ticket.status.toLowerCase()] || ticket.status}
                            </span>
                            {ticket.priority && (
                              <span className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                {priorityLabels[ticket.priority.toLowerCase()] || ticket.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{ticket.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ticket.assigned_to
                              ? `Assigné à: ${ticket.assigned_to.first_name || ''} ${ticket.assigned_to.last_name || ''}`.trim() || ticket.assigned_to.username
                              : 'Non assigné'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rapport des actifs</h2>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total actifs</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assetSummary ? assetSummary.total : '—'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(assetSummary?.by_status ?? {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{assetStatusLabels[status] ?? status}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Base de connaissances</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300">Articles publiés</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {knowledgeSummary ? knowledgeSummary.published : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300">Brouillons</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {knowledgeSummary ? knowledgeSummary.draft : '—'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(knowledgeSummary?.by_category ?? {}).slice(0, 4).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>{category}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                ))}
                {Object.keys(knowledgeSummary?.by_category ?? {}).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aucun article pour cette période.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'tickets' && (
        <div className="space-y-6">
          {/* Statistiques par statut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition par statut</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : dashboard?.tickets.by_status ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(dashboard.tickets.by_status)
                        .filter(([_, count]) => count > 0)
                        .map(([status, count]) => {
                          const statusLabels: Record<string, { name: string; color: string }> = {
                            ouvert: { name: 'Ouvert', color: '#3b82f6' },
                            en_cours: { name: 'En cours', color: '#f59e0b' },
                            en_attente: { name: 'En attente', color: '#8b5cf6' },
                            cloture: { name: 'Clôturé', color: '#10b981' },
                            open: { name: 'Ouvert', color: '#3b82f6' },
                            in_progress: { name: 'En cours', color: '#f59e0b' },
                            pending: { name: 'En attente', color: '#8b5cf6' },
                            closed: { name: 'Clôturé', color: '#10b981' },
                          }
                          const label = statusLabels[status.toLowerCase()] || { name: status, color: '#6b7280' }
                          return { name: label.name, value: count, color: label.color }
                        })}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(dashboard.tickets.by_status)
                        .filter(([_, count]) => count > 0)
                        .map(([status, _], index) => {
                          const statusColors: Record<string, string> = {
                            ouvert: '#3b82f6',
                            en_cours: '#f59e0b',
                            en_attente: '#8b5cf6',
                            cloture: '#10b981',
                            open: '#3b82f6',
                            in_progress: '#f59e0b',
                            pending: '#8b5cf6',
                            closed: '#10b981',
                          }
                          return (
                            <Cell key={`cell-${index}`} fill={statusColors[status.toLowerCase()] || '#6b7280'} />
                          )
                        })}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} ticket${value > 1 ? 's' : ''}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition par priorité</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : dashboard?.tickets.by_priority ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(dashboard.tickets.by_priority)
                        .filter(([_, count]) => count > 0)
                        .map(([priority, count]) => {
                          const priorityLabels: Record<string, { name: string; color: string }> = {
                            faible: { name: 'Faible', color: '#10b981' },
                            normale: { name: 'Normale', color: '#3b82f6' },
                            elevee: { name: 'Élevée', color: '#f59e0b' },
                            critique: { name: 'Critique', color: '#ef4444' },
                            low: { name: 'Faible', color: '#10b981' },
                            medium: { name: 'Moyenne', color: '#3b82f6' },
                            normal: { name: 'Normale', color: '#3b82f6' },
                            high: { name: 'Élevée', color: '#f59e0b' },
                            critical: { name: 'Critique', color: '#ef4444' },
                          }
                          const label = priorityLabels[priority.toLowerCase()] || { name: priority, color: '#6b7280' }
                          return { name: label.name, value: count, color: label.color }
                        })}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(dashboard.tickets.by_priority)
                        .filter(([_, count]) => count > 0)
                        .map(([priority, _], index) => {
                          const priorityColors: Record<string, string> = {
                            faible: '#10b981',
                            normale: '#3b82f6',
                            elevee: '#f59e0b',
                            critique: '#ef4444',
                            low: '#10b981',
                            medium: '#3b82f6',
                            normal: '#3b82f6',
                            high: '#f59e0b',
                            critical: '#ef4444',
                          }
                          return (
                            <Cell key={`cell-${index}`} fill={priorityColors[priority.toLowerCase()] || '#6b7280'} />
                          )
                        })}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} ticket${value > 1 ? 's' : ''}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistiques par statut</h2>
              <div className="space-y-3">
                {dashboard?.tickets.by_status ? (
                  Object.entries(dashboard.tickets.by_status)
                    .filter(([_, count]) => count > 0)
                    .map(([status, count]) => {
                      const statusLabels: Record<string, string> = {
                        ouvert: 'Ouvert',
                        en_cours: 'En cours',
                        en_attente: 'En attente',
                        cloture: 'Clôturé',
                        open: 'Ouvert',
                        in_progress: 'En cours',
                        pending: 'En attente',
                        closed: 'Clôturé',
                      }
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {statusLabels[status.toLowerCase()] || status}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                        </div>
                      )
                    })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistiques par priorité</h2>
              <div className="space-y-3">
                {dashboard?.tickets.by_priority ? (
                  Object.entries(dashboard.tickets.by_priority)
                    .filter(([_, count]) => count > 0)
                    .map(([priority, count]) => {
                      const priorityLabels: Record<string, string> = {
                        faible: 'Faible',
                        normale: 'Normale',
                        elevee: 'Élevée',
                        critique: 'Critique',
                        low: 'Faible',
                        medium: 'Moyenne',
                        normal: 'Normale',
                        high: 'Élevée',
                        critical: 'Critique',
                      }
                      return (
                        <div key={priority} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {priorityLabels[priority.toLowerCase()] || priority}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                        </div>
                      )
                    })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Résumé</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total tickets</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {dashboard?.tickets.total ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tickets ouverts</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {dashboard?.tickets.open ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tickets clôturés</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {dashboard?.tickets.closed ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tickets en retard</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {dashboard?.tickets.delayed ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Temps moyen de résolution</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {averageResolution ? `${averageResolution.average_time} min` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Évolution des tickets */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Évolution des tickets</h2>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
              </div>
            ) : ticketTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Aucune donnée disponible</p>
                  {ticketCountReport && ticketCountReport.count > 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Total: {ticketCountReport.count} ticket(s) trouvé(s), mais aucune répartition par date disponible.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ticketTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="créés" stroke="#3b82f6" name="Créés" strokeWidth={2} />
                  <Line type="monotone" dataKey="clôturés" stroke="#10b981" name="Clôturés" strokeWidth={2} />
                  <Line type="monotone" dataKey="en cours" stroke="#f59e0b" name="En cours" strokeWidth={2} />
                  <Line type="monotone" dataKey="en attente" stroke="#8b5cf6" name="En attente" strokeWidth={2} />
                  <Line type="monotone" dataKey="ouverts" stroke="#06b6d4" name="Ouverts" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {selectedReport === 'performance' && (
        <div className="space-y-6">
          {/* Graphiques de comparaison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique en barres : Tickets par technicien */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tickets assignés vs résolus</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : performanceChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="#3b82f6" name="Assignés" />
                    <Bar dataKey="resolved" fill="#10b981" name="Résolus" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Graphique en barres : Efficacité */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Efficacité des techniciens</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : performanceChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#f59e0b" name="Efficacité (%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tableau détaillé avec filtres et tri */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Détails de performance</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const csv = [
                      ['Technicien', 'Tickets assignés', 'Résolus', 'En cours', 'En attente', 'Ouverts', 'En retard', 'Efficacité (%)', 'Temps moyen (min)', 'Temps total (min)'],
                      ...technicianPerformance.map((tech) => [
                        tech.name,
                        tech.tickets,
                        tech.resolved,
                        tech.inProgress,
                        tech.pending,
                        tech.open,
                        tech.delayed,
                        tech.efficiency.toFixed(1),
                        tech.avgTime,
                        tech.totalTime,
                      ]),
                    ]
                      .map((row) => row.join(','))
                      .join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `performance_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
                    link.click()
                  }}
                  className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('name')
                        setPerformanceSortOrder(performanceSortBy === 'name' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Technicien</span>
                        {performanceSortBy === 'name' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('tickets')
                        setPerformanceSortOrder(performanceSortBy === 'tickets' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Assignés</span>
                        {performanceSortBy === 'tickets' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('resolved')
                        setPerformanceSortOrder(performanceSortBy === 'resolved' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Résolus</span>
                        {performanceSortBy === 'resolved' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      En cours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      En attente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ouverts
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('delayed')
                        setPerformanceSortOrder(performanceSortBy === 'delayed' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>En retard</span>
                        {performanceSortBy === 'delayed' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('efficiency')
                        setPerformanceSortOrder(performanceSortBy === 'efficiency' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Efficacité</span>
                        {performanceSortBy === 'efficiency' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setPerformanceSortBy('avgTime')
                        setPerformanceSortOrder(performanceSortBy === 'avgTime' && performanceSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Temps moyen</span>
                        {performanceSortBy === 'avgTime' && (
                          <span>{performanceSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Temps total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Chargement...
                      </td>
                    </tr>
                  ) : performancePaginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Aucun technicien trouvé
                      </td>
                    </tr>
                  ) : (
                    performancePaginated.map((tech) => (
                      <tr key={tech.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tech.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{tech.tickets}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{tech.resolved}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{tech.inProgress}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{tech.pending}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{tech.open}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-red-600 dark:text-red-400">{tech.delayed}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  tech.efficiency >= 80
                                    ? 'bg-green-600'
                                    : tech.efficiency >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(tech.efficiency, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{tech.efficiency.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {tech.avgTime > 0 ? `${tech.avgTime} min` : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {tech.totalTime > 0
                              ? tech.totalTime < 60
                                ? `${tech.totalTime} min`
                                : `${Math.floor(tech.totalTime / 60)}h ${tech.totalTime % 60}min`
                              : '—'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {performanceTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Affichage de {(performancePage - 1) * performancePerPage + 1} à{' '}
                  {Math.min(performancePage * performancePerPage, technicianPerformance.length)} sur{' '}
                  {technicianPerformance.length} technicien(s)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPerformancePage((p) => Math.max(1, p - 1))}
                    disabled={performancePage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {performancePage} sur {performanceTotalPages}
                  </span>
                  <button
                    onClick={() => setPerformancePage((p) => Math.min(performanceTotalPages, p + 1))}
                    disabled={performancePage === performanceTotalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReport === 'sla' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance SLA</h2>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
              </div>
            ) : !slaCompliance || slaTotalTickets === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">Aucune donnée SLA pour le moment</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {!slaCompliance
                    ? 'Les indicateurs apparaîtront lorsque des règles SLA seront définies et que des tickets seront traités.'
                    : 'Aucun ticket analysé pour cette période. Les indicateurs s\'afficheront lorsque des tickets associés à des règles SLA seront créés et clôturés.'}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={slaPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {slaPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Détails SLA</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-100">Conformité globale</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {slaCompliance ? `${slaCompliance.overall_compliance.toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-100">Tickets analysés</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {slaCompliance ? slaCompliance.total_tickets : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-100">Violations SLA</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {slaCompliance ? slaCompliance.total_violations : '—'}
                </span>
              </div>
            </div>
            {!loading && !slaCompliance && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                Aucune donnée disponible pour la période sélectionnée.
              </p>
            )}
          </div>

          {/* Liste des tickets en violation */}
          <div className="card col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tickets en violation de SLA</h2>
              <div className="flex items-center space-x-3">
                <select
                  value={violationFilterCategory}
                  onChange={(e) => setViolationFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="incident">Incidents</option>
                  <option value="demande">Demandes</option>
                  <option value="changement">Changements</option>
                  <option value="developpement">Développements</option>
                  <option value="assistance">Assistance</option>
                  <option value="support">Support</option>
                </select>
              </div>
            </div>

            {loadingViolations ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-gray-500 dark:text-gray-400">Chargement des violations...</div>
              </div>
            ) : slaViolations.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune violation de SLA trouvée pour cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        SLA
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Temps de violation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date de violation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {slaViolations.map((violation) => {
                      const formatViolationTime = (minutes: number, unit: string) => {
                        if (unit === 'minutes') {
                          if (minutes < 60) return `${minutes} min`
                          const hours = Math.floor(minutes / 60)
                          const mins = minutes % 60
                          return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
                        }
                        return `${minutes} ${unit}`
                      }

                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString)
                        return date.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      }

                      const categoryLabels: Record<string, string> = {
                        incident: 'Incident',
                        demande: 'Demande',
                        changement: 'Changement',
                        developpement: 'Développement',
                        assistance: 'Assistance',
                        support: 'Support',
                      }

                      return (
                        <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <Ticket className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                #{violation.ticket_id}
                              </span>
                              {violation.ticket && (
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                  {violation.ticket.title}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {violation.sla
                                ? categoryLabels[violation.sla.ticket_category] || violation.sla.ticket_category
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {violation.sla?.name || 'SLA inconnu'}
                              </div>
                              {violation.sla && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {violation.sla.target_time} {violation.sla.unit}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                              {formatViolationTime(violation.violation_time, violation.unit)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(violation.violated_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Link
                              to={`/admin/tickets/${violation.ticket_id}`}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                            >
                              Voir le ticket
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {canViewProjects && selectedReport === 'projets' && (
        <div className="space-y-6">
          {/* Indicateurs projets */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total projets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectStats.total}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Actifs</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{projectStats.active}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Clôturés</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{projectStats.completed}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Annulés</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{projectStats.cancelled}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">En dépassement</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{projectStats.overBudget}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Budget total (h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectStats.totalBudgetH.toFixed(1)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Temps consommé (h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectStats.totalConsumedH.toFixed(1)}</p>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition par statut</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : projectStatusPieData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500 dark:text-gray-400">Aucun projet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectStatusPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatusPieData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v} projet${v > 1 ? 's' : ''}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Total: {projectStats.total} projet(s)
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top 10 — Temps consommé (h)</h2>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
              ) : projectTopByConsumed.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500 dark:text-gray-400">Aucun projet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectTopByConsumed} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit=" h" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => `${v} h`} />
                    <Bar dataKey="heures" fill="#3b82f6" name="Heures" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Qui travaille sur quels projets */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Qui travaille sur quels projets</h2>
            {loadingProjectMembers ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500 dark:text-gray-400">Chargement des membres...</div>
              </div>
            ) : projectMembersList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun membre chargé. Sélectionnez l’onglet Projets après le chargement des projets.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Projet</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {projectMembersList.map((row) => (
                      <tr key={row.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/app/projects/${row.projectId}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                          >
                            {row.projectName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {row.members.length > 0 ? row.members.join(', ') : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Projets en dépassement de budget */}
          {projectStats.overBudget > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Projets en dépassement de budget</h2>
              <div className="space-y-3">
                {projectList
                  .filter((p) => p.total_budget_time != null && p.total_budget_time > 0 && (p.consumed_time || 0) > p.total_budget_time)
                  .map((p) => {
                    const budgetH = (p.total_budget_time || 0) / 60
                    const consumedH = (p.consumed_time || 0) / 60
                    const overH = consumedH - budgetH
                    return (
                      <Link
                        key={p.id}
                        to={`/app/projects/${p.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {consumedH.toFixed(1)} h / {budgetH.toFixed(1)} h (+{overH.toFixed(1)} h)
                        </span>
                      </Link>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default Reports
