import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { notificationService, NotificationDTO } from '../services/notificationService'
import { useToastContext } from '../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { API_BASE_URL } from '../config/api'

const POLL_INTERVAL_MS = 12_000 // 12 secondes

export const Notifications = () => {
  const toast = useToastContext()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationDTO[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCountRef = useRef(0)
  unreadCountRef.current = unreadCount

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const [unreadList, count] = await Promise.all([
        notificationService.getUnread(),
        notificationService.getUnreadCount(),
      ])
      setNotifications(unreadList)
      setUnreadCount(count)
    } catch {
      // Fallback si GET /unread ou GET /unread/count n'existent pas (backend ancien)
      try {
        const all = await notificationService.getAll()
        const unreadOnly = all.filter((n) => !n.is_read)
        setNotifications(unreadOnly)
        setUnreadCount(unreadOnly.length)
      } catch (err) {
        console.error('Erreur lors du chargement des notifications:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Gérer les messages WebSocket en temps réel
  const handleWebSocketMessage = (message: { type: string; payload: any }) => {
    if (message.type === 'notification') {
      const newNotification = message.payload as NotificationDTO
      // Ajouter la nouvelle notification en haut de la liste
      setNotifications((prev) => [newNotification, ...prev])
      // Incrémenter le compteur de non lues
      setUnreadCount((prev) => prev + 1)
      // Afficher une notification toast si le dropdown n'est pas ouvert
      if (!isOpen) {
        toast.info(newNotification.title)
      }
    }
  }

  // Connexion WebSocket pour les notifications en temps réel
  const wsUrl = `${API_BASE_URL}/ws`
  const { isConnected } = useWebSocket(wsUrl, handleWebSocketMessage)

  useEffect(() => {
    // Charger les notifications initiales au montage
    loadNotifications()
  }, [])

  // Polling de secours : vérifier périodiquement les nouvelles notifications (si WebSocket ne livre pas)
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const count = await notificationService.getUnreadCount()
        if (count > unreadCountRef.current) {
          await loadNotifications()
          toast.info('Nouvelles notifications')
        }
      } catch {
        // Ignorer les erreurs (réseau, déco)
      }
    }

    const intervalId = setInterval(poll, POLL_INTERVAL_MS)
    const onVisible = () => {
      poll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [toast])

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await notificationService.markAsRead(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error)
      toast.error('Erreur lors du marquage de la notification')
    }
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await notificationService.markAllAsRead()
      setNotifications([])
      setUnreadCount(0)
      toast.success('Toutes les notifications ont été marquées comme lues')
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error)
      toast.error('Erreur lors du marquage des notifications')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            loadNotifications()
          }
        }}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
        type="button"
        title={isConnected ? 'Notifications en temps réel' : 'Connexion WebSocket perdue'}
      >
        <Bell className={`w-5 h-5 ${isConnected ? '' : 'opacity-50'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-2 h-2 bg-yellow-500 rounded-full" title="Connexion WebSocket perdue" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              <Link
                to="/app/notifications/history"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                Historique
              </Link>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune notification non lue</p>
                <Link
                  to="/app/notifications/history"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-primary-600 dark:text-primary-400 mt-2 inline-block"
                >
                  Voir l'historique
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={notification.link_url || '#'}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id, {} as React.MouseEvent)
                      }
                      setIsOpen(false)
                    }}
                    className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {!notification.is_read && (
                            <span className="mt-1.5 w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full flex-shrink-0"></span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                          title="Marquer comme lu"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
