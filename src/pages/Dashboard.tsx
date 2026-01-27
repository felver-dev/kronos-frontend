import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import EmployeeDashboard from './EmployeeDashboard'
import Reports from './admin/Reports'

type DashboardTab = 'mon' | 'department' | 'global'

/**
 * Dashboard unifié qui s'adapte selon les permissions de l'utilisateur.
 * - reports.view_global : accès au dashboard global (tous les tickets)
 * - reports.view_team : accès au tableau de bord du département
 * - Sinon : uniquement "Mon tableau de bord" (stats personnelles)
 *
 * L'utilisateur peut basculer entre :
 * - Mon tableau de bord : ses tickets, son timesheet, ses retards (EmployeeDashboard)
 * - Tableau de bord du département : agrégats du département (Reports, scope équipe)
 * - Dashboard global : agrégats globaux (Reports, scope global, si view_global)
 */
const UnifiedDashboard = () => {
  const { hasPermission } = useAuth()
  const hasViewTeam = hasPermission('reports.view_team')
  const hasViewGlobal = hasPermission('reports.view_global')
  const hasReportAccess = hasViewTeam || hasViewGlobal

  const [activeTab, setActiveTab] = useState<DashboardTab>('mon')
  const hasAutoSelectedGlobal = useRef(false)

  // Une fois l'auth chargée : si uniquement view_global, afficher le Dashboard global par défaut (comportement historique)
  useEffect(() => {
    if (hasAutoSelectedGlobal.current) return
    if (hasViewGlobal && !hasViewTeam) {
      setActiveTab('global')
      hasAutoSelectedGlobal.current = true
    }
  }, [hasViewGlobal, hasViewTeam])

  // Pas d'accès aux rapports → uniquement le tableau de bord personnel
  if (!hasReportAccess) {
    return <EmployeeDashboard />
  }

  const showDepartment = hasViewTeam
  const showGlobal = hasViewGlobal

  const handleTab = (tab: DashboardTab) => {
    if (tab === 'department' && !showDepartment) return
    if (tab === 'global' && !showGlobal) return
    setActiveTab(tab)
  }

  return (
    <div className="space-y-4">
      {/* Barre d'onglets : Mon tableau de bord | Tableau de bord du département | Dashboard global */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => handleTab('mon')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'mon'
              ? 'bg-primary-600 text-white dark:bg-primary-500'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Mon tableau de bord
        </button>
        {showDepartment && (
          <button
            type="button"
            onClick={() => handleTab('department')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'department'
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Tableau de bord du département
          </button>
        )}
        {showGlobal && (
          <button
            type="button"
            onClick={() => handleTab('global')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-primary-600 text-white dark:bg-primary-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Dashboard global
          </button>
        )}
      </div>

      {activeTab === 'mon' && <EmployeeDashboard />}
      {activeTab === 'department' && (
        <Reports
          title="Tableau de bord du département"
          subtitle="Vue d'ensemble des tickets et indicateurs de votre département"
        />
      )}
      {activeTab === 'global' && (
        <Reports
          title="Dashboard global"
          subtitle="Vue d'ensemble de votre système Kronos"
        />
      )}
    </div>
  )
}

export default UnifiedDashboard
