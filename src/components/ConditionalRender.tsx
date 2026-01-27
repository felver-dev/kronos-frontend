import React from 'react'
import { useHasAccess } from './PermissionGuard'

interface ConditionalRenderProps {
  children: React.ReactNode
  condition: boolean | (() => boolean)
  fallback?: React.ReactNode
}

/**
 * Composant simple pour afficher conditionnellement du contenu
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  condition,
  fallback = null,
}) => {
  const shouldRender = typeof condition === 'function' ? condition() : condition
  return shouldRender ? <>{children}</> : <>{fallback}</>
}

/**
 * Composant pour afficher du contenu uniquement pour certains rôles
 */
export const RoleBasedRender: React.FC<{
  children: React.ReactNode
  roles: string | string[]
  fallback?: React.ReactNode
}> = ({ children, roles, fallback = null }) => {
  const { hasRole } = useHasAccess()
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return hasRole(roleArray) ? <>{children}</> : <>{fallback}</>
}

/**
 * Composant pour afficher du contenu uniquement si l'utilisateur a une permission
 */
export const PermissionBasedRender: React.FC<{
  children: React.ReactNode
  permission: string | string[]
  fallback?: React.ReactNode
}> = ({ children, permission, fallback = null }) => {
  const { hasAnyPermission } = useHasAccess()
  const permArray = Array.isArray(permission) ? permission : [permission]
  return hasAnyPermission(permArray) ? <>{children}</> : <>{fallback}</>
}

/**
 * Composant pour afficher du contenu uniquement si l'utilisateur N'A PAS une permission
 */
export const HideIfHasPermission: React.FC<{
  children: React.ReactNode
  permission: string | string[]
  fallback?: React.ReactNode
}> = ({ children, permission, fallback = null }) => {
  const { hasAnyPermission } = useHasAccess()
  const permArray = Array.isArray(permission) ? permission : [permission]
  return hasAnyPermission(permArray) ? <>{fallback}</> : <>{children}</>
}
