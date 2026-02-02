import { apiRequest } from '../config/api'

export interface RoleDTO {
  id: number
  name: string
  description?: string
  is_system?: boolean
  created_by_id?: number
  filiale_id?: number
  created_at?: string
  updated_at?: string
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions?: string[]
  filiale_id?: number
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
}

export const roleService = {
  // Récupérer tous les rôles
  getAll: async (): Promise<RoleDTO[]> => {
    const response = await apiRequest<{ data: RoleDTO[] } | RoleDTO[] | null>('/roles')
    if (response == null) {
      return []
    }
    if (Array.isArray(response)) {
      return response
    }
    return response.data ?? []
  },

  // Récupérer un rôle par ID
  getById: async (id: number): Promise<RoleDTO> => {
    return apiRequest<RoleDTO>(`/roles/${id}`)
  },

  // Créer un rôle
  create: async (data: CreateRoleRequest): Promise<RoleDTO> => {
    return apiRequest<RoleDTO>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un rôle
  update: async (id: number, data: UpdateRoleRequest): Promise<RoleDTO> => {
    return apiRequest<RoleDTO>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un rôle
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/roles/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer les permissions d'un rôle
  getPermissions: async (id: number): Promise<string[]> => {
    const response = await apiRequest<{ data: string[] } | string[]>(`/roles/${id}/permissions`)
    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
  },

  // Mettre à jour les permissions d'un rôle
  updatePermissions: async (id: number, permissions: string[]): Promise<void> => {
    return apiRequest<void>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    })
  },

  // Récupérer les permissions que l'utilisateur actuel peut déléguer
  getAssignablePermissions: async (): Promise<string[]> => {
    const response = await apiRequest<{ data: string[] } | string[]>('/roles/assignable-permissions')
    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
  },

  // Récupérer les rôles créés par l'utilisateur courant (délégation)
  getMyDelegations: async (): Promise<RoleDTO[]> => {
    const response = await apiRequest<{ data: RoleDTO[] } | RoleDTO[] | null>('/roles/my-delegations')

    // L'API peut renvoyer null ou un wrapper { success, data }
    if (!response) {
      return []
    }

    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
  },

  // Rôles pour la page "Délégation des rôles" : créés par l'utilisateur + utilisés par au moins un user de sa filiale
  getForDelegation: async (): Promise<RoleDTO[]> => {
    const response = await apiRequest<{ data: RoleDTO[] } | RoleDTO[] | null>('/roles/for-delegation')
    if (response == null) return []
    if (Array.isArray(response)) return response
    return response.data || []
  },
}
