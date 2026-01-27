import { apiRequest } from '../config/api'
import { TicketDTO } from './ticketService'
import { UserDTO } from './userService'

// ========== Time Entry DTOs ==========
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

export interface CreateTimeEntryRequest {
  ticket_id: number
  time_spent: number // en minutes
  date: string // Format: YYYY-MM-DD
  description?: string
}

export interface UpdateTimeEntryRequest {
  time_spent?: number
  date?: string // Format: YYYY-MM-DD
  description?: string
}

export interface ValidateTimeEntryRequest {
  validated: boolean
}

// ========== Daily Declaration DTOs ==========
export interface DailyDeclarationDTO {
  id: number
  user_id: number
  user?: UserDTO
  date: string
  task_count: number
  total_time: number // en minutes
  validated: boolean
  validated_by?: number
  validated_at?: string
  validation_comment?: string
  tasks?: DailyTaskDTO[]
  created_at: string
  updated_at: string
}

export interface DailyTaskDTO {
  id: number
  ticket_id: number
  ticket?: TicketDTO
  time_spent: number // en minutes
  created_at: string
}

export interface DailyTaskRequest {
  ticket_id: number
  time_spent: number // en minutes
}

export interface DailySummaryDTO {
  date: string
  task_count: number
  total_time: number
  validated: boolean
}

export interface DailyCalendarDTO {
  date: string
  has_entry: boolean
  total_time: number
  validated: boolean
}

// ========== Weekly Declaration DTOs ==========
export interface WeeklyDeclarationDTO {
  id: number
  user_id: number
  user?: UserDTO
  week: string // Format: YYYY-Www
  start_date: string
  end_date: string
  task_count: number
  total_time: number // en minutes
  validated: boolean
  validated_by?: number
  validated_at?: string
  validation_comment?: string
  daily_breakdown?: DailyBreakdownDTO[]
  created_at: string
  updated_at: string
}

export interface WeeklyTaskDTO {
  id: number
  ticket_id: number
  ticket?: TicketDTO
  date: string
  time_spent: number // en minutes
  created_at: string
}

export interface WeeklyTaskRequest {
  ticket_id: number
  date: string // Format: YYYY-MM-DD
  time_spent: number // en minutes
}

export interface WeeklySummaryDTO {
  week: string
  start_date: string
  end_date: string
  task_count: number
  total_time: number
  validated: boolean
}

export interface DailyBreakdownDTO {
  date: string
  task_count: number
  total_time: number
}

export interface ValidationStatusDTO {
  validated: boolean
  validated_by?: number
  validated_at?: string
}

// ========== Budget DTOs ==========
export interface EstimatedTimeDTO {
  ticket_id: number
  estimated_time: number // en minutes
}

export interface TimeComparisonDTO {
  ticket_id: number
  estimated_time: number
  actual_time: number
  difference: number
  percentage: number
}

export interface ProjectTimeBudgetDTO {
  project_id: number
  budget: number // en minutes
  spent: number // en minutes
  remaining: number // en minutes
  percentage: number
}

export interface SetProjectTimeBudgetRequest {
  budget: number // en minutes
}

export interface BudgetAlertDTO {
  ticket_id?: number
  project_id?: number
  alert_type: string
  message: string
  budget: number
  spent: number
  percentage: number
  created_at: string
}

export interface BudgetStatusDTO {
  ticket_id: number
  status: 'on_budget' | 'over_budget' | 'under_budget'
  comparison: TimeComparisonDTO
}

// ========== Alert DTOs ==========
export interface DelayAlertDTO {
  delay_id: number
  ticket_id: number
  user_id: number
  delay_time: number
  detected_at: string
}

export interface OverloadAlertDTO {
  user_id: number
  date: string
  actual_time: number
  max_time: number
  message: string
}

export interface UnderloadAlertDTO {
  user_id: number
  date: string
  actual_time: number
  min_time: number
  message: string
}

export interface PendingJustificationAlertDTO {
  justification_id: number
  delay_id: number
  user_id: number
  created_at: string
}

// ========== History DTOs ==========
export interface ValidationHistoryDTO {
  entry_id: number
  entry_type: 'time_entry' | 'daily' | 'weekly'
  user_id: number
  validated_by: number
  validated_at: string
  status: 'validated' | 'rejected'
}

export interface TimesheetHistoryDTO {
  id: number
  user_id: number
  date: string
  action: string
  details: string
  created_at: string
}

export interface TimesheetHistoryEntryDTO {
  id: number
  user_id: number
  date: string
  action: string
  details: string
  changes?: Record<string, any>
  created_at: string
}

export interface AuditTrailDTO {
  id: number
  user_id: number
  action: string
  entity_type: string
  entity_id: number
  details: string
  created_at: string
}

export interface ModificationDTO {
  id: number
  user_id: number
  date: string
  field: string
  old_value: any
  new_value: any
  created_at: string
}

// ========== Service ==========
export const timesheetService = {
  // ========== Time Entries ==========
  // Créer une entrée de temps
  createTimeEntry: async (data: CreateTimeEntryRequest): Promise<TimeEntryDTO> => {
    return apiRequest<TimeEntryDTO>('/timesheet/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Récupérer toutes les entrées de temps
  getTimeEntries: async (): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>('/timesheet/entries')
  },

  // Récupérer une entrée de temps par ID
  getTimeEntryById: async (id: number): Promise<TimeEntryDTO> => {
    return apiRequest<TimeEntryDTO>(`/timesheet/entries/${id}`)
  },

  // Mettre à jour une entrée de temps
  updateTimeEntry: async (id: number, data: UpdateTimeEntryRequest): Promise<TimeEntryDTO> => {
    return apiRequest<TimeEntryDTO>(`/timesheet/entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer une entrée de temps (via timeEntryService si disponible, sinon via timesheet)
  deleteTimeEntry: async (id: number): Promise<void> => {
    return apiRequest<void>(`/time-entries/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer les entrées de temps par date
  getTimeEntriesByDate: async (date: string): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>(`/timesheet/entries/by-date/${date}`)
  },

  // Valider une entrée de temps
  validateTimeEntry: async (id: number, validated: boolean): Promise<TimeEntryDTO> => {
    return apiRequest<TimeEntryDTO>(`/timesheet/entries/${id}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ validated }),
    })
  },

  // Récupérer les entrées en attente de validation
  getPendingValidationEntries: async (): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>('/timesheet/entries/pending-validation')
  },

  // Récupérer les entrées de temps d'un ticket
  getTimeEntriesByTicketId: async (ticketId: number): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>(`/tickets/${ticketId}/time-entries`)
  },

  // Récupérer les entrées de temps d'un utilisateur
  getTimeEntriesByUserId: async (userId: number): Promise<TimeEntryDTO[]> => {
    return apiRequest<TimeEntryDTO[]>(`/users/${userId}/time-entries`)
  },

  // ========== Daily Declarations ==========
  // Récupérer une déclaration journalière
  getDailyDeclaration: async (date: string): Promise<DailyDeclarationDTO | null> => {
    try {
      return await apiRequest<DailyDeclarationDTO>(`/timesheet/daily/${date}`)
    } catch (error: any) {
      if (error?.status === 404 || (error instanceof Error && error.message.includes('Déclaration introuvable'))) {
        return null
      }
      throw error
    }
  },

  // Créer ou mettre à jour une déclaration journalière
  createOrUpdateDailyDeclaration: async (
    date: string,
    tasks: DailyTaskRequest[]
  ): Promise<DailyDeclarationDTO> => {
    return apiRequest<DailyDeclarationDTO>(`/timesheet/daily/${date}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
    })
  },

  // Récupérer les tâches d'une déclaration journalière
  getDailyTasks: async (date: string): Promise<DailyTaskDTO[]> => {
    return apiRequest<DailyTaskDTO[]>(`/timesheet/daily/${date}/tasks`)
  },

  // Créer une tâche dans une déclaration journalière
  createDailyTask: async (date: string, task: DailyTaskRequest): Promise<DailyTaskDTO> => {
    return apiRequest<DailyTaskDTO>(`/timesheet/daily/${date}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    })
  },

  // Supprimer une tâche d'une déclaration journalière
  deleteDailyTask: async (date: string, taskId: number): Promise<void> => {
    return apiRequest<void>(`/timesheet/daily/${date}/tasks/${taskId}`, {
      method: 'DELETE',
    })
  },

  // Récupérer le résumé d'une déclaration journalière
  getDailySummary: async (date: string): Promise<DailySummaryDTO> => {
    return apiRequest<DailySummaryDTO>(`/timesheet/daily/${date}/summary`)
  },

  // Récupérer le calendrier des déclarations journalières
  getDailyCalendar: async (startDate?: string, endDate?: string): Promise<DailyCalendarDTO[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return apiRequest<DailyCalendarDTO[]>(`/timesheet/daily/calendar${query ? `?${query}` : ''}`)
  },

  // Récupérer les déclarations journalières dans une plage
  getDailyRange: async (startDate?: string, endDate?: string): Promise<DailyDeclarationDTO[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return apiRequest<DailyDeclarationDTO[]>(`/timesheet/daily/range${query ? `?${query}` : ''}`)
  },

  // Valider une déclaration journalière
  validateDailyDeclaration: async (id: number): Promise<DailyDeclarationDTO> => {
    return apiRequest<DailyDeclarationDTO>(`/daily-declarations/${id}/validate`, {
      method: 'POST',
    })
  },

  // ========== Weekly Declarations ==========
  // Récupérer une déclaration hebdomadaire
  getWeeklyDeclaration: async (week: string): Promise<WeeklyDeclarationDTO | null> => {
    try {
      return await apiRequest<WeeklyDeclarationDTO>(`/timesheet/weekly/${week}`)
    } catch (error: any) {
      if (error?.status === 404 || (error instanceof Error && error.message.includes('Déclaration introuvable'))) {
        return null
      }
      throw error
    }
  },

  // Créer ou mettre à jour une déclaration hebdomadaire
  createOrUpdateWeeklyDeclaration: async (
    week: string,
    tasks: WeeklyTaskRequest[]
  ): Promise<WeeklyDeclarationDTO> => {
    return apiRequest<WeeklyDeclarationDTO>(`/timesheet/weekly/${week}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
    })
  },

  // Récupérer les tâches d'une déclaration hebdomadaire
  getWeeklyTasks: async (week: string): Promise<WeeklyTaskDTO[]> => {
    return apiRequest<WeeklyTaskDTO[]>(`/timesheet/weekly/${week}/tasks`)
  },

  // Récupérer le résumé d'une déclaration hebdomadaire
  getWeeklySummary: async (week: string): Promise<WeeklySummaryDTO> => {
    return apiRequest<WeeklySummaryDTO>(`/timesheet/weekly/${week}/summary`)
  },

  // Récupérer la répartition quotidienne d'une déclaration hebdomadaire
  getWeeklyDailyBreakdown: async (week: string): Promise<DailyBreakdownDTO[]> => {
    return apiRequest<DailyBreakdownDTO[]>(`/timesheet/weekly/${week}/daily-breakdown`)
  },

  // Récupérer les déclarations hebdomadaires d'un utilisateur
  getWeeklyDeclarationsByUserId: async (userId: number): Promise<WeeklyDeclarationDTO[]> => {
    return apiRequest<WeeklyDeclarationDTO[]>(`/weekly-declarations/users/${userId}`)
  },

  // Valider une déclaration hebdomadaire
  validateWeeklyDeclaration: async (week: string): Promise<WeeklyDeclarationDTO> => {
    return apiRequest<WeeklyDeclarationDTO>(`/timesheet/weekly/${week}/validate`, {
      method: 'POST',
    })
  },

  // Récupérer le statut de validation d'une déclaration hebdomadaire
  getWeeklyValidationStatus: async (week: string): Promise<ValidationStatusDTO> => {
    return apiRequest<ValidationStatusDTO>(`/timesheet/weekly/${week}/validation-status`)
  },

  // ========== Budget ==========
  // Définir le temps estimé d'un ticket
  setTicketEstimatedTime: async (ticketId: number, estimatedTime: number): Promise<void> => {
    return apiRequest<void>(`/tickets/${ticketId}/estimated-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estimated_time: estimatedTime }),
    })
  },

  // Récupérer le temps estimé d'un ticket
  getTicketEstimatedTime: async (ticketId: number): Promise<EstimatedTimeDTO> => {
    return apiRequest<EstimatedTimeDTO>(`/tickets/${ticketId}/estimated-time`)
  },

  // Mettre à jour le temps estimé d'un ticket
  updateTicketEstimatedTime: async (ticketId: number, estimatedTime: number): Promise<void> => {
    return apiRequest<void>(`/tickets/${ticketId}/estimated-time`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estimated_time: estimatedTime }),
    })
  },

  // Récupérer la comparaison temps estimé vs réel d'un ticket
  getTicketTimeComparison: async (ticketId: number): Promise<TimeComparisonDTO> => {
    return apiRequest<TimeComparisonDTO>(`/tickets/${ticketId}/time-comparison`)
  },

  // Récupérer le budget temps d'un projet
  getProjectTimeBudget: async (projectId: number): Promise<ProjectTimeBudgetDTO> => {
    return apiRequest<ProjectTimeBudgetDTO>(`/projects/${projectId}/time-budget`)
  },

  // Définir le budget temps d'un projet
  setProjectTimeBudget: async (
    projectId: number,
    budget: SetProjectTimeBudgetRequest
  ): Promise<void> => {
    return apiRequest<void>(`/projects/${projectId}/time-budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budget),
    })
  },

  // Récupérer les alertes de budget
  getBudgetAlerts: async (): Promise<BudgetAlertDTO[]> => {
    return apiRequest<BudgetAlertDTO[]>('/timesheet/budget-alerts')
  },

  // Récupérer le statut du budget d'un ticket
  getTicketBudgetStatus: async (ticketId: number): Promise<BudgetStatusDTO> => {
    return apiRequest<BudgetStatusDTO>(`/timesheet/budget-status/${ticketId}`)
  },

  // ========== Validation ==========
  // Récupérer l'historique de validation
  getValidationHistory: async (): Promise<ValidationHistoryDTO[]> => {
    return apiRequest<ValidationHistoryDTO[]>('/timesheet/validation-history')
  },

  // ========== Alerts ==========
  // Récupérer les alertes de retard
  getDelayAlerts: async (): Promise<DelayAlertDTO[]> => {
    return apiRequest<DelayAlertDTO[]>('/timesheet/alerts/delays')
  },

  // Récupérer les alertes de budget
  getBudgetAlertsForTimesheet: async (): Promise<BudgetAlertDTO[]> => {
    return apiRequest<BudgetAlertDTO[]>('/timesheet/alerts/budget')
  },

  // Récupérer les alertes de surcharge
  getOverloadAlerts: async (): Promise<OverloadAlertDTO[]> => {
    return apiRequest<OverloadAlertDTO[]>('/timesheet/alerts/overload')
  },

  // Récupérer les alertes de sous-charge
  getUnderloadAlerts: async (): Promise<UnderloadAlertDTO[]> => {
    return apiRequest<UnderloadAlertDTO[]>('/timesheet/alerts/underload')
  },

  // Envoyer des rappels
  sendReminderAlerts: async (userIds: number[]): Promise<void> => {
    return apiRequest<void>('/timesheet/alerts/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userIds),
    })
  },

  // Récupérer les alertes de justifications en attente
  getPendingJustificationAlerts: async (): Promise<PendingJustificationAlertDTO[]> => {
    return apiRequest<PendingJustificationAlertDTO[]>('/timesheet/alerts/justifications-pending')
  },

  // ========== History ==========
  // Récupérer l'historique du timesheet
  getTimesheetHistory: async (startDate?: string, endDate?: string): Promise<TimesheetHistoryDTO[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return apiRequest<TimesheetHistoryDTO[]>(`/timesheet/history${query ? `?${query}` : ''}`)
  },

  // Récupérer une entrée de l'historique
  getTimesheetHistoryEntry: async (entryId: number): Promise<TimesheetHistoryEntryDTO> => {
    return apiRequest<TimesheetHistoryEntryDTO>(`/timesheet/history/${entryId}`)
  },

  // Récupérer la piste d'audit
  getTimesheetAuditTrail: async (startDate?: string, endDate?: string): Promise<AuditTrailDTO[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return apiRequest<AuditTrailDTO[]>(`/timesheet/audit-trail${query ? `?${query}` : ''}`)
  },

  // Récupérer les modifications
  getTimesheetModifications: async (startDate?: string, endDate?: string): Promise<ModificationDTO[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return apiRequest<ModificationDTO[]>(`/timesheet/modifications${query ? `?${query}` : ''}`)
  },
}
