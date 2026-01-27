import { apiRequest } from '../config/api'

export interface AssetSoftwareDTO {
  id: number
  asset_id?: number
  software_name: string
  version?: string
  license_key?: string
  installation_date?: string
  notes?: string
  created_at: string
  updated_at: string
  asset?: {
    id: number
    name: string
    serial_number?: string
    model?: string
    manufacturer?: string
    category_id: number
    category?: {
      id: number
      name: string
    }
    status: string
    assigned_to?: number
    assigned_user?: {
      id: number
      username: string
      email: string
      first_name?: string
      last_name?: string
    }
  }
}

export interface CreateAssetSoftwareRequest {
  asset_id?: number // Optionnel - permet de créer des logiciels indépendamment des actifs
  software_name: string
  version?: string
  license_key?: string
  installation_date?: string // Format: YYYY-MM-DD
  notes?: string
}

export interface UpdateAssetSoftwareRequest {
  software_name?: string
  version?: string
  license_key?: string
  installation_date?: string // Format: YYYY-MM-DD
  notes?: string
}

export interface SoftwareCountDTO {
  software_name: string
  version: string
  count: number
  category_name: string
}

export interface SoftwareNameCountDTO {
  software_name: string
  count: number
}

export interface AssetSoftwareStatisticsDTO {
  by_software: SoftwareCountDTO[]
  by_software_name: SoftwareNameCountDTO[]
}

export const assetSoftwareService = {
  // Récupérer tous les logiciels installés
  getAll: async (): Promise<AssetSoftwareDTO[]> => {
    return apiRequest<AssetSoftwareDTO[]>('/assets/software')
  },

  // Récupérer tous les logiciels installés sur un actif
  getByAssetId: async (assetId: number): Promise<AssetSoftwareDTO[]> => {
    return apiRequest<AssetSoftwareDTO[]>(`/assets/${assetId}/software`)
  },

  // Récupérer un logiciel installé par son ID
  getById: async (id: number): Promise<AssetSoftwareDTO> => {
    return apiRequest<AssetSoftwareDTO>(`/assets/software/${id}`)
  },

  // Récupérer tous les actifs ayant un logiciel spécifique
  getBySoftwareName: async (softwareName: string): Promise<AssetSoftwareDTO[]> => {
    return apiRequest<AssetSoftwareDTO[]>(`/assets/software/by-name/${encodeURIComponent(softwareName)}`)
  },

  // Récupérer tous les actifs ayant un logiciel avec une version spécifique
  getBySoftwareNameAndVersion: async (softwareName: string, version: string): Promise<AssetSoftwareDTO[]> => {
    return apiRequest<AssetSoftwareDTO[]>(`/assets/software/by-name/${encodeURIComponent(softwareName)}/version/${encodeURIComponent(version)}`)
  },

  // Créer un logiciel installé
  create: async (data: CreateAssetSoftwareRequest): Promise<AssetSoftwareDTO> => {
    return apiRequest<AssetSoftwareDTO>('/assets/software', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un logiciel installé
  update: async (id: number, data: UpdateAssetSoftwareRequest): Promise<AssetSoftwareDTO> => {
    return apiRequest<AssetSoftwareDTO>(`/assets/software/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un logiciel installé
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/assets/software/${id}`, {
      method: 'DELETE',
    })
  },

  // Récupérer les statistiques sur les logiciels installés
  getStatistics: async (): Promise<AssetSoftwareStatisticsDTO> => {
    return apiRequest<AssetSoftwareStatisticsDTO>('/assets/software/statistics')
  },
}
