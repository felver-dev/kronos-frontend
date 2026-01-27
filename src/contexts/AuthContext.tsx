import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authService } from '../services/authService'

interface User {
  id: string | number
  email: string
  firstName: string
  lastName: string
  username?: string
  role: string
  avatar?: string
  permissions?: string[]
  department_id?: number
}

// Plus de mapping de rôles - on utilise directement le rôle du backend
// Les permissions déterminent l'accès, pas le nom du rôle

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
  hasPermission: (permission: string) => boolean
  refreshUser: () => Promise<void>
  permissionsVersion: number // Version des permissions pour forcer le re-render
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissionsVersion, setPermissionsVersion] = useState(0) // Version pour forcer le re-render
  const hasRefreshedRef = useRef(false) // Flag pour éviter les rafraîchissements multiples

  const refreshUser = async () => {
    if (!user) {
      return
    }
    
    try {
      // Recharger les informations de l'utilisateur depuis le backend via /auth/me
      const userData = await authService.verifyToken() as any
      
      // Créer explicitement un nouveau tableau de permissions pour forcer React à détecter le changement
      const newPermissions = Array.isArray(userData.permissions) 
        ? [...userData.permissions]
        : []
      
      // Mapper les champs snake_case vers camelCase
      const updatedUser: User = {
        id: String(userData.id || userData.ID),
        email: userData.email || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        username: userData.username ?? (userData as any)?.username ?? '',
        role: userData.role || '',
        avatar: userData.avatar || '',
        permissions: newPermissions,
        department_id: userData.department_id,
      }
      
      // Toujours mettre à jour user et sessionStorage (nom, email, etc. après édition de profil)
      setUser(updatedUser)
      sessionStorage.setItem('user', JSON.stringify(updatedUser))
      // Incrémenter la version des permissions seulement si elles ont changé (re-render des gardes)
      const permissionsChanged = JSON.stringify(user.permissions) !== JSON.stringify(newPermissions)
      if (permissionsChanged) {
        setPermissionsVersion(prev => prev + 1)
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de l\'utilisateur:', error)
    }
  }

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const initAuth = async () => {
      let storedUser = sessionStorage.getItem('user')
      let token = sessionStorage.getItem('token')

      // Migration: si l'ancien localStorage existe, le déplacer dans la session de l'onglet
      if (!storedUser && !token) {
        const legacyUser = localStorage.getItem('user')
        const legacyToken = localStorage.getItem('token')
        if (legacyUser && legacyToken) {
          sessionStorage.setItem('user', legacyUser)
          sessionStorage.setItem('token', legacyToken)
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          storedUser = legacyUser
          token = legacyToken
        }
      }
      
      if (token) {
        try {
          // Toujours appeler /auth/me pour récupérer les permissions à jour (après migration, changement de rôle, etc.)
          const userData = await authService.verifyToken() as Record<string, unknown>
          const newPermissions = Array.isArray(userData?.permissions) ? [...(userData.permissions as string[])] : []
          const updatedUser: User = {
            id: String(userData?.id ?? userData?.ID ?? ''),
            email: (userData?.email as string) || '',
            firstName: (userData?.firstName ?? userData?.first_name) as string || '',
            lastName: (userData?.lastName ?? userData?.last_name) as string || '',
            role: (userData?.role as string) || '',
            avatar: userData?.avatar as string | undefined,
            permissions: newPermissions,
            department_id: userData?.department_id as number | undefined,
          }
          setUser(updatedUser)
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
        } catch (error) {
          // Si /auth/me échoue (401, réseau), utiliser le sessionStorage en secours
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser)
              setUser({
                ...parsedUser,
                role: parsedUser.role,
                permissions: parsedUser.permissions || [],
              })
            } catch {
              authService.logout()
              setUser(null)
            }
          } else {
            authService.logout()
            setUser(null)
          }
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authService.login({ email, password })
      
      // Utiliser directement le rôle du backend sans mapping
      const mappedUser = {
        ...response.user,
        id: String(response.user.id), // Convertir l'ID en string pour la cohérence
        role: response.user.role, // Garder le rôle tel quel du backend
        permissions: response.user.permissions || [], // Inclure les permissions du backend
        username: (response.user as any)?.username ?? (response.user as any)?.userName ?? '',
      }
      
      setUser(mappedUser)
      sessionStorage.setItem('user', JSON.stringify(mappedUser))
      sessionStorage.setItem('token', response.token) // Store token (session)
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // Réinitialiser le flag pour permettre le rafraîchissement après login
      hasRefreshedRef.current = false
      
      // Rafraîchir immédiatement les permissions depuis le backend pour avoir les dernières
      setTimeout(async () => {
        try {
          await refreshUser()
        } catch (error) {
          // Ignorer silencieusement les erreurs
        }
      }, 500)
      
      return mappedUser
    } catch (error) {
      console.error('Erreur de connexion:', error)
      let errorMessage = 'Erreur de connexion'
      if (error instanceof Error) {
        errorMessage = error.message
        // Si c'est une erreur réseau, donner un message plus clair
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.'
        }
      }
      throw new Error(errorMessage)
    }
  }

  // Rafraîchir les permissions automatiquement une seule fois au chargement initial
  useEffect(() => {
    if (user && !loading && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true
      
      const refreshPermissions = async () => {
        try {
          const userData = await authService.verifyToken() as any
          
          const newPermissions = Array.isArray(userData.permissions) 
            ? [...userData.permissions]
            : []
          
          const updatedUser: User = {
            id: String(userData.id || userData.ID),
            email: userData.email || '',
            firstName: userData.firstName || userData.first_name || '',
            lastName: userData.lastName || userData.last_name || '',
            username: userData.username ?? (userData as any)?.username ?? '',
            role: userData.role || '',
            avatar: userData.avatar || '',
            permissions: newPermissions,
            department_id: userData.department_id,
          }
          
          // Toujours synchroniser user et sessionStorage avec le backend
          setUser(updatedUser)
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
          const permissionsChanged = JSON.stringify(user.permissions) !== JSON.stringify(newPermissions)
          if (permissionsChanged) {
            setPermissionsVersion(prev => prev + 1)
          }
        } catch (error) {
          // Ignorer silencieusement les erreurs de rafraîchissement automatique
        }
      }
      
      // Attendre un peu avant de rafraîchir pour ne pas surcharger au démarrage
      const timeoutId = setTimeout(refreshPermissions, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [user?.id, loading]) // Se déclencher uniquement quand l'ID utilisateur change (connexion/déconnexion)
  
  // Réinitialiser le flag quand l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      hasRefreshedRef.current = false
    }
  }, [user])

  const logout = () => {
    authService.logout()
    setUser(null)
    setPermissionsVersion(0)
    // Rediriger vers la page de connexion
    window.location.href = '/login'
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (!permission) return true

    // Si le backend fournit une liste de permissions, l'utiliser
    // C'est la seule source de vérité - pas de fallback basé sur le nom du rôle
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.includes(permission)
    }

    // Si aucune permission n'est fournie, refuser l'accès par défaut
    return false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading, hasPermission, refreshUser, permissionsVersion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
