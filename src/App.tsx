import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import AppLayout from './layouts/AppLayout'
import PermissionRoute from './components/PermissionRoute'
import AdminRedirect from './components/AdminRedirect'

// Pages critiques (premier écran) — chargées immédiatement
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import NotFound from './pages/NotFound'

// Lazy load du reste pour réduire le bundle initial et le nombre de requêtes
const UnifiedDashboard = lazy(() => import('./pages/Dashboard'))
const MonPanier = lazy(() => import('./pages/MonPanier'))
const Delays = lazy(() => import('./pages/Delays'))
const Profile = lazy(() => import('./pages/Profile'))
const Users = lazy(() => import('./pages/admin/Users'))
const UserDetails = lazy(() => import('./pages/admin/UserDetails'))
const Offices = lazy(() => import('./pages/admin/Offices'))
const Departments = lazy(() => import('./pages/admin/Departments'))
const AdminTickets = lazy(() => import('./pages/admin/Tickets'))
const TicketList = lazy(() => import('./pages/admin/TicketList').then(m => ({ default: m.TicketList })))
const AdminTicketDetails = lazy(() => import('./pages/admin/TicketDetails'))
const TicketInternalDetails = lazy(() => import('./pages/admin/TicketInternalDetails'))
const Assets = lazy(() => import('./pages/admin/Assets'))
const AssetSoftwareSearch = lazy(() => import('./pages/admin/AssetSoftwareSearch'))
const AssetCategories = lazy(() => import('./pages/admin/AssetCategories'))
const AssetDetails = lazy(() => import('./pages/admin/AssetDetails'))
const AdminKnowledge = lazy(() => import('./pages/admin/Knowledge'))
const AdminKnowledgeDetails = lazy(() => import('./pages/admin/KnowledgeDetails'))
const KnowledgeCategories = lazy(() => import('./pages/admin/KnowledgeCategories'))
const AdminTimesheet = lazy(() => import('./pages/admin/Timesheet'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const Roles = lazy(() => import('./pages/admin/Roles'))
const RoleDelegations = lazy(() => import('./pages/admin/RoleDelegations'))
const TicketsByCategory = lazy(() => import('./pages/admin/TicketsByCategory'))
const TicketCategories = lazy(() => import('./pages/admin/TicketCategories'))
const SLA = lazy(() => import('./pages/admin/SLA'))
const Audit = lazy(() => import('./pages/admin/Audit'))
const DelayJustifications = lazy(() => import('./pages/admin/DelayJustifications'))
const Projects = lazy(() => import('./pages/admin/Projects'))
const ProjectDetails = lazy(() => import('./pages/admin/ProjectDetails'))
const Filiales = lazy(() => import('./pages/admin/Filiales'))
const Software = lazy(() => import('./pages/admin/Software'))
const NotificationHistory = lazy(() => import('./pages/admin/NotificationHistory').then(m => ({ default: m.NotificationHistory })))

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
  </div>
)

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Redirections pour compatibilité avec les anciennes routes /admin/* */}
      <Route path="/admin/tickets/:id" element={<AdminRedirect to="/app/tickets/:id" />} />
      <Route path="/admin/tickets" element={<Navigate to="/app/tickets" replace />} />
      <Route path="/admin/users/:id" element={<AdminRedirect to="/app/users/:id" />} />
      <Route path="/admin/users" element={<Navigate to="/app/users" replace />} />
      <Route path="/admin/assets/:id" element={<AdminRedirect to="/app/assets/:id" />} />
      <Route path="/admin/assets" element={<Navigate to="/app/assets" replace />} />
      <Route path="/admin/knowledge/:id" element={<AdminRedirect to="/app/knowledge/:id" />} />
      <Route path="/admin/knowledge" element={<Navigate to="/app/knowledge" replace />} />
      <Route path="/admin/roles" element={<Navigate to="/app/roles" replace />} />
      <Route path="/admin/offices" element={<Navigate to="/app/offices" replace />} />
      <Route path="/admin/departments" element={<Navigate to="/app/departments" replace />} />
      <Route path="/admin/sla" element={<Navigate to="/app/sla" replace />} />
      <Route path="/admin/timesheet" element={<Navigate to="/app/timesheet" replace />} />
      <Route path="/admin/projects" element={<Navigate to="/app/projects" replace />} />
      <Route path="/admin/projects/:id" element={<AdminRedirect to="/app/projects/:id" />} />
      <Route path="/admin/delay-justifications" element={<Navigate to="/app/delay-justifications" replace />} />
      <Route path="/admin/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/admin/audit" element={<Navigate to="/app/audit" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/app/dashboard" replace />} />
      
      {/* Redirections pour compatibilité avec les anciennes routes /employee/* */}
      <Route path="/employee/tickets/:id" element={<AdminRedirect to="/app/tickets/:id" />} />
      <Route path="/employee/tickets" element={<Navigate to="/app/tickets" replace />} />
      <Route path="/employee/timesheet" element={<Navigate to="/app/timesheet" replace />} />
      <Route path="/employee/knowledge/:id" element={<AdminRedirect to="/app/knowledge/:id" />} />
      <Route path="/employee/knowledge" element={<Navigate to="/app/knowledge" replace />} />
      <Route path="/employee/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/employee/delays" element={<Navigate to="/app/delays" replace />} />
      <Route path="/employee/profile" element={<Navigate to="/app/profile" replace />} />
      <Route path="/employee/*" element={<Navigate to="/app/dashboard" replace />} />
      
      {/* Portail unifié - toutes les routes sous /app */}
      <Route
        path="/app"
        element={<AppLayout />}
      >
        {/* Redirection par défaut vers dashboard */}
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="dashboard" element={
          <PermissionRoute permissions={['reports.view_global', 'reports.view_filiale', 'reports.view_team', 'reports.view_own']}>
            <UnifiedDashboard />
          </PermissionRoute>
        } />

        {/* Mon panier — tickets assignés, non clôturés + alertes temps estimé */}
        <Route path="panier" element={
          <PermissionRoute permissions={['tickets.view_all', 'tickets.view_filiale', 'tickets.view_team', 'tickets.view_own', 'tickets.create']}>
            <MonPanier />
          </PermissionRoute>
        } />
        
        {/* Utilisateurs */}
        <Route path="users" element={
          <PermissionRoute permissions={['users.view_all', 'users.view_filiale', 'users.view_team', 'users.view_own', 'users.create']}>
            <Users />
          </PermissionRoute>
        } />
        <Route path="users/:id" element={
          <PermissionRoute permissions={['users.view_all', 'users.view_filiale', 'users.view_team', 'users.view_own', 'users.create']}>
            <UserDetails />
          </PermissionRoute>
        } />
        
        {/* Rôles */}
        <Route path="roles" element={
          <PermissionRoute permissions={['roles.view', 'roles.view_filiale', 'roles.view_department', 'roles.create', 'roles.update', 'roles.delete', 'roles.manage', 'roles.view_assigned_only']}>
            <Roles />
          </PermissionRoute>
        } />

        {/* Délégation de rôles (mini-admin filiale) */}
        <Route path="role-delegations" element={
          <PermissionRoute permissions={['roles.delegate_permissions', 'roles.manage']}>
            <RoleDelegations />
          </PermissionRoute>
        } />
        
        {/* Sièges */}
        <Route path="offices" element={
          <PermissionRoute permissions={['offices.view', 'offices.view_filiale', 'offices.view_all', 'offices.create', 'offices.update', 'offices.delete']}>
            <Offices />
          </PermissionRoute>
        } />
        
        {/* Départements */}
        <Route path="departments" element={
          <PermissionRoute permissions={['departments.view', 'departments.view_filiale', 'departments.view_all', 'departments.create', 'departments.update', 'departments.delete']}>
            <Departments />
          </PermissionRoute>
        } />
        
        {/* Filiales */}
        <Route path="filiales" element={
          <PermissionRoute permissions={['filiales.view', 'filiales.create', 'filiales.update', 'filiales.manage']}>
            <Filiales />
          </PermissionRoute>
        } />
        
        {/* Logiciels */}
        <Route path="software" element={
          <PermissionRoute permissions={['software.view', 'software.create', 'software.update', 'software.delete']}>
            <Software />
          </PermissionRoute>
        } />
        
        {/* Tickets */}
        <Route path="tickets" element={
          <PermissionRoute permissions={['tickets.view_all', 'tickets.view_filiale', 'tickets.view_team', 'tickets.view_own', 'tickets.create']}>
            <AdminTickets />
          </PermissionRoute>
        } />
        <Route path="tickets/list" element={
          <PermissionRoute permissions={['tickets.view_all', 'tickets.view_filiale', 'tickets.view_team', 'tickets.view_own']}>
            <TicketList />
          </PermissionRoute>
        } />
        <Route path="tickets/:id" element={
          <PermissionRoute permissions={['tickets.view_all', 'tickets.view_team', 'tickets.view_own']}>
            <AdminTicketDetails />
          </PermissionRoute>
        } />
        <Route path="ticket-internes" element={<Navigate to="/app/tickets?tab=internes" replace />} />
        <Route path="ticket-internes/:id" element={
          <PermissionRoute permissions={['tickets_internes.view_own', 'tickets_internes.view_department', 'tickets_internes.view_filiale', 'tickets_internes.view_all']}>
            <TicketInternalDetails />
          </PermissionRoute>
        } />
        <Route path="ticket-categories" element={
          <PermissionRoute permissions={['ticket_categories.view', 'ticket_categories.create', 'ticket_categories.update', 'ticket_categories.delete']}>
            <TicketCategories />
          </PermissionRoute>
        } />
        {/* Catégories de tickets (page générique) - une route pour toutes les catégories */}
        <Route path="tickets/category/:categorySlug" element={
          <PermissionRoute permissions={[
            'incidents.view', 'incidents.view_all', 'incidents.view_team', 'incidents.view_own',
            'service_requests.view', 'service_requests.view_all', 'service_requests.view_team', 'service_requests.view_own',
            'changes.view', 'changes.view_all', 'changes.view_team', 'changes.view_own',
            'tickets.view_all', 'tickets.view_filiale', 'tickets.view_team', 'tickets.view_own', 'tickets.create',
            'ticket_categories.view',
          ]}>
            <TicketsByCategory />
          </PermissionRoute>
        } />
        {/* Redirections anciennes URLs catégories → nouvelle URL */}
        <Route path="incidents" element={<Navigate to="/app/tickets/category/incident" replace />} />
        <Route path="service-requests" element={<Navigate to="/app/tickets/category/demande" replace />} />
        <Route path="changes" element={<Navigate to="/app/tickets/category/changement" replace />} />
        <Route path="development" element={<Navigate to="/app/tickets/category/developpement" replace />} />
        <Route path="assistance" element={<Navigate to="/app/tickets/category/assistance" replace />} />
        <Route path="support" element={<Navigate to="/app/tickets/category/support" replace />} />
        
        {/* Actifs IT */}
        <Route path="assets" element={
          <PermissionRoute permissions={['assets.view_all', 'assets.view_team', 'assets.view_own']}>
            <Assets />
          </PermissionRoute>
        } />
        <Route path="assets/software" element={
          <PermissionRoute permissions={['assets.view_all', 'assets.view_team', 'assets.view_own']}>
            <AssetSoftwareSearch />
          </PermissionRoute>
        } />
        <Route path="assets/:id" element={
          <PermissionRoute permissions={['assets.view_all', 'assets.view_team', 'assets.view_own']}>
            <AssetDetails />
          </PermissionRoute>
        } />
        <Route path="asset-categories" element={
          <PermissionRoute permissions={['asset_categories.view', 'asset_categories.create', 'asset_categories.update', 'asset_categories.delete']}>
            <AssetCategories />
          </PermissionRoute>
        } />
        
        {/* Base de connaissances */}
        <Route path="knowledge" element={
          <PermissionRoute permissions={[
            'knowledge.view_all', 'knowledge.view_published', 'knowledge.view_own',
            'knowledge.create', 'knowledge.update', 'knowledge.delete', 'knowledge.publish'
          ]}>
            <AdminKnowledge />
          </PermissionRoute>
        } />
        <Route path="knowledge/:id" element={
          <PermissionRoute permissions={[
            'knowledge.view_all', 'knowledge.view_published', 'knowledge.view_own',
            'knowledge.create', 'knowledge.update', 'knowledge.delete', 'knowledge.publish'
          ]}>
            <AdminKnowledgeDetails />
          </PermissionRoute>
        } />
        <Route path="knowledge-categories" element={
          <PermissionRoute permissions={['knowledge_categories.view', 'knowledge_categories.create', 'knowledge_categories.update', 'knowledge_categories.delete']}>
            <KnowledgeCategories />
          </PermissionRoute>
        } />
        
        {/* SLA */}
        <Route path="sla" element={
          <PermissionRoute permissions={['sla.view', 'sla.view_all', 'sla.view_team', 'sla.view_own', 'sla.manage', 'sla.create', 'sla.update', 'sla.delete']}>
            <SLA />
          </PermissionRoute>
        } />
        
        {/* Gestion du temps */}
        <Route path="timesheet" element={
          <PermissionRoute permissions={['timesheet.view_all', 'timesheet.view_team', 'timesheet.view_own', 'timesheet.create_entry']}>
            <AdminTimesheet />
          </PermissionRoute>
        } />

        {/* Projets */}
        <Route path="projects" element={
          <PermissionRoute permissions={['projects.view', 'projects.view_all', 'projects.view_team', 'projects.view_own', 'projects.create']}>
            <Projects />
          </PermissionRoute>
        } />
        <Route path="projects/:id" element={
          <PermissionRoute permissions={['projects.view', 'projects.view_all', 'projects.view_team', 'projects.view_own']}>
            <ProjectDetails />
          </PermissionRoute>
        } />
        
        {/* Justifications retards */}
        <Route path="delay-justifications" element={
          <PermissionRoute permissions={['delays.view_all', 'delays.view_department', 'delays.view_own', 'timesheet.justify_delay']}>
            <DelayJustifications />
          </PermissionRoute>
        } />
        <Route path="delays" element={
          <PermissionRoute permissions={['timesheet.justify_delay', 'delays.view_all', 'delays.view_department', 'delays.view_own']}>
            <Delays />
          </PermissionRoute>
        } />
        
        {/* Rapports */}
        <Route path="reports" element={
          <PermissionRoute permissions={['reports.view_global', 'reports.view_team']}>
            <Reports />
          </PermissionRoute>
        } />
        
        {/* Audit */}
        <Route path="audit" element={
          <PermissionRoute permissions={['audit.view_all', 'audit.view_team', 'audit.view_own']}>
            <Audit />
          </PermissionRoute>
        } />
        
        {/* Paramètres */}
        <Route path="settings" element={
          <PermissionRoute permissions={['settings.view', 'settings.update', 'settings.manage']}>
            <Settings />
          </PermissionRoute>
        } />
        
        {/* Profil */}
        <Route path="profile" element={<Profile />} />

        {/* Historique des notifications */}
        <Route path="notifications/history" element={<NotificationHistory />} />
      </Route>

      {/* Redirection par défaut */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      
        {/* Route 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
