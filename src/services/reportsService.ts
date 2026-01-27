import { apiRequest } from '../config/api'

export interface PeriodBreakdownDTO {
  date: string
  count: number
  created?: number
  closed?: number
  in_progress?: number
  pending?: number
  open?: number
}

export interface TicketCountReportDTO {
  period: string
  count: number
  breakdown: PeriodBreakdownDTO[]
}

export interface TicketTypeDistributionDTO {
  incidents: number
  demandes: number
  changements: number
  developpements: number
  assistance: number
  support: number
}

export interface AverageResolutionTimeDTO {
  average_time: number
  unit: string
}

export interface UserDTO {
  id: number
  username: string
  first_name?: string
  last_name?: string
}

export interface WorkloadByAgentDTO {
  user_id: number
  user?: UserDTO
  ticket_count: number
  resolved_count: number
  in_progress_count: number
  pending_count: number
  open_count: number
  delayed_count: number
  average_time: number
  total_time: number
  efficiency: number
}

export interface SLAComplianceReportDTO {
  overall_compliance: number
  total_tickets: number
  total_violations: number
}

export interface AssetReportDTO {
  period: string
  total: number
  by_status: Record<string, number>
  by_category: Record<string, number>
}

export interface KnowledgeReportDTO {
  period: string
  total: number
  published: number
  draft: number
  by_category: Record<string, number>
}

export interface DashboardDTO {
  tickets: {
    total: number
    by_category: Record<string, number>
    by_status: Record<string, number>
    by_priority: Record<string, number>
    average_resolution_time: number
    delayed: number
    open: number
    closed: number
  }
  period: string
  users?: {
    total: number
    active: number
    by_role?: Record<string, number>
    average_tickets_per_user?: number
  }
  assets?: {
    total: number
    by_status: Record<string, number>
    by_category: Record<string, number>
  }
  worked_hours?: {
    total_minutes: number
    total_hours: number
    period: string
  }
}

export const reportsService = {
  getDashboard: (period: string) =>
    apiRequest<DashboardDTO>(`/reports/dashboard?period=${encodeURIComponent(period)}`),
  getTicketCountReport: (period: string) =>
    apiRequest<TicketCountReportDTO>(`/reports/tickets/count?period=${encodeURIComponent(period)}`),
  getTicketTypeDistribution: () => apiRequest<TicketTypeDistributionDTO>(`/reports/tickets/distribution`),
  getAverageResolutionTime: () => apiRequest<AverageResolutionTimeDTO>(`/reports/tickets/average-resolution-time`),
  getWorkloadByAgent: (period: string) =>
    apiRequest<WorkloadByAgentDTO[]>(`/reports/tickets/by-agent?period=${encodeURIComponent(period)}`),
  getSlaCompliance: (period: string) =>
    apiRequest<SLAComplianceReportDTO>(`/reports/sla/compliance?period=${encodeURIComponent(period)}`),
  getAssetSummary: (period: string) =>
    apiRequest<AssetReportDTO>(`/reports/assets/summary?period=${encodeURIComponent(period)}`),
  getKnowledgeSummary: (period: string) =>
    apiRequest<KnowledgeReportDTO>(`/reports/knowledge/summary?period=${encodeURIComponent(period)}`),
}
