import { apiRequest } from '../config/api'

export interface CreateServiceRequestRequest {
  ticket_id: number
  type_id: number
  deadline?: string // Format: YYYY-MM-DD
}

export interface ServiceRequestDTO {
  id: number
  ticket_id: number
  type_id: number
  deadline?: string
}

export interface ServiceRequestTypeDTO {
  id: number
  name: string
  description?: string
  default_deadline: number
}

export const serviceRequestService = {
  create: async (data: CreateServiceRequestRequest): Promise<ServiceRequestDTO> => {
    return apiRequest<ServiceRequestDTO>('/service-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  getTypes: async (): Promise<ServiceRequestTypeDTO[]> => {
    return apiRequest<ServiceRequestTypeDTO[]>('/service-request-types')
  },
}
