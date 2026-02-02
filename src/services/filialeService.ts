import { apiRequest, publicApiRequest } from '../config/api'

export interface FilialeDTO {
  id: number
  code: string
  name: string
  country?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
  is_software_provider: boolean
  created_at: string
  updated_at: string
}

export interface CreateFilialeRequest {
  code: string
  name: string
  country?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  is_software_provider?: boolean
}

export interface UpdateFilialeRequest {
  name?: string
  country?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
  is_software_provider?: boolean
}

export const filialeService = {
  // Récupérer toutes les filiales
  getAll: async (activeOnly: boolean = false): Promise<FilialeDTO[]> => {
    const params = activeOnly ? '?active=true' : ''
    return apiRequest<FilialeDTO[]>(`/filiales${params}`)
  },

  // Récupérer une filiale par ID
  getById: async (id: number): Promise<FilialeDTO> => {
    return apiRequest<FilialeDTO>(`/filiales/${id}`)
  },

  // Récupérer une filiale par code
  getByCode: async (code: string): Promise<FilialeDTO> => {
    return apiRequest<FilialeDTO>(`/filiales/code/${code}`)
  },

  // Récupérer uniquement les filiales actives (route publique pour l'inscription)
  getActive: async (): Promise<FilialeDTO[]> => {
    return publicApiRequest<FilialeDTO[]>('/filiales/active')
  },

  // Récupérer la filiale fournisseur de logiciels (is_software_provider)
  getSoftwareProvider: async (): Promise<FilialeDTO> => {
    return apiRequest<FilialeDTO>('/filiales/software-provider')
  },

  // Créer une filiale
  create: async (data: CreateFilialeRequest): Promise<FilialeDTO> => {
    return apiRequest<FilialeDTO>('/filiales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour une filiale
  update: async (id: number, data: UpdateFilialeRequest): Promise<FilialeDTO> => {
    return apiRequest<FilialeDTO>(`/filiales/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer une filiale
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/filiales/${id}`, {
      method: 'DELETE',
    })
  },
}
