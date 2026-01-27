import { apiRequest } from '../config/api'

export interface TicketCategoryDTO {
  id: number
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  is_active: boolean
  display_order: number
}

export interface CreateTicketCategoryRequest {
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  is_active?: boolean
  display_order?: number
}

export interface UpdateTicketCategoryRequest {
  name?: string
  slug?: string
  description?: string
  icon?: string
  color?: string
  is_active?: boolean
  display_order?: number
}

export const ticketCategoryService = {
  // Récupérer toutes les catégories
  getAll: async (activeOnly: boolean = false): Promise<TicketCategoryDTO[]> => {
    const url = activeOnly ? '/tickets/categories?active=true' : '/tickets/categories'
    const result = await apiRequest<TicketCategoryDTO[]>(url)
    console.log('ticketCategoryService.getAll - URL:', url, 'Result:', result)
    return result
  },

  // Récupérer une catégorie par ID
  getById: async (id: number): Promise<TicketCategoryDTO> => {
    return apiRequest<TicketCategoryDTO>(`/tickets/categories/${id}`)
  },

  // Récupérer une catégorie par slug
  getBySlug: async (slug: string): Promise<TicketCategoryDTO> => {
    return apiRequest<TicketCategoryDTO>(`/tickets/categories/slug/${slug}`)
  },

  // Créer une catégorie
  create: async (data: CreateTicketCategoryRequest): Promise<TicketCategoryDTO> => {
    return apiRequest<TicketCategoryDTO>('/tickets/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour une catégorie
  update: async (id: number, data: UpdateTicketCategoryRequest): Promise<TicketCategoryDTO> => {
    return apiRequest<TicketCategoryDTO>(`/tickets/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer une catégorie
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/tickets/categories/${id}`, {
      method: 'DELETE',
    })
  },
}
