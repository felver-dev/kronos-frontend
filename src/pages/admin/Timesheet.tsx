import { useState, useEffect, useMemo } from 'react'
import { Clock, Calendar, TrendingUp, AlertCircle, CheckCircle, XCircle, FileText, CalendarDays, DollarSign, Loader2, Download, Filter, Plus, Edit, Search, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { timesheetService, TimeEntryDTO, DailyDeclarationDTO, WeeklyDeclarationDTO, BudgetAlertDTO, CreateTimeEntryRequest, UpdateTimeEntryRequest } from '../../services/timesheetService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { userService, UserDTO } from '../../services/userService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { ticketService, TicketDTO } from '../../services/ticketService'
import { reportsService, WorkloadByAgentDTO } from '../../services/reportsService'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const Timesheet = () => {
  const toast = useToastContext()
  const location = useLocation()
  const { user, hasPermission } = useAuth()
  const basePath = location.pathname.startsWith('/app') ? '/app' : (location.pathname.startsWith('/employee') ? '/employee' : '/admin')
  const isEmployeeView = basePath === '/employee'
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [activeTab, setActiveTab] = useState<'overview' | 'entries' | 'daily' | 'weekly' | 'budget' | 'validation'>('entries')
  const [performanceSearch, setPerformanceSearch] = useState('')
  const [performanceDepartment, setPerformanceDepartment] = useState('')
  const [performancePage, setPerformancePage] = useState(1)
  const [performancePerPage, setPerformancePerPage] = useState(10)
  const [performanceStartDate, setPerformanceStartDate] = useState('')
  const [performanceEndDate, setPerformanceEndDate] = useState('')
  const [performanceAppliedStart, setPerformanceAppliedStart] = useState('')
  const [performanceAppliedEnd, setPerformanceAppliedEnd] = useState('')
  const [performanceAppliedSearch, setPerformanceAppliedSearch] = useState('')
  const [performanceAppliedDepartment, setPerformanceAppliedDepartment] = useState('')
  
  // États pour les données
  const [loading, setLoading] = useState(true)
  const [timeEntries, setTimeEntries] = useState<TimeEntryDTO[]>([])
  const [dailyDeclarations, setDailyDeclarations] = useState<DailyDeclarationDTO[]>([])
  const [weeklyDeclarations, setWeeklyDeclarations] = useState<WeeklyDeclarationDTO[]>([])
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlertDTO[]>([])
  const [users, setUsers] = useState<UserDTO[]>([])
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [tickets, setTickets] = useState<TicketDTO[]>([])
  /** Données « Performance par technicien » depuis l’API (même source que Mon tableau de bord) */
  const [workloadByAgent, setWorkloadByAgent] = useState<WorkloadByAgentDTO[] | null>(null)
  const [loadingWorkloadByAgent, setLoadingWorkloadByAgent] = useState(false)
  const [pendingValidations, setPendingValidations] = useState({
    entries: 0,
    daily: 0,
    weekly: 0,
  })
  // Entrées en attente de validation (endpoint dédié avec scope élargi pour les validateurs)
  const [pendingValidationEntries, setPendingValidationEntries] = useState<TimeEntryDTO[] | null>(null)

  // États pour les filtres (entrées de temps)
  const [showFilters, setShowFilters] = useState(false)
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterTicket, setFilterTicket] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDateStart, setFilterDateStart] = useState<string>('')
  const [filterDateEnd, setFilterDateEnd] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // États pour la pagination (entrées de temps)
  const [currentPageEntries, setCurrentPageEntries] = useState(1)
  const [itemsPerPageEntries, setItemsPerPageEntries] = useState(25)
  
  // États pour la pagination (déclarations journalières)
  const [currentPageDaily, setCurrentPageDaily] = useState(1)
  const [itemsPerPageDaily, setItemsPerPageDaily] = useState(25)
  const [currentPageWeekly, setCurrentPageWeekly] = useState(1)
  const [itemsPerPageWeekly, setItemsPerPageWeekly] = useState(25)

  // États pour les modals
  const [isCreateEntryModalOpen, setIsCreateEntryModalOpen] = useState(false)
  const [isEditEntryModalOpen, setIsEditEntryModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntryDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // États pour les modals de déclarations
  const [isCreateDailyModalOpen, setIsCreateDailyModalOpen] = useState(false)
  const [isDailyDetailsModalOpen, setIsDailyDetailsModalOpen] = useState(false)
  const [selectedDailyDeclaration, setSelectedDailyDeclaration] = useState<DailyDeclarationDTO | null>(null)
  const [isWeeklyDetailsModalOpen, setIsWeeklyDetailsModalOpen] = useState(false)
  const [selectedWeeklyDeclaration, setSelectedWeeklyDeclaration] = useState<WeeklyDeclarationDTO | null>(null)
  const [isCreateWeeklyModalOpen, setIsCreateWeeklyModalOpen] = useState(false)
  const [dailyTasks, setDailyTasks] = useState<Array<{ ticket_id: string; time_spent: string; time_unit: 'minutes' | 'hours' | 'days' }>>([{ ticket_id: '', time_spent: '', time_unit: 'hours' }])
  const [weeklyTasks, setWeeklyTasks] = useState<Array<{ ticket_id: string; time_spent: string; date: string; time_unit: 'minutes' | 'hours' | 'days' }>>([{ ticket_id: '', time_spent: '', date: new Date().toISOString().split('T')[0], time_unit: 'hours' }])
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedWeeklyWeek, setSelectedWeeklyWeek] = useState<string>('')
  
  // États pour les déclarations personnelles des employés
  const [currentDailyDeclaration, setCurrentDailyDeclaration] = useState<DailyDeclarationDTO | null>(null)
  const [currentWeeklyDeclaration, setCurrentWeeklyDeclaration] = useState<WeeklyDeclarationDTO | null>(null)
  const [dailyCalendar, setDailyCalendar] = useState<any[]>([])
  
  // Fonction pour obtenir la semaine actuelle au format YYYY-Www
  const getCurrentWeek = () => {
    const date = new Date()
    const year = date.getFullYear()
    const week = getWeekNumber(date)
    return `${year}-W${week.toString().padStart(2, '0')}`
  }
  
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }
  
  // États pour les unités de temps dans les modals d'entrées
  const [entryTimeUnit, setEntryTimeUnit] = useState<'minutes' | 'hours' | 'days'>('hours')
  const [editEntryTimeUnit, setEditEntryTimeUnit] = useState<'minutes' | 'hours' | 'days'>('hours')

  // États pour la gestion des budgets
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null)
  const [estimatedTimeValue, setEstimatedTimeValue] = useState<string>('')

  // Département de l'utilisateur connecté (pour conditions « Soumettre en validation »)
  const [userDepartment, setUserDepartment] = useState<DepartmentDTO | null>(null)

  // Charger les données
  // Définir l'onglet actif par défaut selon les permissions
  useEffect(() => {
    if (!isEmployeeView && (hasPermission?.('timesheet.view_all') || hasPermission?.('timesheet.view_team'))) {
      setActiveTab('overview')
    } else {
      setActiveTab('entries')
    }
  }, [isEmployeeView, hasPermission])

  // Si on est sur l'onglet Budget temps sans la permission, basculer vers un autre onglet
  useEffect(() => {
    if (activeTab === 'budget' && !hasPermission?.('timesheet.view_budget')) {
      setActiveTab(!isEmployeeView && (hasPermission?.('timesheet.view_all') || hasPermission?.('timesheet.view_team')) ? 'overview' : 'entries')
    }
  }, [activeTab, hasPermission, isEmployeeView])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, activeTab, selectedDailyDate, selectedWeeklyWeek])

  // Charger le département de l'utilisateur (conditions soumission pour validation)
  const loadUserDepartment = async () => {
    if (!user?.department_id) {
      setUserDepartment(null)
      return
    }
    try {
      const dept = await departmentService.getById(user.department_id)
      setUserDepartment(dept)
    } catch (err) {
      console.error('Erreur lors du chargement du département:', err)
      setUserDepartment(null)
    }
  }
  useEffect(() => {
    if (user?.department_id) {
      loadUserDepartment()
    } else {
      setUserDepartment(null)
    }
  }, [user?.id, user?.department_id])

  // Conditions pour activer « Soumettre en validation » : département IT + filiale fournisseur de logiciels
  const canSubmitForValidation = Boolean(userDepartment?.is_it_department && userDepartment?.filiale?.is_software_provider)

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger les données selon l'onglet actif
      if (activeTab === 'overview' || activeTab === 'entries' || activeTab === 'validation') {
        try {
          let entries: TimeEntryDTO[] = []
          if (isEmployeeView || hasPermission?.('timesheet.view_own')) {
            // Employé / vue personnelle : ne charger que ses propres entrées
            const userId = user?.id
            if (userId) {
              entries = await timesheetService.getTimeEntriesByUserId(Number(userId))
            } else {
              entries = []
            }
          } else {
            // Admin / manager : charger toutes les entrées
            entries = await timesheetService.getTimeEntries()
          }
          const entriesArray = Array.isArray(entries) ? entries : []
          setTimeEntries(entriesArray)
          setPendingValidations(prev => ({ ...prev, entries: entriesArray.filter(e => !e.validated && !e.validated_by).length }))
        } catch (error: any) {
          console.error('Erreur lors du chargement des entrées de temps:', error)
          const errorMessage = error?.message || error?.response?.data?.message || 'Erreur lors du chargement des entrées de temps'
          console.error('Détails de l\'erreur:', errorMessage, error)
          toast.error(errorMessage)
          setTimeEntries([])
        }
      }

      // Pour l’onglet Validation (admin), charger les entrées en attente via l’endpoint dédié
      // (scope élargi : entrées du département ou toutes si validateur sans département)
      if (activeTab === 'validation' && !isEmployeeView) {
        try {
          const pending = await timesheetService.getPendingValidationEntries()
          const arr = Array.isArray(pending) ? pending : []
          setPendingValidationEntries(arr)
          setPendingValidations(prev => ({ ...prev, entries: arr.length }))
        } catch (e) {
          console.error('Erreur getPendingValidationEntries:', e)
          setPendingValidationEntries([])
          setPendingValidations(prev => ({ ...prev, entries: 0 }))
        }
      } else {
        setPendingValidationEntries(null)
      }

      if (!isEmployeeView && (activeTab === 'overview' || activeTab === 'daily' || activeTab === 'validation')) {
        // Note: GetDailyRange filtre par userID de l'utilisateur connecté
        // En admin, on devrait avoir un endpoint pour toutes les déclarations
        // Pour l'instant, on essaie de charger avec l'utilisateur connecté
        try {
          const today = new Date()
          let startDate: string
          let endDate: string
          
          if (selectedPeriod === 'week') {
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay() + 1) // Lundi
            startDate = weekStart.toISOString().split('T')[0]
            endDate = today.toISOString().split('T')[0]
          } else if (selectedPeriod === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
            endDate = today.toISOString().split('T')[0]
          } else {
            startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
            endDate = today.toISOString().split('T')[0]
          }
          
          const daily = await timesheetService.getDailyRange(startDate, endDate)
          const dailyArray = Array.isArray(daily) ? daily : []
          setDailyDeclarations(dailyArray)
          setPendingValidations(prev => ({ ...prev, daily: dailyArray.filter(d => !d.validated).length }))
        } catch (error: any) {
          console.error('Erreur lors du chargement des déclarations journalières:', error)
          const errorMessage = error?.message || error?.response?.data?.message || 'Erreur lors du chargement des déclarations journalières'
          console.error('Détails de l\'erreur:', errorMessage, error)
          // Ne pas afficher d'erreur toast pour cette erreur car c'est attendu si l'endpoint filtre par user
          setDailyDeclarations([])
        }
      }
      
      if (!isEmployeeView && (activeTab === 'overview' || activeTab === 'weekly' || activeTab === 'validation')) {
        // Charger les déclarations hebdomadaires
        // Pour l'admin, on génère les déclarations hebdomadaires à partir des déclarations journalières
        try {
          // Calculer la plage de dates pour les 4 dernières semaines
          const today = new Date()
          const fourWeeksAgo = new Date(today)
          fourWeeksAgo.setDate(today.getDate() - 28)
          
          const startDateStr = fourWeeksAgo.toISOString().split('T')[0]
          const endDateStr = today.toISOString().split('T')[0]
          
          // Charger les déclarations journalières
          const dailyDecls = await timesheetService.getDailyRange(startDateStr, endDateStr)
          const dailyArray = Array.isArray(dailyDecls) ? dailyDecls : []
          
          // Grouper par semaine et par utilisateur
          const weeklyMap = new Map<string, WeeklyDeclarationDTO>()
          
          dailyArray.forEach(decl => {
            if (!decl.user_id || !decl.date) return
            
            const date = new Date(decl.date)
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay() + 1) // Lundi
            const weekString = formatWeekString(weekStart)
            const key = `${weekString}-${decl.user_id}`
            
            if (!weeklyMap.has(key)) {
              const weekEnd = new Date(weekStart)
              weekEnd.setDate(weekStart.getDate() + 6)
              
              weeklyMap.set(key, {
                id: weekStart.getTime() + decl.user_id,
                user_id: decl.user_id,
                user: decl.user,
                week: weekString,
                start_date: weekStart.toISOString().split('T')[0],
                end_date: weekEnd.toISOString().split('T')[0],
                task_count: 0,
                total_time: 0,
                validated: true,
                created_at: weekStart.toISOString(),
                updated_at: weekStart.toISOString(),
              })
            }
            
            const weekly = weeklyMap.get(key)!
            weekly.task_count += decl.task_count || 0
            weekly.total_time += decl.total_time || 0
            // Si une déclaration n'est pas validée, la déclaration hebdomadaire n'est pas validée
            if (!decl.validated) {
              weekly.validated = false
            }
          })
          
          // Compléter avec les déclarations hebdomadaires existantes (utilisateur connecté)
          try {
            const storedUser = sessionStorage.getItem('user')
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser)
              const userIdValue = typeof parsedUser.id === 'string' ? parseInt(parsedUser.id, 10) : parsedUser.id
              if (userIdValue) {
                const weeklyFromApi = await timesheetService.getWeeklyDeclarationsByUserId(userIdValue)
                const weeklyArrayFromApi = Array.isArray(weeklyFromApi) ? weeklyFromApi : []
                weeklyArrayFromApi.forEach((decl) => {
                  if (!decl) return
                  const key = `${decl.week}-${decl.user_id}`
                  if (!weeklyMap.has(key)) {
                    weeklyMap.set(key, decl)
                  } else {
                    const existing = weeklyMap.get(key)!
                    existing.task_count = decl.task_count || existing.task_count
                    existing.total_time = decl.total_time || existing.total_time
                    existing.validated = decl.validated
                    existing.start_date = decl.start_date
                    existing.end_date = decl.end_date
                    existing.updated_at = decl.updated_at
                    weeklyMap.set(key, existing)
                  }
                })
              }
            }
          } catch (error) {
            console.error('Erreur lors du chargement des déclarations hebdomadaires:', error)
          }
          
          const weeklyArray = Array.from(weeklyMap.values())
          weeklyArray.sort((a, b) => b.week.localeCompare(a.week))
          setWeeklyDeclarations(weeklyArray)
          
          const pendingWeekly = weeklyArray.filter(w => !w.validated).length
          setPendingValidations(prev => ({ ...prev, weekly: pendingWeekly }))
        } catch (error: any) {
          console.error('Erreur lors du chargement des déclarations hebdomadaires:', error)
          setWeeklyDeclarations([])
        }
      }
      
      if (!isEmployeeView && (activeTab === 'overview' || activeTab === 'budget')) {
        try {
          const alerts = await timesheetService.getBudgetAlerts()
          setBudgetAlerts(alerts)
        } catch (error: any) {
          console.error('Erreur lors du chargement des alertes budget:', error)
          // GetBudgetAlerts n'est pas encore implémenté dans le backend
          // On ne montre pas d'erreur à l'utilisateur, juste un tableau vide
          setBudgetAlerts([])
        }
      }
      
      // Charger les utilisateurs pour les graphiques de performance et les filtres
      if (!isEmployeeView && (activeTab === 'overview' || activeTab === 'entries')) {
            try {
              const allUsers = await userService.getAll()
              const usersArray = Array.isArray(allUsers) ? allUsers : []
              setUsers(usersArray.filter(u => u.is_active))
        } catch (error: any) {
          console.error('Erreur lors du chargement des utilisateurs:', error)
          setUsers([])
        }
        try {
          const allDepartments = await departmentService.getAll(true)
          const departmentsArray = Array.isArray(allDepartments) ? allDepartments : []
          setDepartments(departmentsArray)
        } catch (error: any) {
          console.error('Erreur lors du chargement des départements:', error)
          setDepartments([])
        }
      }

      // Charger les tickets pour les filtres, la création d'entrées, les déclarations et la section Performance par technicien (Vue d'ensemble)
      if (activeTab === 'overview' || activeTab === 'entries' || activeTab === 'budget' || activeTab === 'daily' || activeTab === 'weekly') {
        try {
          if (isEmployeeView) {
            // Pour les employés, charger seulement leurs tickets
            const ticketsResponse = await ticketService.getMyTickets(1, 1000, 'all')
            const ticketsArray = Array.isArray(ticketsResponse.tickets) ? ticketsResponse.tickets : []
            setTickets(ticketsArray)
          } else {
            // Pour les managers, charger tous les tickets (scope selon permissions)
            const ticketsResponse = await ticketService.getAll(1, 1000)
            const ticketsArray = Array.isArray(ticketsResponse.tickets) ? ticketsResponse.tickets : []
            setTickets(ticketsArray)
          }
        } catch (error: any) {
          console.error('Erreur lors du chargement des tickets:', error)
          setTickets([])
        }
      }

      // Performance par technicien : même source que « Mon tableau de bord » (API) pour des données cohérentes
      if (activeTab === 'overview' && !isEmployeeView) {
        setLoadingWorkloadByAgent(true)
        const scope: 'department' | 'filiale' | 'global' = hasPermission?.('reports.view_team')
          ? 'department'
          : hasPermission?.('reports.view_filiale')
            ? 'filiale'
            : 'global'
        reportsService
          .getWorkloadByAgent('month', scope)
          .then((data) => setWorkloadByAgent(Array.isArray(data) ? data : []))
          .catch(() => setWorkloadByAgent(null))
          .finally(() => setLoadingWorkloadByAgent(false))
      } else {
        setWorkloadByAgent(null)
      }
      
      // Charger les déclarations personnelles pour les employés
      if (isEmployeeView && activeTab === 'daily') {
        try {
          const declaration = await timesheetService.getDailyDeclaration(selectedDailyDate)
          setCurrentDailyDeclaration(declaration)
          if (declaration) {
            const tasks = await timesheetService.getDailyTasks(selectedDailyDate)
            setCurrentDailyDeclaration({ ...declaration, tasks })
          }
          
          // Charger le calendrier
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          const endDate = new Date()
          const calendar = await timesheetService.getDailyCalendar(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
          setDailyCalendar(Array.isArray(calendar) ? calendar : [])
        } catch (error: any) {
          console.error('Erreur lors du chargement de la déclaration journalière:', error)
          setCurrentDailyDeclaration(null)
          setDailyCalendar([])
        }
      }
      
      if (isEmployeeView && activeTab === 'weekly') {
        try {
          const week = selectedWeeklyWeek || getCurrentWeek()
          const declaration = await timesheetService.getWeeklyDeclaration(week)
          setCurrentWeeklyDeclaration(declaration)
          if (declaration) {
            const breakdown = await timesheetService.getWeeklyDailyBreakdown(week)
            setCurrentWeeklyDeclaration({ ...declaration, daily_breakdown: breakdown })
          }
          if (!selectedWeeklyWeek) {
            setSelectedWeeklyWeek(week)
          }
        } catch (error: any) {
          console.error('Erreur lors du chargement de la déclaration hebdomadaire:', error)
          setCurrentWeeklyDeclaration(null)
        }
      }
    } catch (error: any) {
      console.error('Erreur générale lors du chargement des données:', error)
      const errorMessage = error?.message || error?.response?.data?.message || 'Erreur lors du chargement des données'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les entrées de temps
  const filteredTimeEntries = useMemo(() => {
    let filtered = Array.isArray(timeEntries) ? [...timeEntries] : []

    // Filtre par utilisateur
    if (filterUser !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === parseInt(filterUser))
    }

    // Filtre par ticket
    if (filterTicket !== 'all') {
      filtered = filtered.filter(entry => entry.ticket_id === parseInt(filterTicket))
    }

    // Filtre par statut
    if (filterStatus === 'validated') {
      filtered = filtered.filter(entry => entry.validated)
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(entry => !entry.validated)
    }

    // Filtre par date
    if (filterDateStart) {
      const startDate = new Date(filterDateStart)
      filtered = filtered.filter(entry => new Date(entry.date) >= startDate)
    }
    if (filterDateEnd) {
      const endDate = new Date(filterDateEnd)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => new Date(entry.date) <= endDate)
    }

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(entry => {
        const user = entry.user
        const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : ''
        const ticketCode = entry.ticket?.code || ''
        const ticketTitle = entry.ticket?.title || ''
        const description = entry.description || ''
        
        return (
          userName.toLowerCase().includes(term) ||
          ticketCode.toLowerCase().includes(term) ||
          ticketTitle.toLowerCase().includes(term) ||
          description.toLowerCase().includes(term)
        )
      })
    }

    // Trier par date décroissante
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return filtered
  }, [timeEntries, filterUser, filterTicket, filterStatus, filterDateStart, filterDateEnd, searchTerm])

  // Calculer les statistiques - Sécuriser les tableaux (doit être avant les useMemo qui les utilisent)
  const safeTimeEntries = Array.isArray(timeEntries) ? timeEntries : []
  const safeDailyDeclarations = Array.isArray(dailyDeclarations) ? dailyDeclarations : []
  const safeBudgetAlerts = Array.isArray(budgetAlerts) ? budgetAlerts : []
  const safeUsers = Array.isArray(users) ? users : []

  // Liste pour l’onglet Validation : endpoint dédié (scope élargi) ou fallback sur timeEntries
  const validationEntriesList = useMemo(
    () => (pendingValidationEntries !== null ? pendingValidationEntries : safeTimeEntries.filter((e) => !e.validated && !e.validated_by)),
    [pendingValidationEntries, safeTimeEntries]
  )

  // Pagination des déclarations journalières
  const paginatedDailyDeclarations = useMemo(() => {
    const startIndex = (currentPageDaily - 1) * itemsPerPageDaily
    const endIndex = startIndex + itemsPerPageDaily
    return safeDailyDeclarations.slice(startIndex, endIndex)
  }, [safeDailyDeclarations, currentPageDaily, itemsPerPageDaily])
  
  const totalPagesDaily = Math.ceil(safeDailyDeclarations.length / itemsPerPageDaily)
  
  // Pagination des déclarations hebdomadaires
  const paginatedWeeklyDeclarations = useMemo(() => {
    const startIndex = (currentPageWeekly - 1) * itemsPerPageWeekly
    const endIndex = startIndex + itemsPerPageWeekly
    return weeklyDeclarations.slice(startIndex, endIndex)
  }, [weeklyDeclarations, currentPageWeekly, itemsPerPageWeekly])
  
  const totalPagesWeekly = Math.ceil(weeklyDeclarations.length / itemsPerPageWeekly)

  // Pagination des entrées filtrées
  const paginatedTimeEntries = useMemo(() => {
    const startIndex = (currentPageEntries - 1) * itemsPerPageEntries
    const endIndex = startIndex + itemsPerPageEntries
    return filteredTimeEntries.slice(startIndex, endIndex)
  }, [filteredTimeEntries, currentPageEntries, itemsPerPageEntries])
  
  const totalPagesEntries = Math.ceil(filteredTimeEntries.length / itemsPerPageEntries)

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPageEntries(1)
  }, [filterUser, filterTicket, filterStatus, filterDateStart, filterDateEnd, searchTerm])

  // Fonction pour créer une entrée de temps
  const handleCreateEntry = async (data: CreateTimeEntryRequest) => {
    setIsSubmitting(true)
    try {
      await timesheetService.createTimeEntry(data)
      toast.success('Entrée de temps créée avec succès')
      setIsCreateEntryModalOpen(false)
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de l\'entrée de temps')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour éditer une entrée de temps
  const handleEditEntry = (entry: TimeEntryDTO) => {
    setEditingEntry(entry)
    setIsEditEntryModalOpen(true)
  }

  const handleUpdateEntry = async (data: UpdateTimeEntryRequest) => {
    if (!editingEntry) return
    
    setIsSubmitting(true)
    try {
      await timesheetService.updateTimeEntry(editingEntry.id, data)
      toast.success('Entrée de temps mise à jour avec succès')
      setIsEditEntryModalOpen(false)
      setEditingEntry(null)
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour de l\'entrée de temps')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour supprimer une entrée de temps
  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée de temps ?')) return
    
    try {
      await timesheetService.deleteTimeEntry(id)
      toast.success('Entrée de temps supprimée avec succès')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression de l\'entrée de temps')
    }
  }

  // Fonction pour convertir le temps en minutes selon l'unité
  const convertToMinutes = (value: string, unit: 'minutes' | 'hours' | 'days'): number => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) return 0
    
    switch (unit) {
      case 'minutes':
        return Math.round(numValue)
      case 'hours':
        return Math.round(numValue * 60)
      case 'days':
        return Math.round(numValue * 8 * 60) // 8 heures par jour
      default:
        return Math.round(numValue)
    }
  }

  // Fonction pour créer une déclaration journalière
  const handleCreateDailyDeclaration = async (date: string, tasks: Array<{ ticket_id: string; time_spent: string; time_unit: 'minutes' | 'hours' | 'days' }>) => {
    setIsSubmitting(true)
    try {
      const validTasks = tasks
        .filter(t => t.ticket_id && t.time_spent && parseFloat(t.time_spent) > 0)
        .map(t => {
          const rawTime = parseFloat(t.time_spent)
          const minutes = t.time_unit === 'minutes'
            ? rawTime
            : t.time_unit === 'hours'
              ? rawTime * 60
              : rawTime * 480 // 8 heures par jour
          return {
            ticket_id: parseInt(t.ticket_id),
            time_spent: Math.round(minutes)
          }
        })
      
      if (validTasks.length === 0) {
        toast.error('Veuillez ajouter au moins un ticket')
        return
      }
      
      await timesheetService.createOrUpdateDailyDeclaration(date, validTasks)
      toast.success('Déclaration journalière créée avec succès')
      setIsCreateDailyModalOpen(false)
      setDailyTasks([{ ticket_id: '', time_spent: '', time_unit: 'hours' }])
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de la déclaration')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour créer une déclaration hebdomadaire
  const handleCreateWeeklyDeclaration = async (week: string, tasks: Array<{ ticket_id: string; time_spent: string; date: string; time_unit: 'minutes' | 'hours' | 'days' }>) => {
    setIsSubmitting(true)
    try {
      const validTasks = tasks
        .filter(t => t.ticket_id && t.time_spent && t.date && parseFloat(t.time_spent) > 0)
        .map(t => ({
          ticket_id: parseInt(t.ticket_id),
          time_spent: convertToMinutes(t.time_spent, t.time_unit),
          date: t.date
        }))
      
      if (validTasks.length === 0) {
        toast.error('Veuillez ajouter au moins un ticket')
        return
      }
      
      await timesheetService.createOrUpdateWeeklyDeclaration(week, validTasks)
      toast.success('Déclaration hebdomadaire créée avec succès')
      setIsCreateWeeklyModalOpen(false)
      setWeeklyTasks([{ ticket_id: '', time_spent: '', date: new Date().toISOString().split('T')[0], time_unit: 'hours' }])
      setSelectedWeeklyWeek('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de la déclaration')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour définir/modifier le temps estimé d'un ticket
  const handleSetEstimatedTime = async (ticketId: number, estimatedTime: number) => {
    try {
      // Vérifier si le ticket a déjà un temps estimé
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket?.estimated_time !== undefined && ticket.estimated_time !== null) {
        // Mettre à jour avec PUT
        await timesheetService.updateTicketEstimatedTime(ticketId, estimatedTime)
        toast.success('Temps estimé mis à jour avec succès')
      } else {
        // Créer avec POST
        await timesheetService.setTicketEstimatedTime(ticketId, estimatedTime)
        toast.success('Temps estimé défini avec succès')
      }
      setEditingTicketId(null)
      setEstimatedTimeValue('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la définition du temps estimé')
    }
  }

  // Fonction pour exporter les données
  const handleExport = () => {
    // Exporter les entrées filtrées en CSV
    const headers = ['Date', 'Technicien', 'Ticket', 'Temps passé (min)', 'Description', 'Statut']
    const rows = filteredTimeEntries.map(entry => [
      new Date(entry.date).toLocaleDateString('fr-FR'),
      entry.user ? `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim() || entry.user.username : 'N/A',
      entry.ticket?.code || `#${entry.ticket_id}`,
      entry.time_spent.toString(),
      entry.description || '',
      entry.validated ? 'Validé' : 'En attente'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `timesheet_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Export réussi')
  }

  const totalMinutes = safeTimeEntries.reduce((sum, entry) => sum + entry.time_spent, 0)
  const validatedCount = safeTimeEntries.filter(e => e.validated).length
  const validationRate = safeTimeEntries.length > 0 ? (validatedCount / safeTimeEntries.length) * 100 : 0

  // Préparer les données pour les graphiques (à améliorer avec de vraies données)
  // Période pour la section « Performance par technicien » : si aucune date custom, utiliser le mois en cours par défaut pour afficher des données
  const isInSelectedPeriod = (dateStr?: string) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()

    let startDate: Date
    let endDate: Date

    if (performanceAppliedStart || performanceAppliedEnd) {
      const appliedStart = performanceAppliedStart || performanceAppliedEnd
      const appliedEnd = performanceAppliedEnd || performanceAppliedStart
      startDate = appliedStart ? new Date(appliedStart) : new Date(0)
      startDate.setHours(0, 0, 0, 0)
      endDate = appliedEnd ? new Date(appliedEnd) : new Date(today)
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedPeriod === 'week') {
      startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay() + 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedPeriod === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
    }

    return date >= startDate && date <= endDate
  }

  // Pour « Performance par technicien » : période = dates custom OU par défaut mois en cours (évite tout à 0 quand aucune période n'est choisie)
  const isInPerformancePeriod = (dateStr?: string) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    let startDate: Date
    let endDate: Date
    if (performanceAppliedStart || performanceAppliedEnd) {
      const appliedStart = performanceAppliedStart || performanceAppliedEnd
      const appliedEnd = performanceAppliedEnd || performanceAppliedStart
      startDate = appliedStart ? new Date(appliedStart) : new Date(0)
      startDate.setHours(0, 0, 0, 0)
      endDate = appliedEnd ? new Date(appliedEnd) : new Date(today)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Défaut : mois en cours pour que les chiffres s'affichent
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
    }
    return date >= startDate && date <= endDate
  }

  // Une seule source de vérité : API getWorkloadByAgent (aligné avec « Mon tableau de bord »). Sinon fallback sur calcul local.
  const performanceData =
    workloadByAgent !== null
      ? workloadByAgent.map((row) => {
          const name =
            row.user?.first_name || row.user?.last_name
              ? [row.user.first_name, row.user.last_name].filter(Boolean).join(' ')
              : row.user?.username ?? `#${row.user_id}`
          return {
            name,
            user_id: row.user_id,
            ticketsProcessed: row.resolved_count,
            ticketsAssigned: row.ticket_count,
            ticketsUnprocessed: row.open_count + row.in_progress_count + row.pending_count,
            efficiency: Math.round(row.efficiency ?? 0),
            avgTime: row.average_time ?? 0,
            budgetCompliance: 0,
            budgetTrackedCount: 0,
          }
        })
      : safeUsers.map((user) => {
          const userEntries = safeTimeEntries.filter((e) => e.user_id === user.id && isInPerformancePeriod(e.date))
          const totalTime = userEntries.reduce((sum, e) => sum + e.time_spent, 0)
          const avgTime = userEntries.length > 0 ? totalTime / userEntries.length : 0
          const userIdNum = typeof user.id === 'string' ? Number(user.id) : user.id
          const assignedTickets = tickets.filter((t) => {
            const assignedId =
              t.assigned_to?.id != null
                ? typeof t.assigned_to.id === 'string'
                  ? Number(t.assigned_to.id)
                  : t.assigned_to.id
                : null
            return assignedId === userIdNum && isInPerformancePeriod(t.created_at)
          })
          const isProcessed = (t: TicketDTO) => t.status === 'cloture' || t.status === 'resolu'
          const processedTickets = assignedTickets.filter(isProcessed)
          const budgetTrackedTickets = processedTickets.filter((t) => (t.estimated_time ?? 0) > 0)
          const budgetCompliantTickets = budgetTrackedTickets.filter(
            (t) => (t.actual_time ?? 0) <= (t.estimated_time ?? 0)
          )
          const efficiency =
            assignedTickets.length > 0
              ? Math.round((processedTickets.length / assignedTickets.length) * 100)
              : 0
          const budgetCompliance =
            processedTickets.length > 0 && budgetTrackedTickets.length > 0
              ? Math.round((budgetCompliantTickets.length / budgetTrackedTickets.length) * 100)
              : 0
          return {
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            user_id: userIdNum,
            ticketsProcessed: processedTickets.length,
            ticketsAssigned: assignedTickets.length,
            ticketsUnprocessed: assignedTickets.filter((t) => !isProcessed(t)).length,
            efficiency,
            avgTime,
            budgetCompliance,
            budgetTrackedCount: budgetTrackedTickets.length,
          }
        })

  const performanceDepartments = departments
    .filter(dept => dept.is_active)
    .map(dept => dept.name)
    .sort((a, b) => a.localeCompare(b, 'fr'))

  const filteredPerformanceData = performanceData.filter((perf) => {
    const searchTrim = performanceSearch.trim()
    const matchesSearch =
      searchTrim === '' ||
      perf.name.toLowerCase().includes(searchTrim.toLowerCase())
    const deptSelected = (performanceDepartment || '').trim()
    const matchesDepartment =
      deptSelected === '' ||
      ('user_id' in perf && perf.user_id != null
        ? safeUsers.find((u) => Number(u.id) === perf.user_id)?.department?.name === deptSelected
        : !!safeUsers.find((u) => {
            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
            return name === perf.name && u.department?.name === deptSelected
          }))
    return matchesSearch && matchesDepartment
  })

  const performanceTotalPages = Math.max(1, Math.ceil(filteredPerformanceData.length / performancePerPage))
  const performancePageStart = (performancePage - 1) * performancePerPage
  const paginatedPerformanceData = filteredPerformanceData.slice(
    performancePageStart,
    performancePageStart + performancePerPage
  )


  const formatTime = (minutes: number) => {
    if (!minutes || minutes <= 0) {
      return '0min'
    }

    const fraction = minutes - Math.floor(minutes)
    const roundedMinutes =
      fraction > 0 ? (fraction * 100 < 50 ? Math.floor(minutes) : Math.ceil(minutes)) : minutes

    const minutesPerHour = 60
    const minutesPerWorkDay = 480 // 8 heures par jour de travail
    const minutesPerMonth = 31 * 1440 // Pour les mois, on utilise toujours des jours calendaires
    const minutesPerYear = 365 * 1440 // Pour les années, on utilise toujours des jours calendaires

    let remaining = Math.floor(roundedMinutes)

    // Pour les très grandes durées (années/mois), utiliser des jours calendaires
    const years = Math.floor(remaining / minutesPerYear)
    remaining %= minutesPerYear

    const months = Math.floor(remaining / minutesPerMonth)
    remaining %= minutesPerMonth

    // Pour les jours, utiliser des jours de travail (8h = 480min)
    const days = Math.floor(remaining / minutesPerWorkDay)
    remaining %= minutesPerWorkDay

    const hours = Math.floor(remaining / minutesPerHour)
    remaining %= minutesPerHour

    const mins = remaining

    const parts: string[] = []
    if (years > 0) parts.push(`${years}an`)
    if (months > 0) parts.push(`${months}mois`)
    if (days > 0) parts.push(`${days}j`)
    if (hours > 0) parts.push(`${hours}h`)
    if (mins > 0 || parts.length === 0) parts.push(`${mins}min`)
    return parts.join(' ')
  }

  // Fonction pour calculer le numéro de semaine dans le mois (1ère, 2ème, etc.)
  // La semaine commence le lundi
  const getWeekNumberInMonth = (date: Date): number => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // Trouver le premier jour du mois
    const firstDay = new Date(year, month, 1)
    // Trouver le premier lundi du mois (ou le 1er si c'est un lundi)
    const firstDayOfWeek = firstDay.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    const daysToFirstMonday = firstDayOfWeek === 0 ? 1 : (firstDayOfWeek === 1 ? 0 : 8 - firstDayOfWeek)
    const firstMonday = new Date(year, month, 1 + daysToFirstMonday)
    
    // Si la date est avant le premier lundi, elle appartient à la semaine 1
    if (date < firstMonday) {
      return 1
    }
    
    // Calculer le nombre de jours depuis le premier lundi
    const daysSinceFirstMonday = Math.floor((date.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
    // Calculer le numéro de semaine (1ère, 2ème, etc.)
    return Math.floor(daysSinceFirstMonday / 7) + 1
  }

  // Fonction pour formater la semaine au format YYYY-MM-Wn
  const formatWeekString = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const weekNumber = getWeekNumberInMonth(date)
    return `${year}-${month}-W${weekNumber}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestion du temps</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Suivez et validez le temps passé par les techniciens</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <button 
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {!isEmployeeView && (hasPermission?.('timesheet.view_all') || hasPermission?.('timesheet.view_team')) && (
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Vue d'ensemble
            </button>
          )}
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'entries'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Clock className="w-5 h-5 inline mr-2" />
            Entrées de temps
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'daily'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Déclarations journalières
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'weekly'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CalendarDays className="w-5 h-5 inline mr-2" />
            Déclarations hebdomadaires
          </button>
          {!isEmployeeView && hasPermission?.('timesheet.view_budget') && (
            <button
              onClick={() => setActiveTab('budget')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'budget'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Budget temps
            </button>
          )}
          {!isEmployeeView && hasPermission?.('timesheet.validate') && (
            <button
              onClick={() => setActiveTab('validation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'validation'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="w-5 h-5 inline mr-2" />
              Validation
            </button>
          )}
        </nav>
      </div>

      {/* Vue d'ensemble - seulement pour admin */}
      {!isEmployeeView && activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
            </div>
          ) : (
            <>
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Heures totales</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatTime(totalMinutes)}</p>
                    </div>
                    <Clock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">En attente de validation</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {pendingValidations.entries + pendingValidations.daily + pendingValidations.weekly}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Taux de validation</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{validationRate.toFixed(0)}%</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Alertes budget</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{safeBudgetAlerts.length}</p>
                    </div>
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>
              </div>

          {/* Performance par utilisateur */}
          <div className="card">
            <div className="flex flex-col gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance par technicien</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Rechercher un technicien
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nom ou username..."
                        value={performanceSearch}
                        onChange={(e) => {
                          setPerformanceSearch(e.target.value)
                          setPerformancePage(1)
                        }}
                        className="input pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Département
                    </label>
                    <select
                      value={performanceDepartment}
                      onChange={(e) => {
                        setPerformanceDepartment(e.target.value)
                        setPerformancePage(1)
                      }}
                      className="input"
                    >
                      <option value="">Tous les départements</option>
                      {performanceDepartments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Période (début / fin)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={performanceStartDate}
                        onChange={(e) => setPerformanceStartDate(e.target.value)}
                        className="input flex-1 min-w-0"
                        placeholder="Début"
                      />
                      <input
                        type="date"
                        value={performanceEndDate}
                        onChange={(e) => setPerformanceEndDate(e.target.value)}
                        className="input flex-1 min-w-0"
                        placeholder="Fin"
                        min={performanceStartDate || undefined}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPerformanceAppliedStart(performanceStartDate)
                        setPerformanceAppliedEnd(performanceEndDate)
                        setPerformanceAppliedSearch(performanceSearch)
                        setPerformanceAppliedDepartment(performanceDepartment)
                        setPerformancePage(1)
                      }}
                      className="btn btn-primary whitespace-nowrap"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {loadingWorkloadByAgent ? (
              <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                Chargement des performances…
              </div>
            ) : (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Technicien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tickets traités
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tickets assignés
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tickets non traités
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Efficacité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps moyen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Conformité budget
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedPerformanceData.map((perf, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {perf.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {perf.ticketsProcessed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {perf.ticketsAssigned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {perf.ticketsUnprocessed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                              style={{ width: `${perf.efficiency}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{perf.efficiency}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatTime(perf.avgTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                              style={{ width: `${perf.budgetCompliance}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {perf.budgetCompliance}%{perf.budgetTrackedCount > 0 ? ` (${perf.budgetTrackedCount})` : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={performancePage}
              totalPages={performanceTotalPages}
              totalItems={filteredPerformanceData.length}
              itemsPerPage={performancePerPage}
              onPageChange={setPerformancePage}
              onItemsPerPageChange={setPerformancePerPage}
            />
            </>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* Entrées de temps */}
      {activeTab === 'entries' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEmployeeView ? 'Mes entrées de temps' : 'Toutes les entrées de temps'}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsCreateEntryModalOpen(true)}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nouvelle entrée
                </button>
                {!isEmployeeView && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn btn-secondary flex items-center ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                  >
                    <Filter className="w-5 h-5 mr-2" />
                    Filtres
                    {showFilters && <X className="w-4 h-4 ml-2" />}
                  </button>
                )}
              </div>
            </div>

            {/* Panneau de filtres (admin/manager uniquement) */}
            {!isEmployeeView && showFilters && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Recherche */}
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Recherche
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom, ticket, description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-9"
                      />
                    </div>
                  </div>

                  {/* Filtre utilisateur */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Technicien
                    </label>
                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="input"
                    >
                      <option value="all">Tous les techniciens</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id.toString()}>
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtre ticket */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Ticket
                    </label>
                    <select
                      value={filterTicket}
                      onChange={(e) => setFilterTicket(e.target.value)}
                      className="input"
                    >
                      <option value="all">Tous les tickets</option>
                      {tickets.map(ticket => (
                        <option key={ticket.id} value={ticket.id.toString()}>
                          {ticket.code} - {ticket.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtre statut */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Statut
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="validated">Validé</option>
                      <option value="pending">En attente</option>
                    </select>
                  </div>

                  {/* Filtre date début */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date début
                    </label>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="input"
                    />
                  </div>

                  {/* Filtre date fin */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="input"
                    />
                  </div>

                  {/* Bouton réinitialiser */}
                  <div className="lg:col-span-3 flex justify-end">
                    <button
                      onClick={() => {
                        setFilterUser('all')
                        setFilterTicket('all')
                        setFilterStatus('all')
                        setFilterDateStart('')
                        setFilterDateEnd('')
                        setSearchTerm('')
                      }}
                      className="btn btn-secondary"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Technicien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps passé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredTimeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {timeEntries.length === 0 
                          ? 'Aucune entrée de temps trouvée'
                          : 'Aucune entrée ne correspond aux filtres'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTimeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(entry.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {entry.user?.first_name && entry.user?.last_name
                            ? `${entry.user.first_name} ${entry.user.last_name}`
                            : entry.user?.username || 'Utilisateur inconnu'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`${basePath}/tickets/${entry.ticket_id}`}
                            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {entry.ticket?.code || `#${entry.ticket_id}`}
                          </Link>
                          {entry.ticket?.title && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{entry.ticket.title}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatTime(entry.time_spent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.validated ? (
                            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              Validé
                            </span>
                          ) : (
                            <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {(entry.user_id === Number(user?.id) || hasPermission?.('timesheet.edit_all')) && (
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                title="Modifier"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {!entry.validated && hasPermission?.('timesheet.validate') && (
                              <>
                                <button
                                  onClick={() => {
                                    if (!canSubmitForValidation) return
                                    toast.info('Soumis pour validation. La validation est effectuée par le demandeur du ticket depuis la fiche ticket.')
                                  }}
                                  disabled={!canSubmitForValidation}
                                  title={canSubmitForValidation ? 'Soumettre en validation (la validation est effectuée par le demandeur du ticket)' : 'Réservé au département IT de la filiale fournisseur de logiciels'}
                                  className={canSubmitForValidation ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'}
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                  title="Supprimer"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTimeEntries.length > 0 && (
              <Pagination
                currentPage={currentPageEntries}
                totalPages={totalPagesEntries}
                totalItems={filteredTimeEntries.length}
                itemsPerPage={itemsPerPageEntries}
                onPageChange={setCurrentPageEntries}
                onItemsPerPageChange={setItemsPerPageEntries}
                itemsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        </div>
      )}

      {/* Déclarations journalières */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {isEmployeeView ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Déclaration journalière</h2>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="input"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Chargement...</p>
                  </div>
                ) : currentDailyDeclaration ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Nombre de tâches</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {currentDailyDeclaration.task_count || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temps total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatTime(currentDailyDeclaration.total_time || 0)}
                        </p>
                      </div>
                      <div>
                        {currentDailyDeclaration.validated ? (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                            Validée
                          </span>
                        ) : (
                          <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                            En attente
                          </span>
                        )}
                      </div>
                    </div>

                    {currentDailyDeclaration.tasks && currentDailyDeclaration.tasks.length > 0 && (
                      <div>
                        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">Tâches du jour</h3>
                        <div className="space-y-2">
                          {currentDailyDeclaration.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                              <div>
                                <Link
                                  to={`${basePath}/tickets/${task.ticket_id}`}
                                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                  {task.ticket?.code || `#${task.ticket_id}`} - {task.ticket?.title || 'Ticket'}
                                </Link>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatTime(task.time_spent)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setIsCreateDailyModalOpen(true)}
                      className="btn btn-primary w-full flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {currentDailyDeclaration ? 'Modifier la déclaration' : 'Créer une déclaration'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Aucune déclaration pour ce jour</p>
                    <button
                      onClick={() => setIsCreateDailyModalOpen(true)}
                      className="btn btn-primary flex items-center mx-auto"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Créer une déclaration journalière
                    </button>
                  </div>
                )}
              </div>

              {/* Calendrier des déclarations */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Calendrier</h3>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - date.getDay() + i)
                    const dateStr = date.toISOString().split('T')[0]
                    const calendarEntry = dailyCalendar.find((c) => {
                      const cDate = c.date ? new Date(c.date).toISOString().split('T')[0] : null
                      return cDate === dateStr
                    })
                    return (
                      <div
                        key={i}
                        className={`p-3 border rounded-lg text-center ${
                          calendarEntry
                            ? calendarEntry.validated
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][i]}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {date.getDate()}
                        </p>
                        {calendarEntry && calendarEntry.has_entry && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {formatTime(calendarEntry.total_time)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Déclarations journalières
                </h2>
                {hasPermission?.('timesheet.create_daily') && (
                  <button
                    onClick={() => setIsCreateDailyModalOpen(true)}
                    className="btn btn-primary flex items-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nouvelle déclaration
                  </button>
                )}
              </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Technicien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nombre de tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                      </td>
                    </tr>
                  ) : safeDailyDeclarations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Aucune déclaration journalière trouvée
                      </td>
                    </tr>
                  ) : (
                    paginatedDailyDeclarations.map((declaration) => (
                      <tr key={declaration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(declaration.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {declaration.user?.first_name && declaration.user?.last_name
                          ? `${declaration.user.first_name} ${declaration.user.last_name}`
                          : declaration.user?.username || 'Utilisateur inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {declaration.task_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatTime(declaration.total_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {declaration.validated ? (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                            Validée
                          </span>
                        ) : (
                          <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedDailyDeclaration(declaration)
                              setIsDailyDetailsModalOpen(true)
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Voir détails"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          {!declaration.validated && hasPermission?.('timesheet.validate') && (
                            <button
                              onClick={async () => {
                                try {
                                  await timesheetService.validateDailyDeclaration(declaration.id)
                                  toast.success('Déclaration journalière validée')
                                  await loadData()
                                } catch (error: any) {
                                  toast.error('Erreur lors de la validation')
                                }
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title="Valider"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {safeDailyDeclarations.length > 0 && (
              <Pagination
                currentPage={currentPageDaily}
                totalPages={totalPagesDaily}
                totalItems={safeDailyDeclarations.length}
                itemsPerPage={itemsPerPageDaily}
                onPageChange={setCurrentPageDaily}
                onItemsPerPageChange={setItemsPerPageDaily}
                itemsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
            )}
        </div>
      )}

      {/* Déclarations hebdomadaires */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {isEmployeeView ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Déclaration hebdomadaire</h2>
                <input
                  type="week"
                  value={selectedWeeklyWeek}
                  onChange={(e) => setSelectedWeeklyWeek(e.target.value)}
                  className="input"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Chargement...</p>
                </div>
              ) : currentWeeklyDeclaration ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Nombre de tâches</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {currentWeeklyDeclaration.task_count || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Temps total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatTime(currentWeeklyDeclaration.total_time || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Statut</p>
                      {currentWeeklyDeclaration.validated ? (
                        <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 mt-2">
                          Validée
                        </span>
                      ) : (
                        <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 mt-2">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>

                  {currentWeeklyDeclaration.daily_breakdown && currentWeeklyDeclaration.daily_breakdown.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Répartition par jour
                      </h3>
                      <div className="space-y-2">
                        {currentWeeklyDeclaration.daily_breakdown.map((day, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{day.task_count} tâche(s)</p>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatTime(day.total_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!currentWeeklyDeclaration.validated && (
                    <button
                      onClick={async () => {
                        try {
                          await timesheetService.validateWeeklyDeclaration(selectedWeeklyWeek)
                          toast.success('Déclaration hebdomadaire soumise pour validation')
                          await loadData()
                        } catch (error: any) {
                          toast.error(error?.message || 'Erreur lors de la soumission')
                        }
                      }}
                      disabled={!canSubmitForValidation}
                      title={canSubmitForValidation ? 'Soumettre la déclaration pour validation' : 'Réservé aux membres du département IT de la filiale fournisseur de logiciels'}
                      className={`w-full btn flex items-center justify-center ${canSubmitForValidation ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Soumettre en validation
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Aucune déclaration pour cette semaine</p>
                  <button
                    onClick={() => setIsCreateWeeklyModalOpen(true)}
                    className="btn btn-primary flex items-center mx-auto"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Créer une déclaration hebdomadaire
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Déclarations hebdomadaires
                </h2>
                {hasPermission?.('timesheet.create_weekly') && (
                  <button
                    onClick={() => setIsCreateWeeklyModalOpen(true)}
                    className="btn btn-primary flex items-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nouvelle déclaration
                  </button>
                )}
              </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Semaine
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Technicien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nombre de tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                      </td>
                    </tr>
                  ) : weeklyDeclarations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Aucune déclaration hebdomadaire trouvée
                      </td>
                    </tr>
                  ) : (
                    paginatedWeeklyDeclarations.map((declaration) => (
                      <tr key={declaration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {declaration.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {declaration.user?.first_name && declaration.user?.last_name
                          ? `${declaration.user.first_name} ${declaration.user.last_name}`
                          : declaration.user?.username || 'Utilisateur inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {declaration.task_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatTime(declaration.total_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {declaration.validated ? (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                            Validée
                          </span>
                        ) : (
                          <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedWeeklyDeclaration(declaration)
                              setIsWeeklyDetailsModalOpen(true)
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Voir détails"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          {!declaration.validated && hasPermission?.('timesheet.validate') && (
                            <button
                              onClick={async () => {
                                try {
                                  await timesheetService.validateWeeklyDeclaration(declaration.week)
                                  toast.success('Déclaration hebdomadaire validée')
                                  await loadData()
                                } catch (error: any) {
                                  toast.error('Erreur lors de la validation')
                                }
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title="Valider"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {weeklyDeclarations.length > 0 && (
              <Pagination
                currentPage={currentPageWeekly}
                totalPages={totalPagesWeekly}
                totalItems={weeklyDeclarations.length}
                itemsPerPage={itemsPerPageWeekly}
                onPageChange={setCurrentPageWeekly}
                onItemsPerPageChange={setItemsPerPageWeekly}
                itemsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
            )}
        </div>
      )}

      {/* Modal détails déclaration journalière */}
      <Modal
        isOpen={isDailyDetailsModalOpen}
        onClose={() => {
          setIsDailyDetailsModalOpen(false)
          setSelectedDailyDeclaration(null)
        }}
        title="Détails de la déclaration journalière"
        size="lg"
      >
        {selectedDailyDeclaration ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(selectedDailyDeclaration.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Technicien</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedDailyDeclaration.user?.first_name && selectedDailyDeclaration.user?.last_name
                    ? `${selectedDailyDeclaration.user.first_name} ${selectedDailyDeclaration.user.last_name}`
                    : selectedDailyDeclaration.user?.username || 'Utilisateur inconnu'}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Nombre de tickets</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedDailyDeclaration.task_count}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Temps total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(selectedDailyDeclaration.total_time)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Tickets déclarés</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Temps passé
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedDailyDeclaration.tasks && selectedDailyDeclaration.tasks.length > 0 ? (
                      selectedDailyDeclaration.tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {task.ticket?.code || `#${task.ticket_id}`}
                            {task.ticket?.title && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {task.ticket.title}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {formatTime(task.time_spent)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                          Aucun ticket trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDailyDetailsModalOpen(false)
                  setSelectedDailyDeclaration(null)
                }}
                className="btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">Aucune déclaration sélectionnée.</div>
        )}
      </Modal>

      {/* Modal détails déclaration hebdomadaire */}
      <Modal
        isOpen={isWeeklyDetailsModalOpen}
        onClose={() => {
          setIsWeeklyDetailsModalOpen(false)
          setSelectedWeeklyDeclaration(null)
        }}
        title="Détails de la déclaration hebdomadaire"
        size="lg"
      >
        {selectedWeeklyDeclaration ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Semaine</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedWeeklyDeclaration.week}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Technicien</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedWeeklyDeclaration.user?.first_name && selectedWeeklyDeclaration.user?.last_name
                    ? `${selectedWeeklyDeclaration.user.first_name} ${selectedWeeklyDeclaration.user.last_name}`
                    : selectedWeeklyDeclaration.user?.username || 'Utilisateur inconnu'}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Période</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(selectedWeeklyDeclaration.start_date).toLocaleDateString('fr-FR')} → {new Date(selectedWeeklyDeclaration.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Nombre de tickets</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedWeeklyDeclaration.task_count}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Temps total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(selectedWeeklyDeclaration.total_time)}
                </p>
              </div>
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Statut</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedWeeklyDeclaration.validated ? 'Validée' : 'En attente'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Répartition quotidienne</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre de tickets
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Temps total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedWeeklyDeclaration.daily_breakdown && selectedWeeklyDeclaration.daily_breakdown.length > 0 ? (
                      selectedWeeklyDeclaration.daily_breakdown.map((day, index) => (
                        <tr key={`${day.date}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {new Date(day.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {day.task_count}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {formatTime(day.total_time)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                          Aucune répartition disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsWeeklyDetailsModalOpen(false)
                  setSelectedWeeklyDeclaration(null)
                }}
                className="btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">Aucune déclaration sélectionnée.</div>
        )}
      </Modal>

      {/* Budget temps - accessible uniquement avec timesheet.view_budget */}
      {activeTab === 'budget' && hasPermission?.('timesheet.view_budget') && (
        <div className="space-y-6">
          {/* Section pour définir/modifier le temps estimé des tickets */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gestion des temps estimés</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps estimé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps réel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Écart
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Aucun ticket trouvé
                      </td>
                    </tr>
                  ) : (
                    tickets.slice(0, 50).map((ticket) => {
                      const estimatedTime = ticket.estimated_time || 0
                      const actualTime = ticket.actual_time || 0
                      const difference = actualTime - estimatedTime
                      const percentage = estimatedTime > 0 ? Math.round((actualTime / estimatedTime) * 100) : 0
                      
                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              to={`${basePath}/tickets/${ticket.id}`}
                              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {ticket.code}
                            </Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.title}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {estimatedTime > 0 ? formatTime(estimatedTime) : 'Non défini'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatTime(actualTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {estimatedTime > 0 && (
                              <span className={difference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                {difference > 0 ? '+' : ''}{formatTime(Math.abs(difference))} ({percentage}%)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingTicketId(ticket.id)
                                setEstimatedTimeValue(ticket.estimated_time?.toString() || '')
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                              title="Modifier le temps estimé"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alertes budget */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Alertes budget</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps estimé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Temps réel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Écart
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400 mx-auto" />
                      </td>
                    </tr>
                  ) : safeBudgetAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Aucune alerte budget trouvée
                      </td>
                    </tr>
                  ) : (
                    safeBudgetAlerts.map((alert, index) => {
                      const budget = alert.budget || 0
                      const spent = alert.spent || 0
                      const percentage = alert.percentage || (budget > 0 ? Math.round((spent / budget) * 100) : 0)
                      const difference = spent - budget
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {alert.ticket_id && (
                              <Link
                                to={`${basePath}/tickets/${alert.ticket_id}`}
                                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                Ticket #{alert.ticket_id}
                              </Link>
                            )}
                            {alert.message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{alert.message}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatTime(budget)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatTime(spent)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                            {difference > 0 ? '+' : ''}{formatTime(Math.abs(difference))} ({Math.round(percentage)}%)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {percentage > 100 ? (
                              <span className="badge bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                                Dépassé
                              </span>
                            ) : percentage > 80 ? (
                              <span className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                                Attention
                              </span>
                            ) : (
                              <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {alert.ticket_id && (
                              <Link
                                to={`${basePath}/tickets/${alert.ticket_id}`}
                                className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                              >
                                Voir
                              </Link>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Validation - seulement pour les rôles autorisés */}
      {!isEmployeeView && hasPermission?.('timesheet.validate') && activeTab === 'validation' && (
        <div className="space-y-6">
          <div className="card border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Attention</p>
                <p className="mt-1">
                  Cet onglet valide uniquement les entrées et déclarations de temps. Les retards se valident dans{' '}
                  <Link to="/app/delay-justifications" className="underline font-medium">
                    Justifications des retards
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Entrées en attente</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingValidations.entries}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Déclarations journalières</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingValidations.daily}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Déclarations hebdomadaires</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingValidations.weekly}</p>
                </div>
                <CalendarDays className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Éléments en attente de validation
            </h2>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
                </div>
              ) : validationEntriesList.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucune entrée en attente de validation</p>
              ) : (
                validationEntriesList.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      entry.validated_by ? 'border-red-200 dark:border-red-700 bg-red-50/40 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.user?.first_name && entry.user?.last_name
                          ? `${entry.user.first_name} ${entry.user.last_name}`
                          : entry.user?.username || 'Utilisateur inconnu'}{' '}
                        - Ticket {entry.ticket?.code || `#${entry.ticket_id}`}
                        {entry.ticket?.title ? ` : ${entry.ticket.title}` : ''}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(entry.time_spent)} - {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="mt-2">
                        {entry.validated_by ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            Rejetée
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            En attente
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          if (!canSubmitForValidation || entry.validated_by) return
                          toast.info('Soumis pour validation. La validation est effectuée par le demandeur du ticket depuis la fiche ticket.')
                        }}
                        disabled={!!entry.validated_by || !canSubmitForValidation}
                        title={canSubmitForValidation ? 'Soumettre en validation (la validation est effectuée par le demandeur du ticket)' : 'Réservé au département IT de la filiale fournisseur de logiciels'}
                        className={`inline-flex items-center px-4 py-2 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${canSubmitForValidation && !entry.validated_by ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60'}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Soumettre en validation
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await timesheetService.validateTimeEntry(entry.id, false)
                            toast.success('Entrée de temps rejetée')
                            await loadData()
                          } catch (error) {
                            toast.error('Erreur lors du rejet')
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!!entry.validated_by}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de création d'entrée de temps */}
      <Modal
        isOpen={isCreateEntryModalOpen}
        onClose={() => setIsCreateEntryModalOpen(false)}
        title="Nouvelle entrée de temps"
        size="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const data: CreateTimeEntryRequest = {
              ticket_id: parseInt(formData.get('ticket_id') as string),
              time_spent: convertToMinutes(String(formData.get('time_spent') || '0'), entryTimeUnit),
              date: formData.get('date') as string,
              description: (formData.get('description') as string) || undefined,
            }
            await handleCreateEntry(data)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ticket *
            </label>
            <select
              name="ticket_id"
              required
              className="input"
            >
              <option value="">Sélectionner un ticket</option>
              {tickets.map(ticket => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.code} - {ticket.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temps passé *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="time_spent"
                required
                min="0.1"
                step="0.1"
                placeholder="Ex: 8"
                className="input flex-1"
              />
              <select
                value={entryTimeUnit}
                onChange={(e) => setEntryTimeUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                className="input w-32"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Heures</option>
                <option value="days">Jours</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {entryTimeUnit === 'minutes' && 'Saisissez directement le nombre de minutes'}
              {entryTimeUnit === 'hours' && 'Saisissez le nombre d\'heures (ex: 8 pour 8 heures = 480 minutes)'}
              {entryTimeUnit === 'days' && 'Saisissez le nombre de jours (1 jour = 8 heures = 480 minutes)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Description du travail effectué..."
              className="input"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateEntryModalOpen(false)}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition d'entrée de temps */}
      {editingEntry && (
        <Modal
          isOpen={isEditEntryModalOpen}
          onClose={() => {
            setIsEditEntryModalOpen(false)
            setEditingEntry(null)
          }}
          title="Modifier l'entrée de temps"
          size="md"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const timeValue = formData.get('time_spent') as string
              const data: UpdateTimeEntryRequest = {
                time_spent: convertToMinutes(timeValue, editEntryTimeUnit),
                date: formData.get('date') as string,
                description: formData.get('description') as string || undefined,
              }
              await handleUpdateEntry(data)
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ticket
              </label>
              <input
                type="text"
                value={editingEntry.ticket?.code || `#${editingEntry.ticket_id}`}
                disabled
                className="input bg-gray-100 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={editingEntry.date.split('T')[0]}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temps passé *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="time_spent"
                  required
                  min="0.1"
                  step="0.1"
                  defaultValue={editingEntry.time_spent / (editEntryTimeUnit === 'hours' ? 60 : editEntryTimeUnit === 'days' ? 480 : 1)}
                  className="input flex-1"
                />
                <select
                  value={editEntryTimeUnit}
                  onChange={(e) => setEditEntryTimeUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                  className="input w-32"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Heures</option>
                  <option value="days">Jours</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {editEntryTimeUnit === 'minutes' && 'Saisissez directement le nombre de minutes'}
                {editEntryTimeUnit === 'hours' && 'Saisissez le nombre d\'heures (ex: 8 pour 8 heures = 480 minutes)'}
                {editEntryTimeUnit === 'days' && 'Saisissez le nombre de jours (1 jour = 8 heures = 480 minutes)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingEntry.description || ''}
                placeholder="Description du travail effectué..."
                className="input"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditEntryModalOpen(false)
                  setEditingEntry(null)
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal pour modifier le temps estimé d'un ticket */}
      {editingTicketId && (
        <Modal
          isOpen={editingTicketId !== null}
          onClose={() => {
            setEditingTicketId(null)
            setEstimatedTimeValue('')
          }}
          title="Modifier le temps estimé"
          size="sm"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const estimatedTime = parseInt(estimatedTimeValue)
              if (isNaN(estimatedTime) || estimatedTime < 0) {
                toast.error('Veuillez entrer un nombre valide')
                return
              }
              await handleSetEstimatedTime(editingTicketId!, estimatedTime)
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temps estimé (minutes) *
              </label>
              <input
                type="number"
                value={estimatedTimeValue}
                onChange={(e) => setEstimatedTimeValue(e.target.value)}
                required
                min="0"
                placeholder="Ex: 120 (pour 2 heures)"
                className="input"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {estimatedTimeValue && !isNaN(parseInt(estimatedTimeValue))
                  ? `= ${formatTime(parseInt(estimatedTimeValue))}`
                  : ''}
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingTicketId(null)
                  setEstimatedTimeValue('')
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de création de déclaration journalière */}
      <Modal
        isOpen={isCreateDailyModalOpen}
          onClose={() => {
            setIsCreateDailyModalOpen(false)
            setDailyTasks([{ ticket_id: '', time_spent: '', time_unit: 'hours' }])
            setSelectedDailyDate(new Date().toISOString().split('T')[0])
          }}
        title="Nouvelle déclaration journalière"
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await handleCreateDailyDeclaration(selectedDailyDate, dailyTasks)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={selectedDailyDate}
              onChange={(e) => setSelectedDailyDate(e.target.value)}
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tickets *
            </label>
            {dailyTasks.map((task, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={task.ticket_id}
                  onChange={(e) => {
                    const newTasks = [...dailyTasks]
                    newTasks[index].ticket_id = e.target.value
                    setDailyTasks(newTasks)
                  }}
                  required
                  className="input flex-1"
                >
                  <option value="">Sélectionner un ticket</option>
                  {tickets.map(ticket => (
                    <option key={ticket.id} value={ticket.id.toString()}>
                      {ticket.code} - {ticket.title}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={task.time_spent}
                  onChange={(e) => {
                    const newTasks = [...dailyTasks]
                    newTasks[index].time_spent = e.target.value
                    setDailyTasks(newTasks)
                  }}
                  placeholder="Temps"
                  required
                  min="0.1"
                  step="0.1"
                  className="input w-32"
                />
                <select
                  value={task.time_unit}
                  onChange={(e) => {
                    const newTasks = [...dailyTasks]
                    newTasks[index].time_unit = e.target.value as 'minutes' | 'hours' | 'days'
                    setDailyTasks(newTasks)
                  }}
                  className="input w-28"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Heures</option>
                  <option value="days">Jours</option>
                </select>
                {dailyTasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDailyTasks(dailyTasks.filter((_, i) => i !== index))
                    }}
                    className="btn btn-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDailyTasks([...dailyTasks, { ticket_id: '', time_spent: '', time_unit: 'hours' }])}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un ticket
            </button>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateDailyModalOpen(false)
                setDailyTasks([{ ticket_id: '', time_spent: '', time_unit: 'hours' }])
                setSelectedDailyDate(new Date().toISOString().split('T')[0])
              }}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de création de déclaration hebdomadaire */}
      <Modal
        isOpen={isCreateWeeklyModalOpen}
          onClose={() => {
            setIsCreateWeeklyModalOpen(false)
            setWeeklyTasks([{ ticket_id: '', time_spent: '', date: new Date().toISOString().split('T')[0], time_unit: 'hours' }])
            setSelectedWeeklyWeek('')
          }}
        title="Nouvelle déclaration hebdomadaire"
        size="lg"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!selectedWeeklyWeek) {
              toast.error('Veuillez sélectionner une semaine')
              return
            }
            await handleCreateWeeklyDeclaration(selectedWeeklyWeek, weeklyTasks)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Semaine * (Format: YYYY-MM-Wn, ex: 2024-01-W1)
            </label>
            <input
              type="text"
              value={selectedWeeklyWeek}
              onChange={(e) => setSelectedWeeklyWeek(e.target.value)}
              placeholder="2024-01-W1"
              required
              pattern="\d{4}-\d{2}-W[1-5]"
              className="input"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Format: AAAA-MM-Wn (ex: 2024-01-W1 pour la 1ère semaine de janvier 2024)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tickets *
            </label>
            {weeklyTasks.map((task, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={task.date}
                  onChange={(e) => {
                    const newTasks = [...weeklyTasks]
                    newTasks[index].date = e.target.value
                    setWeeklyTasks(newTasks)
                  }}
                  required
                  className="input w-40"
                />
                <select
                  value={task.ticket_id}
                  onChange={(e) => {
                    const newTasks = [...weeklyTasks]
                    newTasks[index].ticket_id = e.target.value
                    setWeeklyTasks(newTasks)
                  }}
                  required
                  className="input flex-1"
                >
                  <option value="">Sélectionner un ticket</option>
                  {tickets.map(ticket => (
                    <option key={ticket.id} value={ticket.id.toString()}>
                      {ticket.code} - {ticket.title}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={task.time_spent}
                  onChange={(e) => {
                    const newTasks = [...weeklyTasks]
                    newTasks[index].time_spent = e.target.value
                    setWeeklyTasks(newTasks)
                  }}
                  placeholder="Temps"
                  required
                  min="0.1"
                  step="0.1"
                  className="input w-32"
                />
                <select
                  value={task.time_unit}
                  onChange={(e) => {
                    const newTasks = [...weeklyTasks]
                    newTasks[index].time_unit = e.target.value as 'minutes' | 'hours' | 'days'
                    setWeeklyTasks(newTasks)
                  }}
                  className="input w-28"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Heures</option>
                  <option value="days">Jours</option>
                </select>
                {weeklyTasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWeeklyTasks(weeklyTasks.filter((_, i) => i !== index))
                    }}
                    className="btn btn-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setWeeklyTasks([...weeklyTasks, { ticket_id: '', time_spent: '', date: new Date().toISOString().split('T')[0], time_unit: 'hours' }])}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un ticket
            </button>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateWeeklyModalOpen(false)
                setWeeklyTasks([{ ticket_id: '', time_spent: '', date: new Date().toISOString().split('T')[0], time_unit: 'hours' }])
                setSelectedWeeklyWeek('')
              }}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Timesheet
