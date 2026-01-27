import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PermissionDenied } from './PermissionDenied'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  roles?: string[]
  fallback?: React.ReactNode
  showIfNoPermission?: boolean
  showMessage?: boolean // Nouvelle prop pour afficher un message au lieu de masquer
  message?: string // Message personnalisé
  compact?: boolean // Mode compact pour le message
}

/**
 * Composant pour afficher conditionnellement du contenu basé sur les permissions ou rôles
 * 
 * @example
 * // Afficher uniquement si l'utilisateur a la permission
 * <PermissionGuard permission="tickets.create">
 *   <button>Créer un ticket</button>
 * </PermissionGuard>
 * 
 * @example
 * // Afficher un message si pas de permission
 * <PermissionGuard permission="tickets.delete" showMessage>
 *   <button>Supprimer</button>
 * </PermissionGuard>
 * 
 * @example
 * // Avec fallback personnalisé
 * <PermissionGuard permission="tickets.delete" fallback={<p>Vous ne pouvez pas supprimer</p>}>
 *   <button>Supprimer</button>
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  roles,
  fallback,
  showIfNoPermission = false,
  showMessage = true, // Par défaut, afficher un message
  message,
  compact = false,
}) => {
  const { user, hasPermission } = useAuth()

  // Si showIfNoPermission est true, inverser la logique
  if (showIfNoPermission) {
    const hasAccess = checkAccess()
    return hasAccess ? (fallback || null) : <>{children}</>
  }

  // Vérifier l'accès normal
  const hasAccess = checkAccess()
  
  if (hasAccess) {
    return <>{children}</>
  }

  // Si showMessage est true et qu'on n'a pas de fallback personnalisé, afficher le message
  if (showMessage && !fallback) {
    return (
      <PermissionDenied 
        message={message || 'Vous n\'avez pas les permissions nécessaires pour accéder à cette fonctionnalité'}
        compact={compact}
      />
    )
  }

  return <>{fallback || null}</>

  function checkAccess(): boolean {
    if (!user) return false

    // Vérifier les rôles d'abord
    if (roles && roles.length > 0) {
      const userRole = user.role?.toLowerCase()
      const hasRole = roles.some(role => role.toLowerCase() === userRole)
      if (hasRole) return true
    }

    // Vérifier les permissions
    if (permission) {
      return hasPermission(permission)
    }

    if (permissions && permissions.length > 0) {
      // Si plusieurs permissions, au moins une doit être présente
      return permissions.some(perm => hasPermission(perm))
    }

    // Si aucun critère n'est spécifié, afficher par défaut
    return true
  }
}

/**
 * Hook pour vérifier si l'utilisateur a une permission ou un rôle
 */
export const useHasAccess = () => {
  const { user, hasPermission } = useAuth()

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.some(role => role.toLowerCase() === user.role?.toLowerCase())
  }

  const hasAnyPermission = (permissions: string | string[]): boolean => {
    if (!user) return false
    const permArray = Array.isArray(permissions) ? permissions : [permissions]
    return permArray.some(perm => hasPermission(perm))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false
    return permissions.every(perm => hasPermission(perm))
  }

  return {
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasPermission,
    user,
  }
}

export default PermissionGuard
