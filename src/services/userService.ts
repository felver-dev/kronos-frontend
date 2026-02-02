import { apiRequest, API_BASE_URL } from '../config/api'

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  department_id?: number
  filiale_id?: number
  role_id: number
}

export interface UserDTO {
  id: number
  username: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  department_id?: number
  filiale_id?: number
  permissions?: string[]
  department?: {
    id: number
    name: string
    code: string
    description?: string
    office_id?: number
    office?: {
      id: number
      name: string
      country: string
      city: string
      commune?: string
      address?: string
      latitude?: number
      longitude?: number
      is_active: boolean
    }
    is_active: boolean
    created_at: string
    updated_at: string
  }
  filiale?: {
    id: number
    code: string
    name: string
    country?: string
    city?: string
    is_active: boolean
    is_software_provider: boolean
  }
  avatar?: string
  role: string
  is_active: boolean
  last_login?: string
  created_at?: string
  updated_at?: string
}

export interface UpdateUserRequest {
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  department_id?: number | null
  filiale_id?: number | null
  role_id?: number
  is_active?: boolean
}

export interface RoleDTO {
  id: number
  name: string
  description?: string
  is_system?: boolean
  created_at?: string
  updated_at?: string
}

export const userService = {
  getAll: async (): Promise<UserDTO[]> => {
    return apiRequest<UserDTO[]>('/users')
  },
  getForTicketCreation: async (): Promise<UserDTO[]> => {
    return apiRequest<UserDTO[]>('/users/for-ticket-creation')
  },
  getById: async (id: number): Promise<UserDTO> => {
    return apiRequest<UserDTO>(`/users/${id}`)
  },
  create: async (data: CreateUserRequest): Promise<UserDTO> => {
    return apiRequest<UserDTO>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  update: async (id: number, data: UpdateUserRequest): Promise<UserDTO> => {
    // Nettoyer les données : ne pas envoyer les champs undefined ou vides
    const cleanData: any = {}

    if (data.username !== undefined && data.username !== '') cleanData.username = data.username
    if (data.email !== undefined && data.email !== '') cleanData.email = data.email
    if (data.first_name !== undefined && data.first_name !== '') cleanData.first_name = data.first_name
    if (data.last_name !== undefined && data.last_name !== '') cleanData.last_name = data.last_name
    if (data.phone !== undefined && data.phone !== '') cleanData.phone = data.phone
    // Toujours envoyer role_id s'il est défini (même si 0, mais normalement ce ne devrait pas arriver)
    if (data.role_id !== undefined && data.role_id !== null) {
      cleanData.role_id = data.role_id
    }
    if (data.is_active !== undefined) cleanData.is_active = data.is_active
    // Envoyer department_id seulement s'il est défini et non null, ou s'il est explicitement null pour retirer l'utilisateur d'un département
    // Ne pas envoyer si undefined pour ne pas modifier le département existant
    if (data.department_id !== undefined) {
      // Si c'est null, c'est une intention explicite de retirer le département
      // Si c'est un nombre, c'est une intention d'assigner un département
      cleanData.department_id = data.department_id
    }
    // Si department_id est undefined, ne pas l'inclure dans la requête
    // Toujours envoyer filiale_id (peut être null pour retirer l'utilisateur d'une filiale)
    if (data.filiale_id !== undefined) {
      cleanData.filiale_id = data.filiale_id
    }

    console.log('Données envoyées pour la mise à jour:', cleanData)

    return apiRequest<UserDTO>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanData),
    })
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/users/${id}`, {
      method: 'DELETE',
    })
  },
  getRoles: async (): Promise<RoleDTO[]> => {
    return apiRequest<RoleDTO[]>('/roles')
  },
  changePassword: async (id: number, data: any): Promise<void> => {
    return apiRequest<void>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  /** Réinitialisation du mot de passe par un admin (sans ancien mot de passe). Nécessite users.update */
  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    return apiRequest<void>(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    })
  },

  uploadAvatar: async (id: number, file: File): Promise<UserDTO> => {
    const token = sessionStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}/users/${id}/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'Erreur lors de l\'upload de la photo')
    }
    const data = await res.json()
    return (data.data !== undefined ? data.data : data) as UserDTO
  },

  deleteAvatar: async (id: number): Promise<UserDTO> => {
    return apiRequest<UserDTO>(`/users/${id}/avatar`, { method: 'DELETE' })
  },
}
