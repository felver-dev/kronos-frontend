import { apiRequest } from '../config/api'
import { TicketDTO } from './ticketService'
import { UserDTO } from './userService'

export interface TimeEntryDTO {
  id: number
  ticket_id: number
  ticket?: TicketDTO
  user_id: number
  user?: UserDTO
  time_spent: number // en minutes
  date: string
  description?: string
  validated: boolean
  validated_by?: number
  validated_at?: string
  created_at: string
  updated_at: string
}

export const timeEntryService = {
  // Récupérer les entrées de temps d'un utilisateur
  getByUserId: async (userId: number): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>(`/users/${userId}/time-entries`)
  },

  // Récupérer les entrées de temps d'un ticket
  getByTicketId: async (ticketId: number): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>(`/tickets/${ticketId}/time-entries`)
  },
}
