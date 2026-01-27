import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AccessDenied } from './AccessDenied'

interface PermissionRouteProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  fallback?: React.ReactNode
  showMessage?: boolean // Afficher un message au lieu de rediriger
}

/**
 * Composant pour protéger une route par permissions
 * Affiche un message d'accès refusé si l'utilisateur n'a pas les permissions nécessaires
 * 
 * @example
 * <Route path="users" element={
 *   <PermissionRoute permission="users.view_all">
 *     <Users />
 *   </PermissionRoute>
 * } />
 * 
 * @example
 * <Route path="assets" element={
 *   <PermissionRoute permissions={['assets.view_all', 'assets.view_team', 'assets.view_own']}>
 *     <Assets />
 *   </PermissionRoute>
 * } />
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  permissions,
  fallback,
  showMessage = true, // Par défaut, afficher un message
}) => {
  const { user, hasPermission, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Vérifier les permissions
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    // Si plusieurs permissions, au moins une doit être présente
    hasAccess = permissions.some(perm => hasPermission(perm))
  } else {
    // Si aucune permission n'est spécifiée, autoriser l'accès
    hasAccess = true
  }

  if (!hasAccess) {
    if (showMessage && !fallback) {
      // Afficher un message d'accès refusé au lieu de rediriger
      return (
        <AccessDenied message="Vous n'avez pas les permissions nécessaires pour accéder à cette page. Veuillez contacter votre administrateur pour obtenir les permissions appropriées." />
      )
    }
    // Utiliser le fallback personnalisé ou rediriger vers le dashboard
    return fallback || <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

export default PermissionRoute
