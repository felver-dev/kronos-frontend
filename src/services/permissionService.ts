import { apiRequest } from '../config/api'

export interface PermissionDTO {
  id: number
  name: string
  code: string
  description?: string
  module?: string
  created_at?: string
}

export const permissionService = {
  // Récupérer toutes les permissions
  getAll: async (): Promise<PermissionDTO[]> => {
    const response = await apiRequest<{ data: PermissionDTO[] } | PermissionDTO[]>('/permissions')
    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
  },

  // Récupérer les permissions par module
  getByModule: async (module: string): Promise<PermissionDTO[]> => {
    const response = await apiRequest<{ data: PermissionDTO[] } | PermissionDTO[]>(`/permissions?module=${module}`)
    if (Array.isArray(response)) {
      return response
    }
    return response.data || []
  },

  // Récupérer une permission par code
  getByCode: async (code: string): Promise<PermissionDTO> => {
    const response = await apiRequest<{ data: PermissionDTO } | PermissionDTO>(`/permissions/code/${code}`)
    if ('data' in response) {
      return response.data
    }
    return response as PermissionDTO
  },
}
