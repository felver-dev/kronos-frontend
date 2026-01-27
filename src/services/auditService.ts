import { apiRequest } from '../config/api'

export interface AuditUserDTO {
  id: number
  username: string
  first_name?: string
  last_name?: string
}

export interface AuditLogDTO {
  id: number
  user_id?: number
  user?: AuditUserDTO
  action: string
  entity_type: string
  entity_id?: number
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  description?: string
  created_at: string
}

export interface PaginationDTO {
  page: number
  limit: number
  total: number
}

export interface AuditLogListResponse {
  logs: AuditLogDTO[]
  pagination: PaginationDTO
}

export const auditService = {
  getAll: (params: {
    page: number
    limit: number
    userId?: number
    action?: string
    entityType?: string
  }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    })
    if (params.userId) query.set('userId', String(params.userId))
    if (params.action) query.set('action', params.action)
    if (params.entityType) query.set('entityType', params.entityType)

    return apiRequest<AuditLogListResponse>(`/audit-logs?${query.toString()}`)
  },
}
