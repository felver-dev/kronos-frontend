import { apiRequest } from '../config/api'

export interface CreateAssetRequest {
  name: string
  serial_number?: string
  model?: string
  manufacturer?: string
  category_id: number
  assigned_to?: number
  status?: 'available' | 'in_use' | 'maintenance' | 'retired'
  purchase_date?: string // Format: YYYY-MM-DD
  warranty_expiry?: string // Format: YYYY-MM-DD
  location?: string
  notes?: string
}

export interface UpdateAssetRequest {
  name?: string
  serial_number?: string
  model?: string
  manufacturer?: string
  category_id?: number
  assigned_to?: number | null
  status?: 'available' | 'in_use' | 'maintenance' | 'retired'
  purchase_date?: string
  warranty_expiry?: string
  location?: string
  notes?: string
}

export interface AssetDTO {
  id: number
  name: string
  serial_number?: string
  model?: string
  manufacturer?: string
  category_id: number
  category?: AssetCategoryDTO
  assigned_to?: number
  assigned_user?: {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
  }
  status: 'available' | 'in_use' | 'maintenance' | 'retired'
  purchase_date?: string
  warranty_expiry?: string
  location?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AssetCategoryDTO {
  id: number
  name: string
  description?: string
  parent_id?: number
}

export interface AssetInventoryDTO {
  total: number
  by_status: Record<string, number>
  by_category: Record<string, number>
  assigned: number
  available: number
}

export const assetService = {
  // Récupérer tous les actifs
  getAll: async (): Promise<AssetDTO[]> => {
    return apiRequest<AssetDTO[]>('/assets')
  },

  // Récupérer un actif par ID
  getById: async (id: number): Promise<AssetDTO> => {
    return apiRequest<AssetDTO>(`/assets/${id}`)
  },

  // Créer un actif
  create: async (data: CreateAssetRequest): Promise<AssetDTO> => {
    return apiRequest<AssetDTO>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un actif
  update: async (id: number, data: UpdateAssetRequest): Promise<AssetDTO> => {
    return apiRequest<AssetDTO>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un actif
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/assets/${id}`, {
      method: 'DELETE',
    })
  },

  // Assigner un actif à un utilisateur
  assign: async (id: number, userId: number): Promise<AssetDTO> => {
    return apiRequest<AssetDTO>(`/assets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    })
  },

  // Retirer l'assignation d'un actif
  unassign: async (id: number): Promise<AssetDTO> => {
    return apiRequest<AssetDTO>(`/assets/${id}/unassign-user`, {
      method: 'DELETE',
    })
  },

  // Récupérer les actifs par catégorie
  getByCategory: async (categoryId: number): Promise<AssetDTO[]> => {
    return apiRequest<AssetDTO[]>(`/assets/by-category/${categoryId}`)
  },

  // Récupérer les actifs par utilisateur
  getByUser: async (userId: number): Promise<AssetDTO[]> => {
    return apiRequest<AssetDTO[]>(`/assets/by-user/${userId}`)
  },

  // Récupérer l'inventaire
  getInventory: async (): Promise<AssetInventoryDTO> => {
    return apiRequest<AssetInventoryDTO>('/assets/inventory')
  },

  // Récupérer les tickets liés à un actif
  getLinkedTickets: async (id: number): Promise<any[]> => {
    return apiRequest<any[]>(`/assets/${id}/tickets`)
  },

  // Lier un ticket à un actif
  linkTicket: async (id: number, ticketId: number): Promise<void> => {
    return apiRequest<void>(`/assets/${id}/link-ticket/${ticketId}`, {
      method: 'POST',
    })
  },

  // Délier un ticket d'un actif
  unlinkTicket: async (id: number, ticketId: number): Promise<void> => {
    return apiRequest<void>(`/assets/${id}/unlink-ticket/${ticketId}`, {
      method: 'DELETE',
    })
  },

  // Catégories
  getCategories: async (): Promise<AssetCategoryDTO[]> => {
    const response = await apiRequest<{ categories: AssetCategoryDTO[]; pagination: any } | AssetCategoryDTO[]>('/assets/categories')
    // Le backend retourne { categories: [...], pagination: {...} }
    if (Array.isArray(response)) {
      return response
    }
    return response.categories || []
  },

  // Récupérer les catégories avec pagination
  getCategoriesPaginated: async (page: number = 1, limit: number = 25): Promise<{ categories: AssetCategoryDTO[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    return apiRequest<{ categories: AssetCategoryDTO[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(`/assets/categories?page=${page}&limit=${limit}`)
  },

  // Créer une catégorie
  createCategory: async (data: { name: string; description?: string; parent_id?: number }): Promise<AssetCategoryDTO> => {
    return apiRequest<AssetCategoryDTO>('/assets/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour une catégorie
  updateCategory: async (id: number, data: { name?: string; description?: string; parent_id?: number | null }): Promise<AssetCategoryDTO> => {
    return apiRequest<AssetCategoryDTO>(`/assets/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer une catégorie
  deleteCategory: async (id: number, confirmName?: string): Promise<void> => {
    const body = confirmName ? JSON.stringify({ confirm_name: confirmName }) : undefined
    return apiRequest<void>(`/assets/categories/${id}`, {
      method: 'DELETE',
      body,
    })
  },
}
