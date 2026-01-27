import { apiRequest } from '../config/api'

export interface Settings {
  [key: string]: any
}

export interface UpdateSettingsRequest {
  settings: Record<string, any>
}

export const settingsService = {
  // Récupérer tous les paramètres
  getAll: async (): Promise<Settings> => {
    return apiRequest<Settings>('/settings')
  },

  // Mettre à jour les paramètres
  update: async (settings: Record<string, any>): Promise<Settings> => {
    const request: UpdateSettingsRequest = { settings }
    return apiRequest<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(request),
    })
  },
}
