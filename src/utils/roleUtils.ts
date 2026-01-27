/**
 * Utilitaires pour la gestion des rôles et permissions
 * 
 * ⚠️ ATTENTION: Ces fonctions sont utilisées UNIQUEMENT pour l'affichage (labels, etc.)
 * L'accès aux fonctionnalités est déterminé UNIQUEMENT par les permissions, pas par les rôles.
 * Ne pas utiliser ces fonctions pour déterminer l'accès aux routes ou fonctionnalités.
 */

export type BackendRole = 'DSI' | 'CHEF_SERVICE' | 'INGENIEUR' | 'ADMIN_SYSTEME' | 'RESPONSABLE_IT' | 'TECHNICIEN_IT' | 'USER' | 'CLIENT'
export type FrontendRole = 'admin' | 'chef_service' | 'ingenieur' | 'admin_systeme' | 'technician' | 'employee'

/**
 * Mappe un rôle backend vers un rôle frontend
 * ⚠️ Utilisé uniquement pour l'affichage, pas pour l'accès
 */
export const mapBackendRoleToFrontend = (backendRole: string): FrontendRole => {
  const roleMap: Record<string, FrontendRole> = {
    'DSI': 'admin',
    'CHEF_SERVICE': 'chef_service',
    'INGENIEUR': 'ingenieur',
    'ADMIN_SYSTEME': 'admin_systeme',
    'RESPONSABLE_IT': 'chef_service', // Compatibilité avec ancien système
    'TECHNICIEN_IT': 'ingenieur', // Compatibilité avec ancien système
    'USER': 'employee',
    'CLIENT': 'employee',
    'DEVELOPPEUR': 'employee', // Rôle DEVELOPPEUR créé par l'admin → employee
    'ADMIN': 'admin', // Rôle ADMIN en majuscules (créé par le seeding)
    // Rôles frontend déjà mappés
    'admin': 'admin',
    'chef_service': 'chef_service',
    'ingenieur': 'ingenieur',
    'admin_systeme': 'admin_systeme',
    'technician': 'ingenieur',
    'employee': 'employee',
  }
  // Si le rôle n'est pas dans le map, mapper vers 'employee' par défaut
  // sauf s'il contient "ADMIN" ou "DSI"
  if (roleMap[backendRole]) {
    return roleMap[backendRole]
  }
  const upperRole = backendRole.toUpperCase()
  if (upperRole.includes('ADMIN') || upperRole.includes('DSI')) {
    return 'admin'
  }
  return 'employee'
}

/**
 * Vérifie si un rôle a des droits d'administration
 */
export const isAdminRole = (role: string): boolean => {
  const mappedRole = mapBackendRoleToFrontend(role)
  return mappedRole === 'admin' || mappedRole === 'admin_systeme'
}

/**
 * Vérifie si un rôle peut superviser une équipe
 */
export const isSupervisorRole = (role: string): boolean => {
  const mappedRole = mapBackendRoleToFrontend(role)
  return mappedRole === 'admin' || mappedRole === 'chef_service'
}

/**
 * Vérifie si un rôle peut traiter des tickets
 */
export const isTechnicianRole = (role: string): boolean => {
  const mappedRole = mapBackendRoleToFrontend(role)
  return mappedRole === 'ingenieur' || mappedRole === 'admin' || mappedRole === 'chef_service'
}

/**
 * Retourne le libellé d'un rôle
 */
export const getRoleLabel = (role: string): string => {
  const mappedRole = mapBackendRoleToFrontend(role)
  const labels: Record<FrontendRole, string> = {
    'admin': 'Directeur des Systèmes d\'Informations',
    'chef_service': 'Chef de Service IT',
    'ingenieur': 'Ingénieur IT',
    'admin_systeme': 'Administrateur Système',
    'technician': 'Technicien IT',
    'employee': 'Employé',
  }
  return labels[mappedRole] || role
}

/**
 * Retourne le niveau hiérarchique d'un rôle (plus le nombre est élevé, plus le rôle est haut)
 */
export const getRoleLevel = (role: string): number => {
  const mappedRole = mapBackendRoleToFrontend(role)
  const levels: Record<FrontendRole, number> = {
    'admin': 4,
    'admin_systeme': 3,
    'chef_service': 2,
    'ingenieur': 1,
    'technician': 1,
    'employee': 0,
  }
  return levels[mappedRole] || 0
}

/**
 * Vérifie si un rôle peut voir les données d'un autre rôle
 */
export const canViewRoleData = (viewerRole: string, targetRole: string): boolean => {
  const viewerLevel = getRoleLevel(viewerRole)
  const targetLevel = getRoleLevel(targetRole)
  return viewerLevel >= targetLevel
}
