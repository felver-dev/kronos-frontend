import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Users as UsersIcon, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Pagination from '../../components/Pagination'
import CreateUserForm from '../../components/forms/CreateUserForm'
import EditUserForm from '../../components/forms/EditUserForm'
import { userService, CreateUserRequest, UpdateUserRequest, UserDTO } from '../../services/userService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { AccessDenied } from '../../components/AccessDenied'
import { UserAvatar } from '../../components/UserAvatar'

const Users = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [formResetKey, setFormResetKey] = useState(0)

  // Filtres
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Fonction pour charger les utilisateurs
  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userService.getAll()
      setUsers(data)
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  // Charger les utilisateurs au montage
  useEffect(() => {
    // Vérifier les permissions avant de charger les données
    if (!hasPermission('users.view_all') && !hasPermission('users.view_filiale') && !hasPermission('users.view_team') && !hasPermission('users.view_own') && !hasPermission('users.create')) {
      setError('Vous n\'avez pas la permission de voir les utilisateurs')
      setLoading(false)
      return
    }
    loadUsers()
  }, [hasPermission])

  // Recharger les données quand on revient sur la page (par exemple depuis UserDetails)
  useEffect(() => {
    // Recharger si on vient de UserDetails (détecté par le pathname)
    if (location.pathname === '/admin/users' && location.state?.refresh) {
      console.log('Rechargement de la liste des utilisateurs après modification')
      loadUsers()
    }
  }, [location.pathname, location.state])

  // Recharger aussi quand la page redevient visible (focus)
  useEffect(() => {
    const handleFocus = () => {
      // Recharger les données quand la fenêtre reprend le focus
      if (location.pathname === '/admin/users') {
        console.log('Rechargement de la liste des utilisateurs au focus')
        loadUsers()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [location.pathname])

  // Afficher le nom du rôle tel que renvoyé par l'API (configurable par l'organisation)
  const formatRole = (role: string): string => role || '-'

  // Fonction pour formater la date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Jamais'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  // Fonction pour ouvrir le modal de modification
  const handleEdit = (user: UserDTO) => {
    // Vérifier les permissions avant d'ouvrir le modal
    if (!hasPermission('users.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un utilisateur')
      return
    }
    
    setEditingUser(user)
    setIsEditModalOpen(true)
  }

  // Fonction pour modifier un utilisateur
  const handleUpdate = async (data: UpdateUserRequest) => {
    if (!editingUser) return

    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission('users.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un utilisateur')
      setIsEditModalOpen(false)
      setEditingUser(null)
      return
    }

    setIsSubmitting(true)
    try {
      await userService.update(editingUser.id, data)
      setIsEditModalOpen(false)
      setEditingUser(null)
      await loadUsers() // Rafraîchir la liste
      toast.success("Utilisateur modifié avec succès")
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification de l'utilisateur")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour ouvrir le modal de confirmation de suppression
  const handleDeleteClick = (user: UserDTO) => {
    // Vérifier les permissions avant d'ouvrir le modal
    if (!hasPermission('users.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un utilisateur')
      return
    }
    
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  // Fonction pour confirmer et supprimer un utilisateur
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission('users.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un utilisateur')
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
      return
    }

    setDeletingId(userToDelete.id)
    setIsSubmitting(true)
    try {
      await userService.delete(userToDelete.id)
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
      await loadUsers() // Rafraîchir la liste
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression de l'utilisateur")
    } finally {
      setDeletingId(null)
      setIsSubmitting(false)
    }
  }

  // Liste des départements disponibles (à partir des utilisateurs chargés)
  const departmentOptions = useMemo(() => {
    const codes = new Set<string>()
    users.forEach((user) => {
      const code = user.department?.code || user.department?.name
      if (code) {
        codes.add(code)
      }
    })
    return Array.from(codes).sort()
  }, [users])

  // Filtrer les utilisateurs selon le terme de recherche + filtres
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase()

    return users.filter((user) => {
      // Recherche texte
      const matchesSearch =
        !term ||
        (user.first_name || '').toLowerCase().includes(term) ||
        (user.last_name || '').toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term)

      // Filtre statut
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)

      // Filtre département
      const userDeptCode = user.department?.code || user.department?.name || ''
      const matchesDepartment =
        departmentFilter === 'all' || departmentFilter === userDeptCode

      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [users, searchTerm, statusFilter, departmentFilter])

  // Calculer la pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Réinitialiser à la page 1 si le terme de recherche ou les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, departmentFilter])

  // Réinitialiser à la page 1 si le nombre d'éléments par page change
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission('users.view_all') && !hasPermission('users.view_filiale') && !hasPermission('users.view_team') && !hasPermission('users.view_own') && !hasPermission('users.create')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les utilisateurs" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="order-2 md:order-1 w-full min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">Utilisateurs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Gérez tous les utilisateurs du système</p>
        </div>
        <div className="order-1 md:order-2 flex-shrink-0 w-full md:w-auto">
          <PermissionGuard permission="users.create">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary flex items-center w-full sm:w-auto justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvel utilisateur
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, identifiant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Filtre statut */}
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Statut
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input pl-9"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>

          {/* Filtre département */}
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Département
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input"
            >
              <option value="all">Tous les départements</option>
              {departmentOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tableau des utilisateurs */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des utilisateurs...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Aucun utilisateur ne correspond à votre recherche' : 'Aucun utilisateur trouvé'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedUsers.map((user) => {
                  const fullName = user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.username
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserAvatar
                            userId={user.id}
                            avatar={user.avatar}
                            firstName={user.first_name}
                            lastName={user.last_name}
                            username={user.username}
                            size="md"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {fullName}
                            </div>
                            {user.department && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {user.department.name} {user.department.code ? `(${user.department.code})` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`badge ${
                            user.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.last_login)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/app/users/${user.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                            title="Voir"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <PermissionGuard permission="users.update" showMessage={false}>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permission="users.delete" showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              disabled={deletingId === user.id}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Supprimer"
                            >
                              {deletingId === user.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </div>

      {/* Modal d'ajout d'utilisateur */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormResetKey((prev) => prev + 1) // Réinitialiser le formulaire à la fermeture
        }}
        title="Nouvel utilisateur"
        size="md"
      >
        {isModalOpen && (
          <CreateUserForm
            key={formResetKey} // Forcer le remontage du composant pour réinitialiser
            onSubmit={async (data: CreateUserRequest) => {
              // Vérifier les permissions avant d'exécuter l'action
              if (!hasPermission('users.create')) {
                toast.error('Vous n\'avez pas la permission de créer un utilisateur')
                setIsModalOpen(false)
                return
              }
              
              setIsSubmitting(true)
              try {
                await userService.create(data)
                setIsModalOpen(false)
                setFormResetKey((prev) => prev + 1) // Réinitialiser après création réussie
                await loadUsers() // Rafraîchir la liste
                toast.success("Utilisateur créé avec succès")
              } catch (error) {
                console.error('Erreur lors de la création:', error)
                toast.error(error instanceof Error ? error.message : "Erreur lors de la création de l'utilisateur")
              } finally {
                setIsSubmitting(false)
              }
            }}
            onCancel={() => {
              setIsModalOpen(false)
              setFormResetKey((prev) => prev + 1) // Réinitialiser à l'annulation
            }}
            isSubmitting={isSubmitting}
            resetKey={formResetKey}
          />
        )}
      </Modal>

      {/* Modal de modification d'utilisateur */}
      {editingUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          title="Modifier l'utilisateur"
          size="md"
        >
          <EditUserForm
            user={editingUser}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditModalOpen(false)
              setEditingUser(null)
            }}
            isSubmitting={isSubmitting}
          />
        </Modal>
      )}

      {/* Modal de confirmation de suppression */}
      {userToDelete && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setUserToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          title="Supprimer l'utilisateur"
          message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete.first_name && userToDelete.last_name ? `${userToDelete.first_name} ${userToDelete.last_name}` : userToDelete.username}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deletingId === userToDelete.id}
        />
      )}
    </div>
  )
}

export default Users
