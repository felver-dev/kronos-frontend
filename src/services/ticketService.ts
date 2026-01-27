import { apiRequest, API_BASE_URL } from '../config/api'
import { UserDTO } from './userService'

export interface CreateTicketRequest {
  title: string
  description: string
  category: string
  source: 'mail' | 'appel' | 'direct' | 'whatsapp'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  estimated_time?: number
  requester_id?: number // ID du demandeur (prioritaire sur requester_name)
  requester_name?: string // Nom de la personne qui a fait la demande (obligatoire si requester_id non fourni)
  requester_department: string // Département du demandeur (ex: DAF)
}

export interface UpdateTicketRequest {
  title?: string
  description?: string
  category?: string
  status?: 'ouvert' | 'en_cours' | 'en_attente' | 'cloture'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  requester_id?: number // ID du demandeur (prioritaire sur requester_name)
  requester_name?: string // Nom du demandeur (fallback)
  requester_department?: string
}

export interface AssignTicketRequest {
  user_id?: number
  user_ids?: number[]
  lead_id?: number
  estimated_time?: number
}

export interface TicketDTO {
  id: number
  code: string // Code unique: TKT-YYYY-NNNN
  title: string
  description: string
  category: string
  source: string
  status: string
  priority?: string
  created_by: UserDTO // Créateur du ticket (informaticien)
  assigned_to?: UserDTO // Utilisateur assigné
  assignees?: {
    user: UserDTO
    is_lead: boolean
  }[]
  lead?: UserDTO
  requester_id?: number // ID du demandeur (relation vers users)
  requester?: UserDTO // Demandeur (relation vers users)
  requester_name?: string // Nom de la personne qui a fait la demande (fallback pour demandeurs externes)
  requester_department?: string // Département du demandeur
  estimated_time?: number
  actual_time?: number
  primary_image?: string
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface TicketCommentDTO {
  id: number
  ticket_id: number
  user: UserDTO
  comment: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface CreateTicketCommentRequest {
  comment: string
  is_internal?: boolean
}

export interface TicketAttachmentDTO {
  id: number
  ticket_id: number
  user: UserDTO
  file_name: string
  file_path: string
  thumbnail_path?: string
  file_size?: number
  mime_type?: string
  is_image: boolean
  display_order: number
  description?: string
  created_at: string
}

export interface TicketHistoryDTO {
  id: number
  ticket_id: number
  user: UserDTO
  action: string
  field_name?: string
  old_value?: string
  new_value?: string
  description?: string
  created_at: string
}

export interface PaginationDTO {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface TicketListResponse {
  tickets: TicketDTO[]
  pagination: PaginationDTO
}

export const ticketService = {
  // Créer un ticket
  create: async (data: CreateTicketRequest): Promise<TicketDTO> => {
    return apiRequest<TicketDTO>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Récupérer tous les tickets avec pagination
  getAll: async (page: number = 1, limit: number = 20): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets?page=${page}&limit=${limit}`)
  },

  // Récupérer un ticket par ID
  getById: async (id: number, options?: { includeDepartment?: boolean }): Promise<TicketDTO> => {
    const params = new URLSearchParams()
    if (options?.includeDepartment) {
      params.append('include_department', 'true')
    }
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<TicketDTO>(`/tickets/${id}${suffix}`)
  },

  // Mettre à jour un ticket
  update: async (id: number, data: UpdateTicketRequest): Promise<TicketDTO> => {
    return apiRequest<TicketDTO>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un ticket
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/tickets/${id}`, {
      method: 'DELETE',
    })
  },

  // Assigner un ticket
  assign: async (id: number, data: AssignTicketRequest): Promise<TicketDTO> => {
    console.log('ticketService.assign payload:', data)
    return apiRequest<TicketDTO>(`/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Changer le statut d'un ticket
  changeStatus: async (id: number, status: string): Promise<TicketDTO> => {
    return apiRequest<TicketDTO>(`/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  // Fermer un ticket
  close: async (id: number): Promise<TicketDTO> => {
    return apiRequest<TicketDTO>(`/tickets/${id}/close`, {
      method: 'POST',
    })
  },

  // Récupérer les tickets par catégorie
  getByCategory: async (category: string, page: number = 1, limit: number = 20, status?: string, priority?: string): Promise<TicketListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (status && status !== 'all') {
      params.append('status', status)
    }
    if (priority && priority !== 'all') {
      params.append('priority', priority)
    }
    const url = `/tickets/by-category/${category}?${params.toString()}`
    console.log('DEBUG ticketService.getByCategory - URL:', url, 'status:', status, 'priority:', priority)
    return apiRequest<TicketListResponse>(url)
  },

  // Récupérer les tickets par statut
  getByStatus: async (status: string, page: number = 1, limit: number = 20): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets/by-status/${status}?page=${page}&limit=${limit}`)
  },

  // Récupérer les tickets par source
  getBySource: async (source: string, page: number = 1, limit: number = 20): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets/by-source/${source}?page=${page}&limit=${limit}`)
  },

  // Récupérer les tickets par département du demandeur
  getByDepartment: async (departmentId: number, page: number = 1, limit: number = 20): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets/by-department/${departmentId}?page=${page}&limit=${limit}`)
  },

  // Récupérer les tickets assignés à un utilisateur
  getByAssignee: async (userId: number, page: number = 1, limit: number = 20): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets/by-assignee/${userId}?page=${page}&limit=${limit}`)
  },

  // Récupérer mes tickets (utilisateur connecté)
  getMyTickets: async (page: number = 1, limit: number = 20, status?: string): Promise<TicketListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (status && status !== 'all') {
      params.append('status', status)
    }
    return apiRequest<TicketListResponse>(`/tickets/my-tickets?${params.toString()}`)
  },

  // Récupérer mon panier: tickets assignés à moi et non clôturés (disparaissent à la clôture)
  getPanier: async (page: number = 1, limit: number = 50): Promise<TicketListResponse> => {
    return apiRequest<TicketListResponse>(`/tickets/panier?page=${page}&limit=${limit}`)
  },

  // Ajouter un commentaire
  addComment: async (ticketId: number, data: CreateTicketCommentRequest): Promise<TicketCommentDTO> => {
    return apiRequest<TicketCommentDTO>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Récupérer les commentaires d'un ticket
  getComments: async (ticketId: number): Promise<TicketCommentDTO[]> => {
    return apiRequest<TicketCommentDTO[]>(`/tickets/${ticketId}/comments`)
  },

  // Récupérer l'historique d'un ticket
  getHistory: async (ticketId: number): Promise<TicketHistoryDTO[]> => {
    return apiRequest<TicketHistoryDTO[]>(`/tickets/${ticketId}/history`)
  },

  // Récupérer les pièces jointes d'un ticket
  getAttachments: async (ticketId: number): Promise<TicketAttachmentDTO[]> => {
    return apiRequest<TicketAttachmentDTO[]>(`/tickets/${ticketId}/attachments`)
  },

  // Uploader une pièce jointe
  uploadAttachment: async (ticketId: number, file: File, description?: string, displayOrder?: number): Promise<TicketAttachmentDTO> => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    if (displayOrder !== undefined) formData.append('display_order', displayOrder.toString())

    const token = sessionStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Ne pas mettre Content-Type pour FormData, le navigateur le fait automatiquement
      },
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = 'Erreur lors de l\'upload de l\'image'
      try {
        const error = await response.json()
        errorMessage = error.message || error.error || errorMessage
      } catch {
        errorMessage = response.statusText || `Erreur ${response.status}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    // Si le backend retourne { success: true, data: {...} }, extraire data
    if (data.data !== undefined) {
      return data.data
    }
    return data
  },

  // Supprimer une pièce jointe
  deleteAttachment: async (ticketId: number, attachmentId: number): Promise<void> => {
    return apiRequest<void>(`/tickets/${ticketId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
  },
}

// Types pour les solutions de tickets
export interface TicketSolutionDTO {
  id: number
  ticket_id: number
  solution: string
  created_by: UserDTO
  created_at: string
  updated_at: string
}

export interface CreateTicketSolutionRequest {
  solution: string
}

export interface UpdateTicketSolutionRequest {
  solution: string
}

export interface PublishSolutionToKBRequest {
  title: string
  category_id: number
}

export const ticketSolutionService = {
  // Récupérer toutes les solutions d'un ticket
  getByTicketId: async (ticketId: number): Promise<TicketSolutionDTO[]> => {
    return apiRequest<TicketSolutionDTO[]>(`/tickets/${ticketId}/solutions`)
  },

  // Récupérer une solution par ID
  getById: async (id: number): Promise<TicketSolutionDTO> => {
    return apiRequest<TicketSolutionDTO>(`/tickets/solutions/${id}`)
  },

  // Créer une solution
  create: async (ticketId: number, data: CreateTicketSolutionRequest): Promise<TicketSolutionDTO> => {
    return apiRequest<TicketSolutionDTO>(`/tickets/${ticketId}/solutions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour une solution
  update: async (id: number, data: UpdateTicketSolutionRequest): Promise<TicketSolutionDTO> => {
    return apiRequest<TicketSolutionDTO>(`/tickets/solutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer une solution
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/tickets/solutions/${id}`, {
      method: 'DELETE',
    })
  },

  // Publier une solution dans la base de connaissances
  publishToKB: async (id: number, data: PublishSolutionToKBRequest): Promise<any> => {
    return apiRequest<any>(`/tickets/solutions/${id}/publish-to-kb`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
