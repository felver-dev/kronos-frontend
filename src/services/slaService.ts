import { apiRequest } from '../config/api'

export interface CreateSLARequest {
  name: string
  description?: string
  ticket_category: 'incident' | 'demande' | 'changement' | 'developpement'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  target_time: number // en minutes
  unit?: 'minutes' | 'hours' | 'days'
  is_active?: boolean
}

export interface UpdateSLARequest {
  name?: string
  description?: string
  target_time?: number
  unit?: 'minutes' | 'hours' | 'days'
  is_active?: boolean
}

export interface SLADTO {
  id: number
  name: string
  description?: string
  ticket_category: string
  priority?: string | null
  target_time: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TicketSLAStatusDTO {
  sla_id: number
  sla?: SLADTO
  target_time: string // ISO date string
  elapsed_time: number // en minutes
  remaining: number // en minutes (peut être négatif)
  status: 'on_time' | 'at_risk' | 'violated'
  violated_at?: string | null // ISO date string
}

export interface SLAComplianceDTO {
  sla_id: number
  sla?: SLADTO
  compliance_rate: number // Taux de conformité en %
  total_tickets: number
  compliant: number
  violations: number
}

export interface SLAViolationDTO {
  id: number
  ticket_id: number
  ticket?: any // TicketDTO si nécessaire
  sla_id: number
  sla?: SLADTO
  violation_time: number // Temps de violation en minutes
  unit: string
  violated_at: string // ISO date string
}

export interface OverallSLAComplianceDTO {
  overall_compliance: number // Conformité globale en %
  by_category: Record<string, number>
  by_priority: Record<string, number>
  total_tickets: number
  total_violations: number
}

export interface SLAComplianceReportDTO {
  overall_compliance: number
  by_category: Record<string, number>
  by_priority: Record<string, number>
  total_tickets: number
  total_violations: number
  period: string
  generated_at: string
}

export const slaService = {
  // Récupérer tous les SLA
  getAll: async (): Promise<SLADTO[]> => {
    return apiRequest<SLADTO[]>('/sla')
  },

  // Récupérer un SLA par ID
  getById: async (id: number): Promise<SLADTO> => {
    return apiRequest<SLADTO>(`/sla/${id}`)
  },

  // Créer un SLA
  create: async (data: CreateSLARequest): Promise<SLADTO> => {
    return apiRequest<SLADTO>('/sla', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un SLA
  update: async (id: number, data: UpdateSLARequest): Promise<SLADTO> => {
    return apiRequest<SLADTO>(`/sla/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un SLA
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/sla/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer le taux de conformité d'un SLA
  getCompliance: async (id: number): Promise<SLAComplianceDTO> => {
    return apiRequest<SLAComplianceDTO>(`/sla/${id}/compliance`)
  },

  // Récupérer les violations d'un SLA
  getViolations: async (id: number): Promise<SLAViolationDTO[]> => {
    return apiRequest<SLAViolationDTO[]>(`/sla/${id}/violations`)
  },

  // Récupérer toutes les violations (scope = périmètre tableau de bord : department | filiale | global)
  getAllViolations: async (params?: { period?: string; category?: string; scope?: 'department' | 'filiale' | 'global' }): Promise<SLAViolationDTO[]> => {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append('period', params.period)
    if (params?.category) queryParams.append('category', params.category)
    if (params?.scope) queryParams.append('scope', params.scope)
    const query = queryParams.toString()
    return apiRequest<SLAViolationDTO[]>(`/sla/violations${query ? `?${query}` : ''}`)
  },

  // Générer un rapport de conformité
  getComplianceReport: async (params?: { period?: string; format?: string }): Promise<SLAComplianceReportDTO> => {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append('period', params.period)
    if (params?.format) queryParams.append('format', params.format)
    const query = queryParams.toString()
    return apiRequest<SLAComplianceReportDTO>(`/sla/compliance-report${query ? `?${query}` : ''}`)
  },

  // Récupérer le statut SLA d'un ticket
  getTicketSLAStatus: async (ticketId: number): Promise<TicketSLAStatusDTO> => {
    return apiRequest<TicketSLAStatusDTO>(`/sla/tickets/${ticketId}/status`)
  },
}
