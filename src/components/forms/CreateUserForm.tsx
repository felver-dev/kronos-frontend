import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { userService, CreateUserRequest, RoleDTO } from '../../services/userService'
import { roleService } from '../../services/roleService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { useAuth } from '../../contexts/AuthContext'

interface CreateUserFormProps {
  onSubmit: (data: CreateUserRequest) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  resetKey?: number // Clé pour forcer la réinitialisation du formulaire
}

const CreateUserForm = ({ onSubmit, onCancel, isSubmitting, resetKey }: CreateUserFormProps) => {
  const { user, hasPermission } = useAuth()
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loadingFiliales, setLoadingFiliales] = useState(true)
  const [filialesError, setFilialesError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Vérifier si l'utilisateur peut créer un utilisateur dans n'importe quelle filiale
  const canSelectFiliale = hasPermission('users.create_any_filiale')
  
  const getInitialFormData = (): CreateUserRequest => ({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department_id: undefined,
    filiale_id: canSelectFiliale ? undefined : (user?.filiale_id),
    role_id: 0,
  })
  
  const [formData, setFormData] = useState<CreateUserRequest>(getInitialFormData())

  // Réinitialiser le formulaire quand resetKey change (quand le modal s'ouvre)
  useEffect(() => {
    setFormData(getInitialFormData())
    setShowPassword(false) // Réinitialiser aussi l'état de visibilité du mot de passe
  }, [resetKey, canSelectFiliale, user?.filiale_id])
  
  // Mettre à jour filiale_id si l'utilisateur ne peut pas sélectionner la filiale
  useEffect(() => {
    if (!canSelectFiliale && user?.filiale_id) {
      setFormData(prev => ({
        ...prev,
        filiale_id: user.filiale_id,
      }))
    }
  }, [canSelectFiliale, user?.filiale_id])

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true)
      setRolesError(null)
      try {
        let data: RoleDTO[] | null = null
        try {
          data = await userService.getRoles()
        } catch (err) {
          // Si l'utilisateur n'a que delegate_permissions, GET /roles peut échouer (ancien backend) : essayer mes rôles délégués
          if (hasPermission('roles.delegate_permissions')) {
            try {
              data = await roleService.getMyDelegations()
            } catch {
              data = null
            }
          }
          if (data == null) throw err
        }
        if (data && Array.isArray(data) && data.length > 0) {
          setRoles(data)
          setFormData(prev => (prev.role_id ? prev : { ...prev, role_id: data![0].id }))
        } else {
          setRolesError('Aucun rôle disponible. Créez des rôles délégués depuis "Délégation rôles" si besoin.')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des rôles:', error)
        setRolesError(error instanceof Error ? error.message : 'Erreur lors du chargement des rôles')
      } finally {
        setLoadingRoles(false)
      }
    }
    if (user !== undefined) {
      loadRoles()
    }
  }, [user?.role, user, hasPermission])

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true)
      setDepartmentsError(null)
      try {
        console.log('Chargement des départements - canSelectFiliale:', canSelectFiliale, 'user?.filiale_id:', user?.filiale_id)
        
        let data: DepartmentDTO[]
        if (canSelectFiliale) {
          // Pour les utilisateurs avec users.create_any_filiale : charger tous les départements
          console.log('Chargement de tous les départements (canSelectFiliale = true)')
          data = await departmentService.getAll(true)
        } else if (user?.filiale_id) {
          // Pour les autres : charger uniquement les départements de leur filiale
          console.log('Chargement des départements pour la filiale:', user.filiale_id)
          data = await departmentService.getByFilialeId(user.filiale_id)
        } else {
          // Si user n'est pas encore chargé ou n'a pas de filiale_id, attendre
          console.log('User non chargé ou sans filiale_id, départements non chargés pour le moment')
          setLoadingDepartments(false)
          return
        }
        
        console.log('Départements chargés:', data)
        
        if (data && Array.isArray(data)) {
          setDepartments(data)
          if (data.length === 0) {
            setDepartmentsError('Aucun département disponible')
          }
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
    
    // Attendre que user soit chargé avant de charger les départements
    // (sauf si canSelectFiliale est true, auquel cas on peut charger tous les départements)
    if (canSelectFiliale || user !== undefined) {
      loadDepartments()
    }
  }, [canSelectFiliale, user?.filiale_id, user])

  useEffect(() => {
    // Charger les filiales pour l'affichage (même si l'utilisateur ne peut pas les sélectionner)
    const loadFiliales = async () => {
      setLoadingFiliales(true)
      setFilialesError(null)
      try {
        const data = await filialeService.getActive()
        if (data && Array.isArray(data)) {
          setFiliales(data)
        } else {
          setFilialesError('Aucune filiale disponible')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des filiales:', error)
        setFilialesError(error instanceof Error ? error.message : 'Erreur lors du chargement des filiales')
      } finally {
        setLoadingFiliales(false)
      }
    }
    loadFiliales()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // S'assurer que filiale_id est toujours défini si l'utilisateur n'a pas la permission
    const submitData = { ...formData }
    
    // Si l'utilisateur n'a pas la permission de sélectionner la filiale,
    // forcer la filiale de l'utilisateur connecté
    if (!canSelectFiliale) {
      if (user?.filiale_id) {
        submitData.filiale_id = user.filiale_id
      } else if (formData.filiale_id) {
        // Garder la valeur du formulaire si elle existe
        submitData.filiale_id = formData.filiale_id
      }
      // Si ni user.filiale_id ni formData.filiale_id n'existent,
      // laisser undefined et le backend gérera (ou retournera une erreur)
    }
    
    // S'assurer qu'un role_id valide est toujours défini (USER par défaut)
    if (submitData.role_id === 0 || !submitData.role_id) {
      const defaultUserRole = roles.find(role => role.name === 'USER')
      if (defaultUserRole) {
        submitData.role_id = defaultUserRole.id
      } else if (roles.length > 0) {
        // Si USER n'est pas disponible, prendre le premier rôle disponible
        submitData.role_id = roles[0].id
      } else {
        // Si aucun rôle n'est disponible, afficher une erreur
        setRolesError('Aucun rôle disponible. Veuillez recharger la page.')
        return
      }
    }
    
    // Nettoyer les données : ne pas envoyer department_id s'il est undefined, null, 0 ou vide
    const cleanedData: CreateUserRequest = {
      username: submitData.username,
      email: submitData.email,
      password: submitData.password,
      role_id: submitData.role_id,
    }
    
    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (submitData.first_name) cleanedData.first_name = submitData.first_name
    if (submitData.last_name) cleanedData.last_name = submitData.last_name
    if (submitData.filiale_id) cleanedData.filiale_id = submitData.filiale_id
    // Ne pas inclure department_id s'il est undefined, null, 0 ou vide
    if (submitData.department_id !== undefined && submitData.department_id !== null && submitData.department_id !== 0) {
      cleanedData.department_id = submitData.department_id
    }
    
    // Log pour débogage
    console.log('DEBUG CreateUserForm submitData (avant nettoyage):', {
      ...submitData,
      password: submitData.password ? '***' : undefined, // Masquer le mot de passe
    })
    console.log('DEBUG CreateUserForm cleanedData (après nettoyage):', {
      ...cleanedData,
      password: cleanedData.password ? '***' : undefined, // Masquer le mot de passe
    })
    console.log('DEBUG - Département sélectionné:', submitData.department_id)
    console.log('DEBUG - Filiale:', submitData.filiale_id)
    console.log('DEBUG - Départements disponibles:', departments.map(d => ({ id: d.id, name: d.name, filiale_id: d.filiale_id })))
    
    await onSubmit(cleanedData)
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
                  {role.description || role.name}
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
            {(() => {
              // Filtrer les départements selon les permissions
              let filteredDepartments = departments
              
              console.log('Départements disponibles avant filtrage:', departments.length)
              
              if (!canSelectFiliale && user?.filiale_id) {
                // Pour les utilisateurs sans users.create_any_filiale : filtrer uniquement par leur filiale
                filteredDepartments = departments.filter(dept => dept.filiale_id === user.filiale_id)
                console.log('Départements filtrés par filiale:', filteredDepartments.length, 'filiale_id:', user.filiale_id)
              }
              
              console.log('Départements à afficher:', filteredDepartments.length)
              
              return filteredDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} {dept.code ? `(${dept.code})` : ''}
                </option>
              ))
            })()}
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

      {canSelectFiliale ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filiale
          </label>
          <select
            value={formData.filiale_id || ''}
            onChange={(e) => setFormData({ ...formData, filiale_id: e.target.value ? parseInt(e.target.value) : undefined })}
            disabled={loadingFiliales}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Aucune filiale</option>
            {filiales.map((filiale) => (
              <option key={filiale.id} value={filiale.id}>
                {filiale.name} {filiale.code ? `(${filiale.code})` : ''}
              </option>
            ))}
          </select>
          {loadingFiliales && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Chargement des filiales...
            </p>
          )}
          {filialesError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {filialesError}
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filiale
          </label>
          <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {(() => {
              const filialeId = formData.filiale_id || user?.filiale_id
              const filiale = filialeId ? filiales.find(f => f.id === filialeId) : null
              
              if (filiale) {
                return (
                  <>
                    {filiale.name}
                    {filiale.code && ` (${filiale.code})`}
                  </>
                )
              }
              
              return user?.filiale_id ? '-' : 'Aucune filiale assignée'
            })()}
          </div>
        </div>
      )}

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
          disabled={isSubmitting || roles.length === 0}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Création...' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  )
}

export default CreateUserForm
