import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { hasAnyFeaturePermission } from '../utils/featurePermissions'
import {
  LayoutDashboard,
  Users,
  Ticket,
  HardDrive,
  BookOpen,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  AlertTriangle,
  FileText,
  GitBranch,
  Shield,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Code,
  HelpCircle,
  Headphones,
  LucideIcon,
  Building2,
  MapPin,
  Briefcase,
  User,
  ShoppingCart,
  FolderKanban,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { ticketCategoryService, TicketCategoryDTO } from '../services/ticketCategoryService'
import { UserAvatar } from '../components/UserAvatar'

const AppLayout = () => {
  const { user, logout, hasPermission, permissionsVersion } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryDTO[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])
  
  // Navigation basée uniquement sur les permissions
  const navigationItems = [
    { 
      name: 'Dashboard', 
      href: '/app/dashboard', 
      icon: LayoutDashboard,
      feature: 'dashboard'
    },
    { 
      name: 'Mon panier', 
      href: '/app/panier', 
      icon: ShoppingCart,
      feature: 'tickets'
    },
    { 
      name: 'Entreprise', 
      href: '#', 
      icon: Building2,
      feature: 'users' // Vérifie users ou roles
    },
    { 
      name: 'Tickets', 
      href: '/app/tickets', 
      icon: Ticket,
      feature: 'tickets'
    },
    { 
      name: 'Actifs IT', 
      href: '#', 
      icon: HardDrive,
      feature: 'assets'
    },
    { 
      name: 'Base de connaissances', 
      href: '#', 
      icon: BookOpen,
      feature: 'knowledge'
    },
    { 
      name: 'SLA', 
      href: '/app/sla', 
      icon: Shield,
      feature: 'sla'
    },
    { 
      name: 'Gestion du temps', 
      href: '/app/timesheet', 
      icon: Clock,
      feature: 'timesheet'
    },
    { 
      name: 'Projets', 
      href: '/app/projects', 
      icon: FolderKanban,
      feature: 'projects'
    },
    { 
      name: 'Justifications retards', 
      href: '/app/delay-justifications', 
      icon: AlertTriangle,
      feature: 'delays'
    },
    { 
      name: 'Audit', 
      href: '/app/audit', 
      icon: FileSearch,
      feature: 'audit'
    },
    { 
      name: 'Paramètres', 
      href: '/app/settings', 
      icon: Settings,
      feature: 'settings'
    },
    { 
      name: 'Mon profil', 
      href: '/app/profile', 
      icon: User,
      feature: null // Toujours visible
    },
  ]


  const getCategoryIcon = (slug: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      incident: AlertTriangle,
      'service-request': FileText,
      'service_request': FileText,
      demande: FileText,
      change: GitBranch,
      changement: GitBranch,
      development: Code,
      developpement: Code,
      assistance: HelpCircle,
      support: Headphones,
    }
    return iconMap[slug] || Layers
  }

  /** Toutes les catégories de tickets utilisent la page générique /app/tickets/category/:categorySlug */
  const getCategoryRoute = (slug: string): string => `/app/tickets/category/${slug}`

  const loadTicketCategories = async () => {
    if (!user) {
      setTicketCategories([])
      setLoadingCategories(false)
      return
    }
    try {
      setLoadingCategories(true)
      const categories = await ticketCategoryService.getAll(true)
      const sortedCategories = [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      setTicketCategories(sortedCategories)
    } catch (error) {
      console.error('Erreur lors du chargement des catégories de tickets:', error)
      setTicketCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    loadTicketCategories()
  }, [user])

  // Recharger le menu quand une catégorie est ajoutée/modifiée/supprimée (depuis la page Gérer les catégories)
  useEffect(() => {
    const onCategoriesChanged = () => loadTicketCategories()
    window.addEventListener('ticketCategoriesChanged', onCategoriesChanged)
    return () => window.removeEventListener('ticketCategoriesChanged', onCategoriesChanged)
  }, [user])

  useEffect(() => {
    const isOnCategoryPage =
      location.pathname === '/app/tickets' ||
      location.pathname.startsWith('/app/tickets/category/') ||
      location.pathname === '/app/ticket-categories'
    if (isOnCategoryPage) {
      setCategoriesOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/app/assets') || location.pathname.startsWith('/app/asset-categories')) {
      setAssetsOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/app/knowledge') || location.pathname.startsWith('/app/knowledge-categories')) {
      setKnowledgeOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/app/users') || 
        location.pathname.startsWith('/app/roles') ||
        location.pathname.startsWith('/app/offices') || 
        location.pathname.startsWith('/app/departments')) {
      setCompanyOpen(true)
    }
  }, [location.pathname])

  // Mémoriser les éléments de navigation filtrés pour forcer le re-render quand les permissions changent
  // Utiliser permissionsVersion comme dépendance principale pour éviter les recalculs inutiles
  const permissionsKey = user?.permissions ? JSON.stringify(user.permissions.sort()) : ''
  const filteredNavigationItems = useMemo(() => {
    return navigationItems.filter((item) => {
      if (!item.feature) return true
      
      if (item.name === 'Entreprise') {
        return hasAnyFeaturePermission(user?.permissions, 'users') ||
               hasAnyFeaturePermission(user?.permissions, 'roles')
      }
      
      return hasAnyFeaturePermission(user?.permissions, item.feature)
    })
  }, [permissionsKey, permissionsVersion])

  const isActive = (path: string) => location.pathname === path
  const isActiveOrChild = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 ${
            sidebarCollapsed ? 'px-2 justify-center' : 'px-6'
          }`}>
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Kronos</h1>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title={sidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <nav 
            key={`nav-${permissionsVersion}`}
            className={`flex-1 py-6 space-y-1 overflow-y-auto ${
              sidebarCollapsed ? 'px-2' : 'px-4'
            }`}
          >
            {filteredNavigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <div key={`${item.name}-${permissionsVersion}`}>
                  {item.href === '#' ? (
                    null
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center py-3 text-sm font-medium rounded-lg transition-colors ${
                        sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                      } ${
                        active
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  )}

                  {/* Menu Entreprise */}
                  {item.name === 'Entreprise' && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setCompanyOpen((prev) => !prev)}
                        className={`w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors ${
                          sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                        } ${
                          isActiveOrChild('/app/users') || isActiveOrChild('/app/roles') || 
                          isActiveOrChild('/app/offices') || isActiveOrChild('/app/departments')
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={sidebarCollapsed ? 'Entreprise' : ''}
                      >
                        <Building2 className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">Entreprise</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                companyOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        )}
                      </button>
                      {companyOpen && (
                        <div className={`mt-1 space-y-1 ${sidebarCollapsed ? 'pl-0' : 'pl-6'}`}>
                          {(hasPermission('users.view_all') || hasPermission('users.view_team') || hasPermission('users.view_own')) && (
                            <Link
                              to="/app/users"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/users')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Utilisateurs' : ''}
                            >
                              <Users className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Utilisateurs</span>}
                            </Link>
                          )}
                          {(hasPermission('roles.view') || hasPermission('roles.create') || hasPermission('roles.update') || hasPermission('roles.delete') || hasPermission('roles.manage')) && (
                            <Link
                              to="/app/roles"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/roles')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Rôles' : ''}
                            >
                              <Shield className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Rôles</span>}
                            </Link>
                          )}
                          {(hasPermission('offices.view') || hasPermission('offices.create') || hasPermission('offices.update') || hasPermission('offices.delete')) && (
                            <Link
                              to="/app/offices"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/offices')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Sièges' : ''}
                            >
                              <MapPin className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Sièges</span>}
                            </Link>
                          )}
                          {(hasPermission('departments.view') || hasPermission('departments.create') || hasPermission('departments.update') || hasPermission('departments.delete')) && (
                            <Link
                              to="/app/departments"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/departments')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Départements' : ''}
                            >
                              <Briefcase className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Départements</span>}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Menu Actifs IT (indépendant des tickets : assets.* ou asset_categories.*) */}
                  {item.name === 'Actifs IT' && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setAssetsOpen((prev) => !prev)}
                        className={`w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors ${
                          sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                        } ${
                          isActiveOrChild('/app/assets') || isActive('/app/asset-categories')
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={sidebarCollapsed ? 'Actifs IT' : ''}
                      >
                        <HardDrive className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">Actifs IT</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                assetsOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        )}
                      </button>
                      {assetsOpen && (
                        <div className={`mt-1 space-y-1 ${sidebarCollapsed ? 'pl-0' : 'pl-6'}`}>
                          {(hasPermission('asset_categories.view') || hasPermission('asset_categories.create') || hasPermission('asset_categories.update') || hasPermission('asset_categories.delete')) && (
                            <Link
                              to="/app/asset-categories"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActive('/app/asset-categories')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Catégories' : ''}
                            >
                              <Layers className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Catégories</span>}
                            </Link>
                          )}
                          {(hasPermission('assets.view_all') || hasPermission('assets.view_team') || hasPermission('assets.view_own')) && (
                            <>
                              <Link
                                to="/app/assets"
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                  sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                                }                                 ${
                                  isActive('/app/assets') || (location.pathname.startsWith('/app/assets/') && !location.pathname.startsWith('/app/assets/software'))
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title={sidebarCollapsed ? 'Gestion des actifs' : ''}
                              >
                                <HardDrive className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                                {!sidebarCollapsed && <span>Gestion des actifs</span>}
                              </Link>
                              <Link
                                to="/app/assets/software"
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                  sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                                } ${
                                  isActive('/app/assets/software')
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title={sidebarCollapsed ? 'Gestion des logiciels' : ''}
                              >
                                <FileSearch className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                                {!sidebarCollapsed && <span>Gestion des logiciels</span>}
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Menu Base de connaissances (indépendant des tickets : knowledge.* ou knowledge_categories.*) */}
                  {item.name === 'Base de connaissances' && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setKnowledgeOpen((prev) => !prev)}
                        className={`w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors ${
                          sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                        } ${
                          isActiveOrChild('/app/knowledge') || isActive('/app/knowledge-categories')
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={sidebarCollapsed ? 'Base de connaissances' : ''}
                      >
                        <BookOpen className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">Base de connaissances</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                knowledgeOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        )}
                      </button>
                      {knowledgeOpen && (
                        <div className={`mt-1 space-y-1 ${sidebarCollapsed ? 'pl-0' : 'pl-6'}`}>
                          {(hasPermission('knowledge_categories.view') || hasPermission('knowledge_categories.create') || hasPermission('knowledge_categories.update') || hasPermission('knowledge_categories.delete')) && (
                            <Link
                              to="/app/knowledge-categories"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActive('/app/knowledge-categories')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Catégories' : ''}
                            >
                              <Layers className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Catégories</span>}
                            </Link>
                          )}
                          {(hasPermission('knowledge.view_all') || hasPermission('knowledge.view_published') || hasPermission('knowledge.view_own') || hasPermission('knowledge.create') || hasPermission('knowledge.update') || hasPermission('knowledge.delete') || hasPermission('knowledge.publish')) && (
                            <Link
                              to="/app/knowledge"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/knowledge')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Gestion de BC' : ''}
                            >
                              <BookOpen className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Gestion de BC</span>}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Menu Catégories de tickets */}
                  {item.name === 'Tickets' && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setCategoriesOpen((prev) => !prev)}
                        className={`w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors ${
                          sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                        } text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
                        title={sidebarCollapsed ? 'Catégories' : ''}
                      >
                        <Layers className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">Catégories des tickets</span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                categoriesOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        )}
                      </button>
                      {categoriesOpen && (
                        <div className={`mt-1 space-y-1 ${sidebarCollapsed ? 'pl-0' : 'pl-6'}`}>
                          {(hasPermission('ticket_categories.view') || hasPermission('ticket_categories.create') || hasPermission('ticket_categories.update') || hasPermission('ticket_categories.delete')) && (
                            <Link
                              to="/app/ticket-categories"
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                              } ${
                                isActiveOrChild('/app/ticket-categories')
                                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={sidebarCollapsed ? 'Gérer les catégories' : ''}
                            >
                              <Settings className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                              {!sidebarCollapsed && <span>Gérer les catégories</span>}
                            </Link>
                          )}
                          {loadingCategories ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                              Chargement...
                            </div>
                          ) : ticketCategories.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                              Aucune catégorie
                            </div>
                          ) : (
                            ticketCategories.map((category) => {
                              const Icon = getCategoryIcon(category.slug)
                              const route = getCategoryRoute(category.slug)
                              const isCategoryActive = isActive(route)
                              return (
                                <Link
                                  key={category.id}
                                  to={route}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`flex items-center py-2 text-sm rounded-lg transition-colors ${
                                    sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                                  } ${
                                    isCategoryActive
                                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                  title={sidebarCollapsed ? category.name : ''}
                                >
                                  <Icon className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                                  {!sidebarCollapsed && <span>{category.name}</span>}
                                </Link>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className={`border-t border-gray-200 dark:border-gray-700 ${
            sidebarCollapsed ? 'p-2' : 'p-4'
          }`}>
            <div className={`flex items-center mb-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <UserAvatar
                userId={Number(user?.id) || 0}
                avatar={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="md"
              />
              {!sidebarCollapsed && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{user?.role}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              className={`w-full flex items-center py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center px-2' : 'px-4'
              }`}
              title={sidebarCollapsed ? 'Déconnexion' : ''}
            >
              <LogOut className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
              {!sidebarCollapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title={sidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleTheme()
                }}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
                type="button"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
