import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { userService, CreateUserRequest, RoleDTO } from '../../services/userService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'

interface CreateUserFormProps {
  onSubmit: (data: CreateUserRequest) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  resetKey?: number // Clé pour forcer la réinitialisation du formulaire
}

const CreateUserForm = ({ onSubmit, onCancel, isSubmitting, resetKey }: CreateUserFormProps) => {
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const getInitialFormData = (): CreateUserRequest => ({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department_id: undefined,
    role_id: 0,
  })
  
  const [formData, setFormData] = useState<CreateUserRequest>(getInitialFormData())

  // Réinitialiser le formulaire quand resetKey change (quand le modal s'ouvre)
  useEffect(() => {
    setFormData(getInitialFormData())
    setShowPassword(false) // Réinitialiser aussi l'état de visibilité du mot de passe
  }, [resetKey])

  // Fonction pour formater le nom du rôle pour l'affichage
  const formatRoleName = (roleName: string): string => {
    const roleMap: Record<string, string> = {
      'DSI': 'DSI',
      'RESPONSABLE_IT': 'Responsable IT',
      'TECHNICIEN_IT': 'Technicien IT',
      'USER': 'Utilisateur',
      'CLIENT': 'Client',
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
          // Ne pas pré-remplir le rôle, laisser l'utilisateur choisir
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
  }, [])

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
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nom d'utilisateur <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            autoComplete="off"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            placeholder="nom.utilisateur"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            autoComplete="off"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            placeholder="Minimum 6 caractères"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
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
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value={0}>Sélectionner un rôle</option>
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
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? parseInt(e.target.value) : undefined })}
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
          disabled={isSubmitting || formData.role_id === 0}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Création...' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  )
}

export default CreateUserForm
