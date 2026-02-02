import { apiRequest } from '../config/api'
import { FilialeDTO } from './filialeService'

export interface SoftwareDTO {
  id: number
  code: string
  name: string
  description?: string
  version?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FilialeSoftwareDTO {
  id: number
  filiale_id: number
  filiale?: FilialeDTO
  software_id: number
  software?: SoftwareDTO
  version?: string
  deployed_at?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateSoftwareRequest {
  code: string
  name: string
  description?: string
  version?: string
}

export interface UpdateSoftwareRequest {
  name?: string
  description?: string
  version?: string
  is_active?: boolean
}

export interface CreateFilialeSoftwareRequest {
  filiale_id: number
  software_id: number
  version?: string
  deployed_at?: string
  notes?: string
}

export interface UpdateFilialeSoftwareRequest {
  version?: string
  deployed_at?: string
  is_active?: boolean
  notes?: string
}

export const softwareService = {
  // Récupérer tous les logiciels
  getAll: async (activeOnly: boolean = false): Promise<SoftwareDTO[]> => {
    const params = activeOnly ? '?active=true' : ''
    return apiRequest<SoftwareDTO[]>(`/software${params}`)
  },

  // Récupérer un logiciel par ID
  getById: async (id: number): Promise<SoftwareDTO> => {
    return apiRequest<SoftwareDTO>(`/software/${id}`)
  },

  // Récupérer un logiciel par code
  getByCode: async (code: string): Promise<SoftwareDTO> => {
    return apiRequest<SoftwareDTO>(`/software/code/${code}`)
  },

  // Récupérer uniquement les logiciels actifs
  getActive: async (): Promise<SoftwareDTO[]> => {
    return apiRequest<SoftwareDTO[]>('/software/active')
  },

  // Créer un logiciel
  create: async (data: CreateSoftwareRequest): Promise<SoftwareDTO> => {
    return apiRequest<SoftwareDTO>('/software', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un logiciel
  update: async (id: number, data: UpdateSoftwareRequest): Promise<SoftwareDTO> => {
    return apiRequest<SoftwareDTO>(`/software/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer un logiciel
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/software/${id}`, {
      method: 'DELETE',
    })
  },

  // ===== Déploiements (FilialeSoftware) =====

  // Récupérer tous les déploiements d'une filiale
  getDeploymentsByFiliale: async (filialeId: number): Promise<FilialeSoftwareDTO[]> => {
    return apiRequest<FilialeSoftwareDTO[]>(`/filiales/${filialeId}/software`)
  },

  // Récupérer tous les déploiements d'un logiciel
  getDeploymentsBySoftware: async (softwareId: number): Promise<FilialeSoftwareDTO[]> => {
    return apiRequest<FilialeSoftwareDTO[]>(`/software/${softwareId}/deployments`)
  },

  // Récupérer un déploiement par ID
  getDeploymentById: async (id: number): Promise<FilialeSoftwareDTO> => {
    return apiRequest<FilialeSoftwareDTO>(`/filiales-software/${id}`)
  },

  // Récupérer tous les déploiements actifs
  getActiveDeployments: async (): Promise<FilialeSoftwareDTO[]> => {
    return apiRequest<FilialeSoftwareDTO[]>('/filiales-software/active')
  },

  // Récupérer tous les déploiements (actifs et inactifs)
  getAllDeployments: async (): Promise<FilialeSoftwareDTO[]> => {
    return apiRequest<FilialeSoftwareDTO[]>('/filiales-software')
  },

  // Créer un déploiement
  createDeployment: async (filialeId: number, data: CreateFilialeSoftwareRequest): Promise<FilialeSoftwareDTO> => {
    return apiRequest<FilialeSoftwareDTO>(`/filiales/${filialeId}/software`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un déploiement
  updateDeployment: async (id: number, data: UpdateFilialeSoftwareRequest): Promise<FilialeSoftwareDTO> => {
    return apiRequest<FilialeSoftwareDTO>(`/filiales-software/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  // Supprimer un déploiement
  deleteDeployment: async (id: number): Promise<void> => {
    return apiRequest<void>(`/filiales-software/${id}`, {
      method: 'DELETE',
    })
  },
}
