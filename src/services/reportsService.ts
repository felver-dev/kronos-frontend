import { apiRequest } from '../config/api'

/** Répartition par sous-période, alignée sur les statuts en base : ouvert, en_cours, en_attente, resolu, cloture */
export interface PeriodBreakdownDTO {
  date: string
  count: number
  open?: number
  in_progress?: number
  pending?: number
  resolved?: number
  closed?: number
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

/** Stats tickets internes (rempli seulement si l'utilisateur a les permissions tickets_internes) */
export interface TicketInternalStatsDTO {
  total: number
  by_status: Record<string, number>
  by_priority?: Record<string, number>
  open: number
  closed: number
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
  /** Heures travaillées (API uniquement, non affichées au board) */
  worked_hours?: {
    total_minutes: number
    total_hours: number
    period: string
  }
  /** Message optionnel (ex: aucun département associé au compte) */
  message?: string
  /** Stats tickets internes (présent seulement si l'utilisateur a une permission tickets_internes) */
  ticket_internes?: TicketInternalStatsDTO
}

/** Périmètre du tableau de bord : department | filiale | global (pour filtrer les données) */
export type ReportScope = 'department' | 'filiale' | 'global'

function scopeQuery(scope?: ReportScope): string {
  return scope ? `&scope=${encodeURIComponent(scope)}` : ''
}

export const reportsService = {
  getDashboard: (period: string, scope?: ReportScope) =>
    apiRequest<DashboardDTO>(`/reports/dashboard?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
  getTicketCountReport: (period: string, scope?: ReportScope) =>
    apiRequest<TicketCountReportDTO>(`/reports/tickets/count?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
  getTicketTypeDistribution: (scope?: ReportScope) =>
    apiRequest<TicketTypeDistributionDTO>(`/reports/tickets/distribution${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`),
  getAverageResolutionTime: (scope?: ReportScope) =>
    apiRequest<AverageResolutionTimeDTO>(`/reports/tickets/average-resolution-time${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`),
  getWorkloadByAgent: (period: string, scope?: ReportScope) =>
    apiRequest<WorkloadByAgentDTO[]>(`/reports/tickets/by-agent?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
  getSlaCompliance: (period: string, scope?: ReportScope) =>
    apiRequest<SLAComplianceReportDTO>(`/reports/sla/compliance?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
  getAssetSummary: (period: string, scope?: ReportScope) =>
    apiRequest<AssetReportDTO>(`/reports/assets/summary?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
  getKnowledgeSummary: (period: string, scope?: ReportScope) =>
    apiRequest<KnowledgeReportDTO>(`/reports/knowledge/summary?period=${encodeURIComponent(period)}${scopeQuery(scope)}`),
}
