import { apiRequest } from '../config/api'

export interface RoleDTO {
  id: number
  name: string
  description?: string
  is_system?: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateRoleRequest {
  name: string
  description?: string
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
}

export const roleService = {
  // Récupérer tous les rôles
  getAll: async (): Promise<RoleDTO[]> => {
    const response = await apiRequest<{ data: RoleDTO[] } | RoleDTO[]>('/roles')
    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
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
}
