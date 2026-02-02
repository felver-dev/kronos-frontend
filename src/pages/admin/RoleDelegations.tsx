import { useEffect, useMemo, useState } from 'react'
import { Edit, Key, Loader2, Plus, Search, Shield, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { useToastContext } from '../../contexts/ToastContext'
import { roleService, CreateRoleRequest, RoleDTO, UpdateRoleRequest } from '../../services/roleService'
import { permissionService, PermissionDTO } from '../../services/permissionService'

const RoleDelegations = () => {
  const toast = useToastContext()
  const { user, refreshUser, hasPermission } = useAuth()

  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: '',
    description: '',
  })

  // Édition et suppression de rôles délégués
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState<RoleDTO | null>(null)
  const [editFormData, setEditFormData] = useState<UpdateRoleRequest>({ name: '', description: '' })
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<RoleDTO | null>(null)

  // État pour le modal de permissions (comme dans Roles.tsx)
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false)
  const [roleForPermissions, setRoleForPermissions] = useState<RoleDTO | null>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [permissions, setPermissions] = useState<PermissionDTO[]>([])
  const [assignableCodes, setAssignableCodes] = useState<string[]>([])
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [permissionsModalReadOnly, setPermissionsModalReadOnly] = useState(false)
  const [showOnlyAssignedInModal, setShowOnlyAssignedInModal] = useState(false)

  // Préfixe de rôle basé sur la filiale (ex: NIGER-)
  const [filialePrefix, setFilialePrefix] = useState<string>('')

  const myUserId = useMemo(() => {
    const raw = user?.id
    const n = typeof raw === 'string' ? Number(raw) : Number(raw)
    return Number.isFinite(n) ? n : null
  }, [user?.id])

  // Rôles créés par l'utilisateur courant : on affiche les actions (modifier, supprimer, gérer les permissions)
  const canManageRole = (role: RoleDTO) =>
    role.created_by_id != null && myUserId != null && Number(role.created_by_id) === Number(myUserId)

  // Charger le préfixe de filiale (code ou nom en majuscules) à partir du user (pas d'appel API protégé)
  useEffect(() => {
    const base =
      ((user as any)?.filiale_code ||
        (user as any)?.filiale_name ||
        '')?.toString().toUpperCase()

    setFilialePrefix(base ? `${base}-` : '')
  }, [user])

  const load = async () => {
    try {
      setLoading(true)
      // Uniquement les rôles délégués créés par l'utilisateur courant
      const list = await roleService.getMyDelegations()
      setRoles(list)
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors du chargement des rôles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q))
  }, [roles, searchTerm])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    const suffix = formData.name?.trim() || ''
    if (!suffix) {
      toast.error('Le nom du rôle est requis')
      return
    }

    // Construire le nom complet avec préfixe (ex: NIGER-DEV)
    const fullName = `${filialePrefix || ''}${suffix}`.toUpperCase()

    if (fullName === 'ADMIN') {
      toast.error('Le nom ADMIN est réservé')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateRoleRequest = {
        name: fullName,
        description: formData.description?.trim() || undefined,
      }

      await roleService.create(payload)
      toast.success('Rôle délégué créé')
      setIsCreateOpen(false)
      setFormData({ name: '', description: '' })
      await load()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (role: RoleDTO) => {
    setRoleToEdit(role)
    setEditFormData({ name: role.name, description: role.description || '' })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleToEdit || !editFormData.name?.trim()) {
      toast.error('Le nom du rôle est requis')
      return
    }
    setIsSubmitting(true)
    try {
      await roleService.update(roleToEdit.id, editFormData)
      toast.success('Rôle mis à jour')
      setIsEditModalOpen(false)
      setRoleToEdit(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDelete = (role: RoleDTO) => {
    setRoleToDelete(role)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!roleToDelete) return
    setIsSubmitting(true)
    try {
      await roleService.delete(roleToDelete.id)
      toast.success('Rôle supprimé')
      setIsDeleteModalOpen(false)
      setRoleToDelete(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  // Fallback: si l’API ne renvoie pas created_by_id, on laisse l’accès mais on masque la liste
  const canList = myUserId !== null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Délégation des rôles</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
            Créez des rôles pour votre filiale avec un sous-ensemble de vos permissions
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center w-full sm:w-auto flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base font-medium rounded-lg bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="truncate">Créer un rôle délégué</span>
        </button>
      </div>

      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
          </div>
        </div>
      </div>

      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {!canList ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-400">
            Impossible d’identifier votre utilisateur. Rafraîchissez la page.
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun rôle pour votre filiale</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Key className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{role.description || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {canManageRole(role) ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await refreshUser()
                                  const perms = await roleService.getPermissions(role.id)
                                  const rolePermsList = Array.isArray(perms) ? perms : []
                                  setRoleForPermissions(role)
                                  setRolePermissions(rolePermsList)
                                  setPermissionsModalReadOnly(false)
                                  setShowOnlyAssignedInModal(false)
                                  const [codes, allPerms] = await Promise.all([
                                    roleService.getAssignablePermissions(),
                                    permissionService.getAll(),
                                  ])
                                  setAssignableCodes(codes)
                                  const permData = Array.isArray(allPerms) ? allPerms : (allPerms as any).data || []
                                  const permList = (permData as PermissionDTO[]).filter(p => codes.includes(p.code))
                                  setPermissions(permList)
                                  setOpenModules(new Set())
                                  setIsPermissionsOpen(true)
                                } catch (e) {
                                  console.error(e)
                                  toast.error('Erreur lors du chargement des permissions')
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            >
                              Gérer les permissions
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(role)}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(role)}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : hasPermission('roles.view_assigned_only') ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const perms = await roleService.getPermissions(role.id)
                                const rolePermsList = Array.isArray(perms) ? perms : []
                                setRoleForPermissions(role)
                                setRolePermissions(rolePermsList)
                                setPermissionsModalReadOnly(true)
                                setShowOnlyAssignedInModal(false)
                                const allPerms = await permissionService.getAll()
                                const permData = Array.isArray(allPerms) ? allPerms : (allPerms as any).data || []
                                setPermissions((permData as PermissionDTO[]).filter(p => rolePermsList.includes(p.code)))
                                setOpenModules(new Set())
                                setIsPermissionsOpen(true)
                              } catch (e) {
                                console.error(e)
                                toast.error('Erreur lors du chargement des permissions')
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Voir les permissions assignées"
                          >
                            Voir les permissions
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Rôle attribué par l'administration</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setFormData({ name: '', description: '' })
        }}
        title="Créer un rôle délégué"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du rôle *</label>
            <div className="flex items-center gap-2">
              {filialePrefix && (
                <span className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                  {filialePrefix}
                </span>
              )}
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={filialePrefix ? `${filialePrefix}DEV` : 'Ex: NIGER-DEV'}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Description du rôle..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false)
                setFormData({ name: '', description: '' })
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setRoleToEdit(null)
        }}
        title="Modifier le rôle"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du rôle *</label>
            <input
              type="text"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false)
                setRoleToEdit(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setRoleToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer le rôle"
        message={`Êtes-vous sûr de vouloir supprimer le rôle "${roleToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isSubmitting}
      />

      {/* Modal de gestion des permissions (UX similaire à Roles) */}
      <Modal
        isOpen={isPermissionsOpen}
        onClose={() => {
          setIsPermissionsOpen(false)
          setRoleForPermissions(null)
          setRolePermissions([])
          setOpenModules(new Set())
        }}
        title={roleForPermissions ? `Permissions du rôle ${roleForPermissions.name}` : 'Permissions du rôle'}
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Vous ne pouvez déléguer que les permissions que vous possédez vous-même. Les permissions sont automatiquement rafraîchies à l'ouverture de ce modal.
          </p>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {(() => {
              // Regrouper par module
              const byModule = permissions.reduce((acc, perm) => {
                const module = perm.module || 'other'
                if (!acc[module]) acc[module] = []
                acc[module].push(perm)
                return acc
              }, {} as Record<string, PermissionDTO[]>)

              // Noms d'affichage des modules en français (mêmes conventions que la page Roles)
              const MODULE_DISPLAY_NAMES: Record<string, string> = {
                tickets: 'Tickets',
                ticket_categories: 'Catégories de tickets',
                users: 'Utilisateurs',
                roles: 'Rôles',
                offices: 'Sièges',
                departments: 'Départements',
                assets: 'Actifs',
                asset_categories: 'Catégories d\'actifs',
                knowledge: 'Base de connaissances',
                knowledge_categories: 'Catégories de connaissances',
                incidents: 'Incidents',
                service_requests: 'Demandes de service',
                changes: 'Changements',
                sla: 'SLA',
                timesheet: 'Gestion du temps',
                time_entries: 'Entrées de temps',
                delays: 'Retards',
                projects: 'Projets',
                audit: 'Audit',
                reports: 'Rapports',
                settings: 'Paramètres',
                search: 'Recherche',
                other: 'Autres',
              }

              return Object.entries(byModule).map(([module, modulePerms]) => {
                const isOpen = openModules.has(module)
                const checkedCount = modulePerms.filter(p => rolePermissions.includes(p.code)).length
                const totalCount = modulePerms.length

                const toggleModule = (m: string) => {
                  setOpenModules(prev => {
                    const next = new Set(prev)
                    if (next.has(m)) next.delete(m)
                    else next.add(m)
                    return next
                  })
                }

                const toggleAllInModule = (modulePermissions: PermissionDTO[]) => {
                  const assignableInModule = modulePermissions.filter(p => assignableCodes.includes(p.code)).map(p => p.code)
                  const allAssignableSelected = assignableInModule.length > 0 && assignableInModule.every(c => rolePermissions.includes(c))
                  if (allAssignableSelected) {
                    setRolePermissions(prev => prev.filter(c => !assignableInModule.includes(c)))
                  } else {
                    setRolePermissions(prev => [...new Set([...prev, ...assignableInModule])])
                  }
                }

                const togglePermission = (code: string) => {
                  if (!assignableCodes.includes(code)) return
                  setRolePermissions(prev => (prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]))
                }

                return (
                  <div key={module} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleModule(module)}
                        className="flex items-center space-x-3 flex-1 text-left min-w-0"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                        )}
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {MODULE_DISPLAY_NAMES[module] || module}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          ({checkedCount}/{totalCount})
                        </span>
                      </button>
                      {!permissionsModalReadOnly && (
                        <button
                          type="button"
                          onClick={() => toggleAllInModule(modulePerms)}
                          className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded shrink-0 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        >
                          {checkedCount === totalCount ? 'Tout décocher' : 'Tout cocher'}
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {modulePerms.map((permission) => {
                            const isChecked = rolePermissions.includes(permission.code)
                            const canToggle = assignableCodes.includes(permission.code)
                            return (
                              <label
                                key={permission.code}
                                className={`flex items-center p-3 rounded-lg border transition-all ${canToggle ? 'cursor-pointer' : 'cursor-default opacity-90'} ${
                                  isChecked
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                } ${!canToggle ? 'ring-1 ring-amber-200 dark:ring-amber-800' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!canToggle}
                                  onChange={() => togglePermission(permission.code)}
                                  className="w-4 h-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 disabled:opacity-70"
                                />
                                <div className="ml-3 flex-1">
                                  {/* D'abord l'explication (description) en gras */}
                                  {permission.description && (
                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {permission.description}
                                    </div>
                                  )}
                                  {/* Puis le code technique, plus discret */}
                                  <div className={`mt-0.5 text-xs ${permission.description ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                                    {permission.code}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsPermissionsOpen(false)
                setRoleForPermissions(null)
                setRolePermissions([])
                setOpenModules(new Set())
                setPermissionsModalReadOnly(false)
                setShowOnlyAssignedInModal(false)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {permissionsModalReadOnly ? 'Fermer' : 'Annuler'}
            </button>
            {!permissionsModalReadOnly && (
              <button
                type="button"
                onClick={async () => {
                  if (!roleForPermissions) return

                  // N'envoyer que les permissions que l'utilisateur peut déléguer (évite d'attribuer des permissions qu'il n'a pas)
                  const toSave = rolePermissions.filter(p => assignableCodes.includes(p))

                  try {
                    await roleService.updatePermissions(roleForPermissions.id, toSave)
                    toast.success('Permissions mises à jour')
                    setIsPermissionsOpen(false)
                    setRoleForPermissions(null)
                    setRolePermissions([])
                    setOpenModules(new Set())
                    setPermissionsModalReadOnly(false)
                    setShowOnlyAssignedInModal(false)
                  } catch (e) {
                    console.error(e)
                    toast.error(e instanceof Error ? e.message : 'Erreur lors de la mise à jour des permissions')
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RoleDelegations

