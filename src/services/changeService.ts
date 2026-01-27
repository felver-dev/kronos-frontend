import { apiRequest } from '../config/api'

export interface CreateChangeRequest {
  ticket_id: number
  risk: 'low' | 'medium' | 'high' | 'critical'
  risk_description?: string
}

export interface ChangeDTO {
  id: number
  ticket_id: number
  risk: string
  risk_description?: string
}

export const changeService = {
  create: async (data: CreateChangeRequest): Promise<ChangeDTO> => {
    return apiRequest<ChangeDTO>('/changes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
