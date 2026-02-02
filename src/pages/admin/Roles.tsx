import { useState, useEffect } from 'react'
import { Shield, Plus, Edit, Trash2, Key, Loader2, Search, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import { roleService, RoleDTO, CreateRoleRequest, UpdateRoleRequest } from '../../services/roleService'
import { permissionService, PermissionDTO } from '../../services/permissionService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { AccessDenied } from '../../components/AccessDenied'

const Roles = () => {
  const toast = useToastContext()
  const { user, hasPermission, refreshUser } = useAuth()
  // Peut modifier/supprimer un rôle : droits update/delete/manage OU créateur du rôle (délégation)
  const canManageRole = (role: RoleDTO) =>
    hasPermission('roles.update') ||
    hasPermission('roles.manage') ||
    (hasPermission('roles.delegate_permissions') && role.created_by_id != null && Number(role.created_by_id) === Number(user?.id))
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [permissions, setPermissions] = useState<PermissionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // États pour les modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  
  // États pour les formulaires
  const [roleToEdit, setRoleToEdit] = useState<RoleDTO | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RoleDTO | null>(null)
  const [roleForPermissions, setRoleForPermissions] = useState<RoleDTO | null>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set()) // Modules ouverts/fermés
  
  const [createFormData, setCreateFormData] = useState<CreateRoleRequest>({
    name: '',
    description: '',
    permissions: [],
    filiale_id: undefined,
  })
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loadingFiliales, setLoadingFiliales] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [assignablePermissions, setAssignablePermissions] = useState<string[]>([]) // Permissions que l'utilisateur peut déléguer
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]) // Permissions sélectionnées lors de la création
  const [editFormData, setEditFormData] = useState<UpdateRoleRequest>({
    name: '',
    description: '',
  })
  const [permissionsModalReadOnly, setPermissionsModalReadOnly] = useState(false)
  const [showOnlyAssignedInModal, setShowOnlyAssignedInModal] = useState(false)

  const loadFiliales = async () => {
    setLoadingFiliales(true)
    try {
      const data = await filialeService.getAll(true)
      setFiliales(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur chargement filiales:', err)
      setFiliales([])
    } finally {
      setLoadingFiliales(false)
    }
  }

  // Charger les rôles et permissions
  useEffect(() => {
    // Vérifier les permissions avant de charger les données
    if (!hasPermission('roles.view') && !hasPermission('roles.view_filiale') && !hasPermission('roles.view_department') && !hasPermission('roles.create') && !hasPermission('roles.update') && !hasPermission('roles.delete') && !hasPermission('roles.manage') && !hasPermission('roles.delegate_permissions') && !hasPermission('roles.view_assigned_only')) {
      setLoading(false)
      return
    }
    loadRoles()
    // Charger les permissions assignables si l'utilisateur peut déléguer
    if (hasPermission('roles.delegate_permissions') || hasPermission('roles.manage')) {
      loadAssignablePermissions()
    } else if (hasPermission('roles.view_assigned_only')) {
      // Voir uniquement les permissions assignées : charger toutes les permissions pour afficher les détails en lecture seule
      loadPermissions()
    } else {
      loadPermissions()
    }
  }, [hasPermission])

  useEffect(() => {
    if (isCreateModalOpen && filiales.length === 0 && !loadingFiliales) {
      loadFiliales()
    }
  }, [isCreateModalOpen])

  const loadRoles = async () => {
    try {
      const response = await roleService.getAll()
      // Gérer le cas où la réponse est dans un objet { data: ... }
      const data = Array.isArray(response) ? response : (response as any).data || []
      setRoles(data)
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error)
      toast.error('Erreur lors du chargement des rôles')
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const response = await permissionService.getAll()
      // Gérer le cas où la réponse est dans un objet { data: ... }
      const data = Array.isArray(response) ? response : (response as any).data || []
      setPermissions(data)
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error)
      toast.error('Erreur lors du chargement des permissions')
    }
  }

  const loadAssignablePermissions = async () => {
    try {
      const assignablePerms = await roleService.getAssignablePermissions()
      setAssignablePermissions(assignablePerms)
      
      // Charger aussi toutes les permissions pour avoir les détails (nom, description, module)
      const allPerms = await permissionService.getAll()
      const allPermsData = Array.isArray(allPerms) ? allPerms : (allPerms as any).data || []
      
      // Filtrer pour ne garder que les permissions assignables
      const filteredPerms = allPermsData.filter((p: PermissionDTO) => assignablePerms.includes(p.code))
      setPermissions(filteredPerms)
    } catch (error) {
      console.error('Erreur lors du chargement des permissions assignables:', error)
      toast.error('Erreur lors du chargement des permissions assignables')
      // Fallback : charger toutes les permissions
      loadPermissions()
    }
  }

  // Grouper les permissions par module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    const module = perm.module || 'other'
    if (!acc[module]) {
      acc[module] = []
    }
    acc[module].push(perm)
    return acc
  }, {} as Record<string, PermissionDTO[]>)

  // Créer un rôle
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission('roles.create') && !hasPermission('roles.manage')) {
      toast.error('Vous n\'avez pas la permission de créer un rôle')
      return
    }
    
    if (!createFormData.name.trim()) {
      toast.error('Le nom du rôle est requis')
      return
    }

    // Empêcher la création d'un rôle avec le nom "ADMIN"
    if (createFormData.name.toUpperCase() === 'ADMIN') {
      toast.error('Impossible de créer un rôle avec le nom ADMIN (rôle système réservé)')
      return
    }

    setIsSubmitting(true)
    try {
      // Inclure les permissions sélectionnées dans la requête
      const dataToSend: CreateRoleRequest = {
        ...createFormData,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : undefined,
      }
      
      await roleService.create(dataToSend)
      toast.success('Rôle créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({ name: '', description: '', permissions: [] })
      setSelectedPermissions([])
      loadRoles()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du rôle')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition (créateur du rôle ou droits update/manage)
  const handleOpenEdit = (role: RoleDTO) => {
    if (!canManageRole(role)) {
      toast.error('Vous n\'avez pas la permission de modifier ce rôle')
      return
    }
    setRoleToEdit(role)
    setEditFormData({
      name: role.name,
      description: role.description || '',
    })
    setIsEditModalOpen(true)
  }

  // Modifier un rôle
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleToEdit || !canManageRole(roleToEdit)) {
      toast.error('Vous n\'avez pas la permission de modifier ce rôle')
      return
    }
    if (!editFormData.name?.trim()) {
      toast.error('Le nom du rôle est requis')
      return
    }

    setIsSubmitting(true)
    try {
      await roleService.update(roleToEdit.id, editFormData)
      toast.success('Rôle mis à jour avec succès')
      setIsEditModalOpen(false)
      setRoleToEdit(null)
      loadRoles()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du rôle')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal de suppression (créateur du rôle ou droits delete/manage)
  const handleOpenDelete = (role: RoleDTO) => {
    if (!canManageRole(role)) {
      toast.error('Vous n\'avez pas la permission de supprimer ce rôle')
      return
    }
    setRoleToDelete(role)
    setIsDeleteModalOpen(true)
  }

  // Supprimer un rôle
  const handleDelete = async () => {
    if (!roleToDelete || !canManageRole(roleToDelete)) {
      toast.error('Vous n\'avez pas la permission de supprimer ce rôle')
      setIsDeleteModalOpen(false)
      setRoleToDelete(null)
      return
    }

    setIsSubmitting(true)
    try {
      await roleService.delete(roleToDelete.id)
      toast.success('Rôle supprimé avec succès')
      setIsDeleteModalOpen(false)
      setRoleToDelete(null)
      loadRoles()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du rôle')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal de gestion des permissions (créateur du rôle, droits update/manage, ou view_assigned_only en lecture seule)
  const handleOpenPermissions = async (role: RoleDTO) => {
    const canEdit = canManageRole(role) && (hasPermission('roles.delegate_permissions') || hasPermission('roles.manage'))
    const canViewOnly = hasPermission('roles.view_assigned_only')
    if (!canManageRole(role) && !canViewOnly) {
      toast.error('Vous n\'avez pas la permission de voir ou gérer les permissions de ce rôle')
      return
    }
    setRoleForPermissions(role)
    setPermissionsModalReadOnly(!canEdit)
    setShowOnlyAssignedInModal(false)
    try {
      const rolePerms = await roleService.getPermissions(role.id)
      const rolePermsList = Array.isArray(rolePerms) ? rolePerms : []
      setRolePermissions(rolePermsList)
      const allPerms = await permissionService.getAll()
      const allPermsData = Array.isArray(allPerms) ? allPerms : (allPerms as any).data || []
      if (!canEdit) {
        // Lecture seule : afficher uniquement les permissions assignées au rôle
        setPermissions((allPermsData as PermissionDTO[]).filter(p => rolePermsList.includes(p.code)))
      } else {
        if (!hasPermission('roles.manage') && assignablePermissions.length === 0) {
          await loadAssignablePermissions()
        }
        const list = hasPermission('roles.manage')
          ? allPermsData
          : (allPermsData as PermissionDTO[]).filter(p => assignablePermissions.includes(p.code))
        setPermissions(list)
      }
      setOpenModules(new Set())
      setIsPermissionsModalOpen(true)
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error)
      toast.error('Erreur lors du chargement des permissions du rôle')
    }
  }

  // Toggle l'ouverture/fermeture d'un module
  const toggleModule = (module: string) => {
    setOpenModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(module)) {
        newSet.delete(module)
      } else {
        newSet.add(module)
      }
      return newSet
    })
  }

  // Toggle une permission (seulement si l'utilisateur peut la déléguer)
  const togglePermission = (permissionCode: string) => {
    if (!assignablePermissions.includes(permissionCode)) return
    setRolePermissions(prev => {
      if (prev.includes(permissionCode)) {
        return prev.filter(p => p !== permissionCode)
      } else {
        return [...prev, permissionCode]
      }
    })
  }

  // Tout sélectionner / tout décocher (en haut du modal, uniquement les permissions déléguables)
  const toggleAllPermissions = () => {
    const assignableInList = permissions.filter(p => assignablePermissions.includes(p.code))
    const allAssignableSelected = assignableInList.length > 0 && assignableInList.every(p => rolePermissions.includes(p.code))
    // → on affiche "Tout décocher", l’action doit tout décocher
    // !allSelected → on affiche "Tout sélectionner", l’action doit tout cocher
    if (allAssignableSelected) {
      setRolePermissions(prev => prev.filter(c => !assignablePermissions.includes(c)))
    } else {
      setRolePermissions(prev => [...new Set([...prev, ...assignableInList.map(p => p.code)])])
    }
  }

  // Tout cocher / tout décocher pour un module (uniquement les permissions déléguables)
  const toggleAllInModule = (modulePermissions: PermissionDTO[]) => {
    const assignableCodes = modulePermissions.filter(p => assignablePermissions.includes(p.code)).map(p => p.code)
    const allAssignableInModuleSelected = assignableCodes.length > 0 && assignableCodes.every(c => rolePermissions.includes(c))
    if (allAssignableInModuleSelected) {
      setRolePermissions(prev => prev.filter(c => !assignableCodes.includes(c)))
    } else {
      setRolePermissions(prev => [...new Set([...prev, ...assignableCodes])])
    }
  }

  // Sauvegarder les permissions
  const handleSavePermissions = async () => {
    if (!roleForPermissions || !canManageRole(roleForPermissions)) {
      toast.error('Vous n\'avez pas la permission de modifier les permissions de ce rôle')
      setIsPermissionsModalOpen(false)
      setRoleForPermissions(null)
      setRolePermissions([])
      return
    }

    // Si l'utilisateur peut déléguer des permissions (pas admin système),
    // valider que toutes les permissions sélectionnées sont assignables
    // (sauf celles déjà assignées au rôle, pour éviter de les perdre)
    if (hasPermission('roles.delegate_permissions') && assignablePermissions.length > 0 && !hasPermission('roles.manage')) {
      // Récupérer les permissions actuellement assignées au rôle
      const currentRolePerms = roleForPermissions ? await roleService.getPermissions(roleForPermissions.id).catch(() => []) : []
      const currentRolePermsSet = new Set(Array.isArray(currentRolePerms) ? currentRolePerms : [])
      
      // Vérifier que toutes les nouvelles permissions sont assignables
      // (on permet de garder les permissions déjà assignées même si elles ne sont plus assignables)
      const newPermissions = rolePermissions.filter(perm => !currentRolePermsSet.has(perm))
      const invalidPermissions = newPermissions.filter(perm => !assignablePermissions.includes(perm))
      
      if (invalidPermissions.length > 0) {
        toast.error(`Vous ne pouvez assigner que les permissions que vous possédez vous-même. Permissions invalides: ${invalidPermissions.join(', ')}`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const toSave = hasPermission('roles.manage') ? rolePermissions : rolePermissions.filter(p => assignablePermissions.includes(p))
      await roleService.updatePermissions(roleForPermissions.id, toSave)
      toast.success('Permissions mises à jour avec succès')
      setIsPermissionsModalOpen(false)
      setRoleForPermissions(null)
      setRolePermissions([])
      loadRoles() // Recharger pour mettre à jour les infos
      
      // Toujours rafraîchir les permissions de l'utilisateur actuel
      // pour s'assurer que l'UI se met à jour immédiatement
      try {
        await refreshUser()
      } catch (refreshError) {
        console.error('Erreur lors de refreshUser:', refreshError)
      }
      
      toast.info('Vos permissions ont été mises à jour. Les menus sont actualisés.')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour des permissions')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtrer les rôles
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Ordre d'affichage des modules (groupe les catégories avec leur parent : KB+catégories KB, Actifs+catégories actifs, etc.)
  const MODULE_DISPLAY_ORDER = [
    'tickets', 'ticket_categories',
    'users', 'roles', 'offices', 'departments',
    'assets', 'asset_categories',
    'knowledge', 'knowledge_categories',
    'incidents', 'service_requests', 'changes',
    'sla', 'timesheet', 'time_entries', 'delays', 'projects',
    'audit', 'reports', 'settings', 'search',
    'other',
  ]

  // Noms d'affichage des modules
  const MODULE_DISPLAY_NAMES: Record<string, string> = {
    'tickets': 'Tickets',
    'ticket_categories': 'Catégories de tickets',
    'users': 'Utilisateurs',
    'roles': 'Rôles',
    'offices': 'Sièges',
    'departments': 'Départements',
    'assets': 'Actifs',
    'asset_categories': 'Catégories d\'actifs',
    'knowledge': 'Base de connaissances',
    'knowledge_categories': 'Catégories de connaissances',
    'incidents': 'Incidents',
    'service_requests': 'Demandes de service',
    'changes': 'Changements',
    'sla': 'SLA',
    'timesheet': 'Feuille de temps',
    'time_entries': 'Entrées de temps',
    'delays': 'Retards',
    'projects': 'Projets',
    'audit': 'Audit',
    'reports': 'Rapports',
    'settings': 'Paramètres',
    'search': 'Recherche',
    'other': 'Autres',
  }

  const sortedModuleEntries = Object.entries(permissionsByModule).sort(([a], [b]) => {
    const ia = MODULE_DISPLAY_ORDER.indexOf(a)
    const ib = MODULE_DISPLAY_ORDER.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return a.localeCompare(b)
  })

  // Pour le modal : filtrer à "assignées uniquement" si l'utilisateur peut éditer et a activé le filtre
  const displayedModuleEntriesInModal = showOnlyAssignedInModal && !permissionsModalReadOnly
    ? sortedModuleEntries
        .map(([module, perms]) => [module, perms.filter(p => rolePermissions.includes(p.code))] as [string, PermissionDTO[]])
        .filter(([, perms]) => perms.length > 0)
    : sortedModuleEntries

  // Formater le nom du module
  const formatModuleName = (module: string): string => {
    const moduleMap: Record<string, string> = {
      tickets: 'Tickets',
      users: 'Utilisateurs',
      roles: 'Rôles',
      assets: 'Actifs',
      incidents: 'Incidents',
      service_requests: 'Demandes de service',
      changes: 'Changements',
      knowledge: 'Base de connaissances',
      timesheet: 'Saisie du temps',
      time_entries: 'Entrées de temps',
      delays: 'Retards',
      projects: 'Projets',
      audit: 'Audit',
      sla: 'SLA',
      settings: 'Paramètres',
      reports: 'Rapports',
      search: 'Recherche',
      offices: 'Sièges',
      departments: 'Départements',
      asset_categories: 'Catégories d\'actifs',
      knowledge_categories: 'Catégories de connaissances',
      ticket_categories: 'Catégories de tickets',
      other: 'Autres',
    }
    return moduleMap[module] || module
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission('roles.view') && !hasPermission('roles.view_filiale') && !hasPermission('roles.view_department') && !hasPermission('roles.create') && !hasPermission('roles.update') && !hasPermission('roles.delete') && !hasPermission('roles.manage') && !hasPermission('roles.delegate_permissions') && !hasPermission('roles.view_assigned_only')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les rôles" />
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestion des rôles</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Créez et gérez les rôles et leurs permissions
          </p>
        </div>
        <PermissionGuard permissions={['roles.create', 'roles.manage']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un rôle
          </button>
        </PermissionGuard>
      </div>

      {/* Barre de recherche */}
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

      {/* Liste des rôles */}
      <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {filteredRoles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun rôle trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {role.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {role.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.is_system ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Système
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Personnalisé
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canManageRole(role) && (
                          <button
                            onClick={() => handleOpenPermissions(role)}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Gérer les permissions"
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Permissions
                          </button>
                        )}
                        {!canManageRole(role) && hasPermission('roles.view_assigned_only') && (
                          <button
                            onClick={() => handleOpenPermissions(role)}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Voir les permissions assignées"
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Voir les permissions
                          </button>
                        )}
                        {!role.is_system && canManageRole(role) && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(role)}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(role)}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredRoles.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRoles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({ name: '', description: '', permissions: [], filiale_id: undefined })
          setSelectedPermissions([])
          setOpenModules(new Set())
        }}
        title="Créer un nouveau rôle"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du rôle *
            </label>
            <input
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: CHEF_SERVICE"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filiale (optionnel)
            </label>
            {loadingFiliales ? (
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                Chargement des filiales...
              </div>
            ) : (
              <select
                value={createFormData.filiale_id ?? ''}
                onChange={(e) => setCreateFormData({ ...createFormData, filiale_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Aucune (rôle global) —</option>
                {filiales.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} – {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Description du rôle..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setCreateFormData({ name: '', description: '', permissions: [], filiale_id: undefined })
                setSelectedPermissions([])
                setOpenModules(new Set())
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du rôle *
            </label>
            <input
              type="text"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
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

      {/* Modal de gestion des permissions */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false)
          setRoleForPermissions(null)
          setRolePermissions([])
          setOpenModules(new Set())
          setPermissionsModalReadOnly(false)
          setShowOnlyAssignedInModal(false)
        }}
        title={permissionsModalReadOnly ? `Voir les permissions assignées - ${roleForPermissions?.name}` : `Gérer les permissions - ${roleForPermissions?.name}`}
        size="lg"
      >
        <div className="space-y-3">
          {/* Toggle "Afficher uniquement les permissions assignées" (mode édition uniquement) */}
          {!permissionsModalReadOnly && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAssignedInModal}
                onChange={(e) => setShowOnlyAssignedInModal(e.target.checked)}
                className="w-4 h-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Afficher uniquement les permissions assignées</span>
            </label>
          )}

          {/* Bouton tout sélectionner / tout décocher en haut (masqué en lecture seule) */}
          {!permissionsModalReadOnly && (() => {
            const allSelected = permissions.length > 0 && permissions.every(p => rolePermissions.includes(p.code))
            return (
              <button
                type="button"
                onClick={toggleAllPermissions}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  allSelected
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700/50 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                }`}
              >
                {allSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                {allSelected ? 'Tout décocher' : 'Tout sélectionner'}
              </button>
            )
          })()}

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {displayedModuleEntriesInModal.map(([module, modulePermissions]) => {
            const isOpen = openModules.has(module)
            const checkedCount = modulePermissions.filter(p => rolePermissions.includes(p.code)).length
            const totalCount = modulePermissions.length
            
            return (
              <div key={module} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* En-tête du module : toggle + bouton tout cocher */}
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
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {MODULE_DISPLAY_NAMES[module] || module}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      ({checkedCount}/{totalCount})
                    </span>
                  </button>
                  {!permissionsModalReadOnly && (() => {
                    const allInModuleSelected = totalCount > 0 && checkedCount === totalCount
                    return (
                      <button
                        type="button"
                        onClick={() => toggleAllInModule(modulePermissions)}
                        className={`ml-2 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded shrink-0 ${
                          allInModuleSelected
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                        }`}
                        title={allInModuleSelected ? 'Décocher toutes les permissions de ce module' : 'Cocher toutes les permissions de ce module'}
                      >
                        {allInModuleSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                        {allInModuleSelected ? 'Tout décocher' : 'Tout cocher'}
                      </button>
                    )
                  })()}
                </div>
                
                {/* Contenu pliable */}
                {isOpen && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {modulePermissions.map((permission) => {
                        const isChecked = rolePermissions.includes(permission.code)
                        const canToggle = !permissionsModalReadOnly && assignablePermissions.includes(permission.code)
                        return (
                          <label
                            key={permission.id}
                            className={`flex items-center p-3 rounded-lg border transition-all ${
                              canToggle ? 'cursor-pointer' : 'cursor-default opacity-90'
                            } ${
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
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {permission.name}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {permission.description}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsPermissionsModalOpen(false)
                setRoleForPermissions(null)
                setRolePermissions([])
                setPermissionsModalReadOnly(false)
                setShowOnlyAssignedInModal(false)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {permissionsModalReadOnly ? 'Fermer' : 'Annuler'}
            </button>
            {!permissionsModalReadOnly && (
              <button
                onClick={handleSavePermissions}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les permissions'
                )}
              </button>
            )}
          </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Roles
