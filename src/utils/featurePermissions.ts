/**
 * Utilitaires pour raisonner en termes de « features » côté frontend,
 * en s'appuyant UNIQUEMENT sur les permissions fournies par le backend.
 *
 * Objectif : ne plus avoir à hardcoder la liste complète des permissions ici.
 * On se base sur une convention de nommage `module.action` côté backend.
 */

/**
 * Vérifie si l'utilisateur a au moins une permission liée à un feature.
 *
 * - On se base sur le préfixe avant le premier point : `tickets.*`, `sla.*`, etc.
 * - Les permissions viennent directement du backend (`user.permissions`).
 *
 * @param userPermissions Liste des permissions de l'utilisateur (provenant du backend)
 * @param feature Nom du module/feature (ex: 'tickets', 'sla', 'assets', 'delays'...)
 */
export const hasAnyFeaturePermission = (
  userPermissions: string[] | undefined,
  feature: string
): boolean => {
  // S'assurer qu'on a bien un tableau de strings
  if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false
  }

  // Cas générique : on considère qu'une permission appartient à un feature
  // si elle commence par "<feature>."
  const hasPrefixPermission = userPermissions.some((perm) =>
    perm.startsWith(`${feature}.`)
  )

  if (hasPrefixPermission) {
    return true
  }

  // Cas particuliers (cross-features) que l'on ne peut pas déduire par simple préfixe
  if (feature === 'delays') {
    return userPermissions.some(
      (perm) =>
        perm.startsWith('delays.') ||
        perm === 'timesheet.justify_delay' ||
        perm === 'timesheet.validate_justification'
    )
  }

  if (feature === 'dashboard') {
    // Dashboard = tout ce qui est lié aux rapports
    return userPermissions.some((perm) => perm.startsWith('reports.'))
  }

  if (feature === 'users') {
    return userPermissions.some((perm) => perm.startsWith('users.'))
  }

  if (feature === 'roles') {
    return userPermissions.some((perm) => perm.startsWith('roles.'))
  }

  // Actifs IT : assets.* ou asset_categories.* (menu indépendant des tickets)
  if (feature === 'assets') {
    return userPermissions.some(
      (perm) => perm.startsWith('assets.') || perm.startsWith('asset_categories.')
    )
  }

  // Base de connaissances : knowledge.* ou knowledge_categories.* (menu indépendant des tickets)
  if (feature === 'knowledge') {
    return userPermissions.some(
      (perm) => perm.startsWith('knowledge.') || perm.startsWith('knowledge_categories.')
    )
  }

  // Par défaut : uniquement le préfixe <feature>.
  return false
}
