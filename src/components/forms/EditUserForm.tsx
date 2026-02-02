import { useState, useEffect } from 'react'
import { userService, UpdateUserRequest, RoleDTO, UserDTO } from '../../services/userService'
import { roleService } from '../../services/roleService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { useAuth } from '../../contexts/AuthContext'

interface EditUserFormProps {
  user: UserDTO
  onSubmit: (data: UpdateUserRequest) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

const EditUserForm = ({ user, onSubmit, onCancel, isSubmitting }: EditUserFormProps) => {
  const { user: currentUser, hasPermission } = useAuth()
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loadingFiliales, setLoadingFiliales] = useState(true)
  const [filialesError, setFilialesError] = useState<string | null>(null)
  
  // Vérifier si l'utilisateur peut modifier un utilisateur dans n'importe quelle filiale
  const canSelectFiliale = hasPermission('users.update_any_filiale')
  
  const [formData, setFormData] = useState<UpdateUserRequest>({
    username: user.username || '',
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    department_id: user.department_id ?? undefined, // Utiliser undefined si l'utilisateur n'a pas de département
    filiale_id: canSelectFiliale ? (user.filiale_id || null) : (user.filiale_id || null), // Toujours utiliser la filiale de l'utilisateur édité
    role_id: undefined, // On ne peut pas modifier le rôle directement depuis l'ID, il faut le rôle actuel
    is_active: user.is_active,
  })

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true)
      setRolesError(null)
      try {
        let data: RoleDTO[] | null = null
        try {
          data = await userService.getRoles()
        } catch (err) {
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
          const currentRole = data.find((r) => r.name === user.role)
          if (currentRole) {
            setFormData((prev) => ({ ...prev, role_id: currentRole.id }))
          } else {
            setFormData((prev) => ({ ...prev, role_id: data![0].id }))
          }
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
    if (currentUser !== undefined && user) {
      loadRoles()
    }
  }, [user, currentUser?.role, currentUser, hasPermission])

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true)
      setDepartmentsError(null)
      try {
        let data: DepartmentDTO[]
        if (canSelectFiliale) {
          // Pour les utilisateurs avec users.update_any_filiale : charger tous les départements
          data = await departmentService.getAll(true)
        } else if (currentUser?.filiale_id) {
          // Pour les autres : charger uniquement les départements de leur filiale
          data = await departmentService.getByFilialeId(currentUser.filiale_id)
        } else {
          data = []
        }
        
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
  }, [canSelectFiliale, currentUser?.filiale_id])

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

  // Ne pas forcer la filiale de l'utilisateur connecté - utiliser toujours celle de l'utilisateur édité

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // S'assurer que filiale_id est toujours défini si l'utilisateur ne peut pas sélectionner la filiale
    const submitData = { ...formData }
    
    // Si l'utilisateur n'a pas la permission de modifier dans n'importe quelle filiale,
    // s'assurer que la filiale reste celle de l'utilisateur édité (ou celle de l'utilisateur connecté si aucune)
    if (!canSelectFiliale) {
      // Utiliser la filiale de l'utilisateur édité si elle existe, sinon celle de l'utilisateur connecté
      if (!submitData.filiale_id && user.filiale_id) {
        submitData.filiale_id = user.filiale_id
      } else if (!submitData.filiale_id && currentUser?.filiale_id) {
        submitData.filiale_id = currentUser.filiale_id
      }
    }
    
    // Validation : le rôle doit être sélectionné
    if (!formData.role_id || formData.role_id === 0) {
      alert('Veuillez sélectionner un rôle')
      return
    }
    
    // Nettoyer les données avant l'envoi
    const cleanedData: UpdateUserRequest = {
      username: formData.username?.trim() || user.username,
      email: formData.email || user.email,
      is_active: formData.is_active,
      role_id: formData.role_id,
    }
    
    // Ajouter les champs optionnels seulement s'ils ont une valeur ou doivent être vidés
    if (formData.first_name !== undefined) {
      cleanedData.first_name = formData.first_name?.trim() || undefined
    }
    if (formData.last_name !== undefined) {
      cleanedData.last_name = formData.last_name?.trim() || undefined
    }
    
    // Gérer department_id :
    // - Si un département valide est sélectionné, l'envoyer
    // - Si l'utilisateur avait un département et qu'on sélectionne explicitement "Aucun département", envoyer null pour le retirer
    // - Si l'utilisateur n'avait pas de département et qu'on ne sélectionne rien, ne pas envoyer department_id (ne pas modifier)
    const hasValidDepartment = formData.department_id !== undefined && formData.department_id !== null && formData.department_id !== 0
    const selectedNone = formData.department_id === null || formData.department_id === 0 || formData.department_id === undefined
    const userHadDepartment = user.department_id !== undefined && user.department_id !== null && user.department_id !== 0
    
    if (hasValidDepartment) {
      // Un département valide est sélectionné
      cleanedData.department_id = formData.department_id
    } else if (selectedNone && userHadDepartment) {
      // L'utilisateur avait un département et on sélectionne explicitement "Aucun département"
      // Envoyer null pour le retirer explicitement
      cleanedData.department_id = null
    }
    // Sinon (utilisateur n'avait pas de département et on ne sélectionne rien), ne pas inclure department_id
    // Cela signifie qu'on ne modifie pas le département existant - department_id ne sera pas dans cleanedData
    
    // Gérer filiale_id selon les permissions
    if (canSelectFiliale) {
      // Si l'utilisateur peut sélectionner n'importe quelle filiale, envoyer celle sélectionnée (ou null)
      if (formData.filiale_id !== undefined && formData.filiale_id !== null) {
        cleanedData.filiale_id = formData.filiale_id
      } else if (formData.filiale_id === null && user.filiale_id) {
        // Si on veut retirer la filiale
        cleanedData.filiale_id = null
      }
    } else {
      // Si l'utilisateur ne peut pas sélectionner la filiale, utiliser celle de l'utilisateur édité ou celle du modificateur
      if (user.filiale_id) {
        cleanedData.filiale_id = user.filiale_id
      } else if (currentUser?.filiale_id) {
        cleanedData.filiale_id = currentUser.filiale_id
      }
    }
    
    // Log pour débogage
    console.log('DEBUG EditUserForm submitData (avant nettoyage):', formData)
    console.log('DEBUG EditUserForm cleanedData (après nettoyage):', cleanedData)
    console.log('DEBUG - Département sélectionné:', formData.department_id, 'Département actuel:', user.department_id)
    console.log('DEBUG - Filiale:', formData.filiale_id, 'Filiale actuelle:', user.filiale_id)
    console.log('DEBUG - Départements disponibles:', departments.map(d => ({ id: d.id, name: d.name, filiale_id: d.filiale_id })))
    
    await onSubmit(cleanedData)
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
            onChange={(e) => {
              const value = e.target.value
              // Si "Aucun département" est sélectionné (chaîne vide), définir à null pour permettre de retirer le département
              // Sinon, parser la valeur en nombre
              setFormData({ ...formData, department_id: value ? parseInt(value) : null })
            }}
            disabled={loadingDepartments}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Aucun département</option>
            {(() => {
              // Filtrer les départements selon les permissions
              let filteredDepartments = departments
              
              if (!canSelectFiliale && currentUser?.filiale_id) {
                // Pour les utilisateurs sans users.update_any_filiale : filtrer uniquement par leur filiale
                filteredDepartments = departments.filter(dept => dept.filiale_id === currentUser.filiale_id)
              }
              
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
              onChange={(e) => setFormData({ ...formData, filiale_id: e.target.value ? parseInt(e.target.value) : null })}
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
                const filialeId = formData.filiale_id || user.filiale_id
                const filiale = filialeId ? filiales.find(f => f.id === filialeId) : null
                
                if (filiale) {
                  return (
                    <>
                      {filiale.name}
                      {filiale.code && ` (${filiale.code})`}
                    </>
                  )
                }
                
                return user.filiale_id ? '-' : 'Aucune filiale'
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
