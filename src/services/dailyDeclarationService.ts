import { apiRequest } from '../config/api'

export interface DailyTaskRequest {
  ticket_id: number
  time_spent: number // en minutes
}

export interface DailyDeclarationDTO {
  id: number
  user_id: number
  date: string
  task_count: number
  total_time: number
  validated: boolean
  validated_by?: number
  validated_at?: string
  validation_comment?: string
  tasks?: any[]
  created_at: string
  updated_at: string
}

export const dailyDeclarationService = {
  getByDate: async (date: string): Promise<DailyDeclarationDTO | null> => {
    try {
      return await apiRequest<DailyDeclarationDTO>(`/timesheet/daily/${date}`)
    } catch (error: any) {
      if (error.status === 404) {
        return null
      }
      throw error
    }
  },
  createOrUpdate: async (date: string, tasks: DailyTaskRequest[]): Promise<DailyDeclarationDTO> => {
    return apiRequest<DailyDeclarationDTO>(`/timesheet/daily/${date}`, {
      method: 'POST',
      body: JSON.stringify(tasks),
    })
  },
}
