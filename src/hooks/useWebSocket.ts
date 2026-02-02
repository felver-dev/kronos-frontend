import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface WebSocketMessage {
  type: string
  payload: any
}

export const useWebSocket = (url: string, onMessage?: (message: WebSocketMessage) => void) => {
  const { token } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000 // 3 secondes

  // Ref pour éviter de recréer connect à chaque rendu (sinon WebSocket se reconnecte en boucle)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!token) {
      console.log('Pas de token, connexion WebSocket annulée')
      return
    }

    // Fermer la connexion existante si elle existe
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    try {
      // Construire l'URL WebSocket avec le token
      let wsUrl: string
      if (url.startsWith('/')) {
        // Utiliser l'hôte actuel pour que le WebSocket passe par le proxy Vite en dev (port 3000 → backend 3001)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        wsUrl = `${protocol}//${host}${url}?token=${token}`
      } else {
        wsUrl = url.replace(/^https?/, 'ws') + `?token=${token}`
      }
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connecté')
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          if (onMessageRef.current) {
            onMessageRef.current(message)
          }
        } catch (error) {
          console.error('Erreur lors du parsing du message WebSocket:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket déconnecté')
        setIsConnected(false)

        // Tentative de reconnexion
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Tentative de reconnexion ${reconnectAttempts.current}/${maxReconnectAttempts}`)
            connect()
          }, reconnectDelay)
        } else {
          console.error('Nombre maximum de tentatives de reconnexion atteint')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Erreur lors de la création de la connexion WebSocket:', error)
    }
  }, [token, url])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (token) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [token, connect, disconnect])

  return { isConnected, reconnect: connect }
}
