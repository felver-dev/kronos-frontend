import { apiRequest } from '../config/api'

export interface UserDTO {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface DepartmentDTO {
  id: number
  name: string
  code?: string
  filiale_id?: number
}

export interface FilialeDTO {
  id: number
  name: string
  code?: string
}

export interface TicketInternalDTO {
  id: number
  code: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  department_id: number
  department?: DepartmentDTO
  filiale_id: number
  filiale?: FilialeDTO
  created_by_id: number
  created_by: UserDTO
  assigned_to_id?: number
  assigned_to?: UserDTO
  validated_by_user_id?: number
  validated_by?: UserDTO
  validated_at?: string
  estimated_time?: number
  actual_time?: number
  ticket_id?: number
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface CreateTicketInternalRequest {
  title: string
  description: string
  category: string
  priority?: string
  department_id: number
  estimated_time?: number
  assigned_to_id?: number
  ticket_id?: number
}

export interface UpdateTicketInternalRequest {
  title?: string
  description?: string
  category?: string
  status?: string
  priority?: string
  estimated_time?: number  // minutes
  actual_time?: number    // temps passé en minutes (saisi par l'assigné ou son chef)
  assigned_to_id?: number
}

export interface AssignTicketInternalRequest {
  assigned_to_id?: number
  estimated_time?: number
}

export interface PaginationDTO {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface TicketInternalListResponse {
  tickets: TicketInternalDTO[]
  pagination: PaginationDTO
}

/** Performance de l'utilisateur sur les tickets internes qu'il traite (assignés à lui) */
export interface TicketInternalPerformanceDTO {
  total_assigned: number
  resolved: number
  in_progress: number
  open: number
  total_time_spent: number
  efficiency: number
}

export const ticketInternalService = {
  getAll: async (
    page: number = 1,
    limit: number = 20,
    opts?: { scope?: string; status?: string; department_id?: number; filiale_id?: number }
  ): Promise<TicketInternalListResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (opts?.scope) params.append('scope', opts.scope)
    if (opts?.status) params.append('status', opts.status)
    if (opts?.department_id != null) params.append('department_id', String(opts.department_id))
    if (opts?.filiale_id != null) params.append('filiale_id', String(opts.filiale_id))
    return apiRequest<TicketInternalListResponse>(`/ticket-internes?${params.toString()}`)
  },

  getById: async (id: number): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}`)
  },

  getPanier: async (page: number = 1, limit: number = 50): Promise<TicketInternalListResponse> => {
    return apiRequest<TicketInternalListResponse>(`/ticket-internes/panier?page=${page}&limit=${limit}`)
  },

  getMyPerformance: async (): Promise<TicketInternalPerformanceDTO> => {
    return apiRequest<TicketInternalPerformanceDTO>('/ticket-internes/performance/mine')
  },

  create: async (data: CreateTicketInternalRequest): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>('/ticket-internes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: number, data: UpdateTicketInternalRequest): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  assign: async (id: number, data: AssignTicketInternalRequest): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  changeStatus: async (id: number, status: string): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  validate: async (id: number): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}/validate`, {
      method: 'POST',
    })
  },

  close: async (id: number): Promise<TicketInternalDTO> => {
    return apiRequest<TicketInternalDTO>(`/ticket-internes/${id}/close`, {
      method: 'POST',
    })
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/ticket-internes/${id}`, {
      method: 'DELETE',
    })
  },
}
