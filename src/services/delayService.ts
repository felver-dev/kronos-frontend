import { apiRequest } from '../config/api'
import { TicketDTO } from './ticketService'
import { UserDTO } from './userService'

export interface DelayJustificationDTO {
  id: number
  delay_id: number
  ticket_id?: number
  ticket_code?: string
  ticket_title?: string
  user_id: number
  user?: UserDTO
  justification: string
  status: 'pending' | 'validated' | 'rejected'
  validated_by?: number
  validated_at?: string
  validation_comment?: string
  created_at: string
  updated_at: string
}

export interface DelayDTO {
  id: number
  ticket_id: number
  ticket?: TicketDTO
  user_id: number
  user?: UserDTO
  estimated_time: number
  actual_time: number
  delay_time: number
  delay_percentage: number
  status: 'unjustified' | 'pending' | 'justified' | 'rejected'
  justification?: DelayJustificationDTO
  detected_at: string
  created_at: string
  updated_at: string
}

export const delayService = {
  getAll: async (params?: { user_id?: number }): Promise<DelayDTO[]> => {
    const url = params?.user_id != null ? `/delays?user_id=${params.user_id}` : '/delays'
    return apiRequest<DelayDTO[]>(url)
  },
  getByUserId: async (userId: number): Promise<DelayDTO[]> => {
    return apiRequest<DelayDTO[]>(`/users/${userId}/delays`)
  },
  getJustificationsHistory: async (): Promise<DelayJustificationDTO[]> => {
    return apiRequest<DelayJustificationDTO[]>('/delays/justifications/history')
  },
  validateJustification: async (
    justificationId: number,
    data: { validated: boolean; comment?: string }
  ): Promise<DelayJustificationDTO> => {
    return apiRequest<DelayJustificationDTO>(`/delays/justifications/${justificationId}/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  createJustification: async (delayId: number, justification: string): Promise<DelayJustificationDTO> => {
    return apiRequest<DelayJustificationDTO>(`/delays/${delayId}/justifications`, {
      method: 'POST',
      body: JSON.stringify({ justification }),
    })
  },
  updateJustification: async (delayId: number, justification: string): Promise<DelayJustificationDTO> => {
    return apiRequest<DelayJustificationDTO>(`/delays/${delayId}/justification`, {
      method: 'PUT',
      body: JSON.stringify({ justification }),
    })
  },
}
