import { useState, useEffect } from 'react'
import { userService, UpdateUserRequest, RoleDTO, UserDTO } from '../../services/userService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'

interface EditUserFormProps {
  user: UserDTO
  onSubmit: (data: UpdateUserRequest) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

const EditUserForm = ({ user, onSubmit, onCancel, isSubmitting }: EditUserFormProps) => {
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [formData, setFormData] = useState<UpdateUserRequest>({
    username: user.username || '',
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    department_id: user.department_id || null,
    role_id: undefined, // On ne peut pas modifier le rôle directement depuis l'ID, il faut le rôle actuel
    is_active: user.is_active,
  })

  const formatRoleName = (roleName: string): string => {
    const roleMap: Record<string, string> = {
      'DSI': 'DSI',
      'RESPONSABLE_IT': 'Responsable IT',
      'TECHNICIEN_IT': 'Technicien IT',
      'USER': 'Utilisateur',
      'CLIENT': 'Client',
      'DEVELOPPEUR': 'Développeur',
      'ADMIN': 'Administrateur',
    }
    return roleMap[roleName] || roleName
  }

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true)
      setRolesError(null)
      try {
        const data = await userService.getRoles()
        if (data && Array.isArray(data) && data.length > 0) {
          setRoles(data)
          // Trouver le rôle actuel de l'utilisateur par son nom
          const currentRole = data.find((r) => r.name === user.role)
          if (currentRole) {
            setFormData((prev) => ({ ...prev, role_id: currentRole.id }))
            console.log('Rôle actuel trouvé:', currentRole.name, 'ID:', currentRole.id)
          } else {
            // Si le rôle n'est pas trouvé, ne pas définir role_id
            console.warn(`Rôle "${user.role}" non trouvé dans la liste des rôles disponibles. Rôles disponibles:`, data.map(r => r.name))
          }
        } else {
          setRolesError('Aucun rôle disponible')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des rôles:', error)
        setRolesError(error instanceof Error ? error.message : 'Erreur lors du chargement des rôles')
      } finally {
        setLoadingRoles(false)
      }
    }
    loadRoles()
  }, [user])

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true)
      setDepartmentsError(null)
      try {
        const data = await departmentService.getAll(true) // Récupérer uniquement les départements actifs
        if (data && Array.isArray(data)) {
          setDepartments(data)
        } else {
          setDepartmentsError('Aucun département disponible')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des départements:', error)
        setDepartmentsError(error instanceof Error ? error.message : 'Erreur lors du chargement des départements')
      } finally {
        setLoadingDepartments(false)
      }
    }
    loadDepartments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation : le rôle doit être sélectionné
    if (!formData.role_id || formData.role_id === 0) {
      alert('Veuillez sélectionner un rôle')
      return
    }
    
    // Préparer les données à envoyer - TOUS les champs sont toujours envoyés pour permettre leur modification
    const dataToSend: UpdateUserRequest = {
      username: formData.username?.trim() || user.username, // Toujours envoyer le username (utiliser l'actuel si vide)
      email: formData.email || user.email, // Utiliser l'email actuel si vide
      is_active: formData.is_active,
      // Toujours envoyer first_name (peut être vide pour le vider)
      first_name: formData.first_name?.trim() || undefined,
      // Toujours envoyer last_name (peut être vide pour le vider)
      last_name: formData.last_name?.trim() || undefined,
      // Toujours envoyer department_id (même si null) pour permettre de retirer l'utilisateur d'un département
      department_id: formData.department_id || null,
      // Toujours envoyer role_id s'il est défini
      role_id: formData.role_id,
    }
    
    console.log('Données à envoyer:', dataToSend)
    console.log('Rôle sélectionné ID:', formData.role_id)
    console.log('Rôle sélectionné nom:', roles.find(r => r.id === formData.role_id)?.name)
    await onSubmit(dataToSend)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nom d'utilisateur <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            placeholder="nom_utilisateur"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Statut
          </label>
          <select
            value={formData.is_active ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
          >
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prénom
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nom
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rôle <span className="text-red-500">*</span>
          </label>
          {loadingRoles ? (
            <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Chargement des rôles...
            </div>
          ) : rolesError ? (
            <div className="w-full px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {rolesError}
            </div>
          ) : (
            <select
              required
              value={formData.role_id || ''}
              onChange={(e) => {
                const newRoleId = e.target.value ? parseInt(e.target.value) : undefined
                console.log('Rôle sélectionné:', newRoleId, 'Rôle:', roles.find(r => r.id === newRoleId)?.name)
                setFormData({ ...formData, role_id: newRoleId })
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value="">Sélectionner un rôle</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {formatRoleName(role.name)} {role.description ? `- ${role.description}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Département
          </label>
          <select
            value={formData.department_id || ''}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? parseInt(e.target.value) : null })}
            disabled={loadingDepartments}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Aucun département</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} {dept.code ? `(${dept.code})` : ''}
              </option>
            ))}
          </select>
          {loadingDepartments && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Chargement des départements...
            </p>
          )}
          {departmentsError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {departmentsError}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Validation...' : 'Valider'}
        </button>
      </div>
    </form>
  )
}

export default EditUserForm
