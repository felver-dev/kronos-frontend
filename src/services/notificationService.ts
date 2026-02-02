import { apiRequest } from '../config/api'

export interface NotificationDTO {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  is_read: boolean
  read_at?: string
  link_url?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface UnreadCountResponse {
  count: number
}

export interface NotificationListResponse {
  notifications: NotificationDTO[]
  unread_count: number
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface NotificationHistoryFilters {
  page?: number
  limit?: number
  is_read?: boolean
  date_from?: string
  date_to?: string
  search?: string
  user_id?: number
  filiale_id?: number
}

export const notificationService = {
  // Récupérer toutes les notifications de l'utilisateur connecté
  getAll: async (): Promise<NotificationDTO[]> => {
    const res = await apiRequest<NotificationDTO[]>('/notifications')
    return Array.isArray(res) ? res : []
  },

  // Récupérer uniquement les notifications non lues (pour la cloche)
  // Fallback : si GET /notifications/unread n'existe pas (404), utiliser GET /notifications et filtrer
  getUnread: async (): Promise<NotificationDTO[]> => {
    try {
      const res = await apiRequest<NotificationDTO[]>('/notifications/unread')
      return Array.isArray(res) ? res : []
    } catch {
      const all = await apiRequest<NotificationDTO[]>('/notifications')
      const list = Array.isArray(all) ? all : []
      return list.filter((n) => !n.is_read)
    }
  },

  // Récupérer le nombre de notifications non lues
  getUnreadCount: async (): Promise<number> => {
    const res = await apiRequest<UnreadCountResponse>('/notifications/unread/count')
    return res?.count || 0
  },

  // Historique avec filtres et pagination
  getHistory: async (filters: NotificationHistoryFilters = {}): Promise<NotificationListResponse> => {
    const params = new URLSearchParams()
    if (filters.page != null) params.set('page', String(filters.page))
    if (filters.limit != null) params.set('limit', String(filters.limit))
    if (filters.is_read === true) params.set('is_read', 'true')
    if (filters.is_read === false) params.set('is_read', 'false')
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.search) params.set('search', filters.search.trim())
    if (filters.user_id != null) params.set('user_id', String(filters.user_id))
    if (filters.filiale_id != null) params.set('filiale_id', String(filters.filiale_id))
    const q = params.toString()
    const res = await apiRequest<NotificationListResponse>(`/notifications/history${q ? `?${q}` : ''}`)
    return res ?? { notifications: [], unread_count: 0, total: 0, page: 1, limit: 20, total_pages: 0 }
  },

  // Marquer une notification comme lue
  markAsRead: async (id: number): Promise<void> => {
    await apiRequest(`/notifications/${id}/read`, {
      method: 'POST',
    })
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (): Promise<void> => {
    await apiRequest('/notifications/read-all', {
      method: 'POST',
    })
  },
}
