import { apiRequest } from '../config/api'

export interface CreateIncidentRequest {
  ticket_id: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface IncidentDTO {
  id: number
  ticket_id: number
  impact: string
  urgency: string
}

export const incidentService = {
  create: async (data: CreateIncidentRequest): Promise<IncidentDTO> => {
    return apiRequest<IncidentDTO>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
