import { apiRequest } from '../config/api'

export interface OfficeDTO {
  id: number
  name: string
  country: string
  city: string
  commune?: string
  address?: string
  longitude?: number
  latitude?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateOfficeRequest {
  name: string
  country: string
  city: string
  commune?: string
  address?: string
  longitude?: number
  latitude?: number
  is_active?: boolean
}

export interface UpdateOfficeRequest {
  name?: string
  country?: string
  city?: string
  commune?: string
  address?: string
  longitude?: number
  latitude?: number
  is_active?: boolean
}

export const officeService = {
  // Récupérer tous les sièges
  getAll: async (activeOnly: boolean = false): Promise<OfficeDTO[]> => {
    const params = activeOnly ? '?active=true' : ''
    return apiRequest<OfficeDTO[]>(`/offices${params}`)
  },

  // Récupérer un siège par ID
  getById: async (id: number): Promise<OfficeDTO> => {
    return apiRequest<OfficeDTO>(`/offices/${id}`)
  },

  // Créer un siège
  create: async (data: CreateOfficeRequest): Promise<OfficeDTO> => {
    return apiRequest<OfficeDTO>('/offices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un siège
  update: async (id: number, data: UpdateOfficeRequest): Promise<OfficeDTO> => {
    return apiRequest<OfficeDTO>(`/offices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer un siège
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/offices/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer les sièges d'un pays
  getByCountry: async (country: string): Promise<OfficeDTO[]> => {
    return apiRequest<OfficeDTO[]>(`/offices/country/${encodeURIComponent(country)}`)
  },

  // Récupérer les sièges d'une ville
  getByCity: async (city: string): Promise<OfficeDTO[]> => {
    return apiRequest<OfficeDTO[]>(`/offices/city/${encodeURIComponent(city)}`)
  },
}
