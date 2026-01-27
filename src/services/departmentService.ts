import { apiRequest, publicApiRequest } from '../config/api'
import { OfficeDTO } from './officeService'

export interface DepartmentDTO {
  id: number
  name: string
  code: string
  description?: string
  office_id?: number
  office?: OfficeDTO
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDepartmentRequest {
  name: string
  code: string
  description?: string
  office_id?: number
  is_active?: boolean
}

export interface UpdateDepartmentRequest {
  name?: string
  code?: string
  description?: string
  office_id?: number
  is_active?: boolean
}

export const departmentService = {
  // Récupérer tous les départements
  getAll: async (activeOnly: boolean = false): Promise<DepartmentDTO[]> => {
    const params = activeOnly ? '?active=true' : ''
    return apiRequest<DepartmentDTO[]>(`/departments${params}`)
  },

  // Récupérer un département par ID
  getById: async (id: number): Promise<DepartmentDTO> => {
    return apiRequest<DepartmentDTO>(`/departments/${id}`)
  },

  // Créer un département
  create: async (data: CreateDepartmentRequest): Promise<DepartmentDTO> => {
    return apiRequest<DepartmentDTO>('/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un département
  update: async (id: number, data: UpdateDepartmentRequest): Promise<DepartmentDTO> => {
    return apiRequest<DepartmentDTO>(`/departments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer un département
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/departments/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer les départements d'un siège
  getByOfficeId: async (officeId: number): Promise<DepartmentDTO[]> => {
    return apiRequest<DepartmentDTO[]>(`/departments/office/${officeId}`)
  },

  // Récupérer uniquement les départements actifs (route publique, sans authentification)
  getActive: async (): Promise<DepartmentDTO[]> => {
    return publicApiRequest<DepartmentDTO[]>('/departments/active')
  },
}
