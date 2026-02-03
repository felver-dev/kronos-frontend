import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  filiale_id?: number
  filiale_code?: string
  filiale_name?: string
}

// Plus de mapping de rôles - on utilise directement le rôle du backend
// Les permissions déterminent l'accès, pas le nom du rôle

const REMEMBER_ME_KEY = 'rememberMe'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
  hasPermission: (permission: string) => boolean
  refreshUser: () => Promise<void>
  permissionsVersion: number // Version des permissions pour forcer le re-render
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
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
        filiale_id: userData.filiale_id,
        filiale_code: userData.filiale?.code ?? userData.filiale_code,
        filiale_name: userData.filiale?.name ?? userData.filiale_name,
      }
      
      // Mettre à jour user et le stockage utilisé (session ou localStorage selon "Se souvenir de moi")
      setUser(updatedUser)
      const storage = localStorage.getItem(REMEMBER_ME_KEY) ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(updatedUser))
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
    // Vérifier si l'utilisateur est déjà connecté (localStorage si "Se souvenir de moi", sinon sessionStorage)
    const initAuth = async () => {
      const useRememberMe = localStorage.getItem(REMEMBER_ME_KEY) === '1'
      const storage = useRememberMe ? localStorage : sessionStorage
      let storedUser = storage.getItem('user')
      let token = storage.getItem('token')

      // Migration: ancien code ne mettait pas rememberMe ; si token en localStorage sans clé, l'utiliser
      if (!storedUser && !token && localStorage.getItem('token')) {
        storedUser = localStorage.getItem('user')
        token = localStorage.getItem('token')
        if (storedUser && token) localStorage.setItem(REMEMBER_ME_KEY, '1')
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
            username: (userData?.username as string) ?? (userData as any)?.username ?? '',
            role: (userData?.role as string) || '',
            avatar: userData?.avatar as string | undefined,
            permissions: newPermissions,
            department_id: userData?.department_id as number | undefined,
            filiale_id: userData?.filiale_id as number | undefined,
            filiale_code: (userData as any)?.filiale?.code ?? (userData as any)?.filiale_code,
            filiale_name: (userData as any)?.filiale?.name ?? (userData as any)?.filiale_name,
          }
          setUser(updatedUser)
          const storage = localStorage.getItem(REMEMBER_ME_KEY) ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(updatedUser))
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

  const login = async (email: string, password: string, rememberMe = false): Promise<User> => {
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
      const storage = rememberMe ? localStorage : sessionStorage
      const other = rememberMe ? sessionStorage : localStorage
      storage.setItem('user', JSON.stringify(mappedUser))
      storage.setItem('token', response.token)
      if (rememberMe) storage.setItem(REMEMBER_ME_KEY, '1')
      else localStorage.removeItem(REMEMBER_ME_KEY)
      other.removeItem('user')
      other.removeItem('token')
      
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

  // Ne plus appeler /auth/me une deuxième fois au chargement : initAuth le fait déjà.
  // Évite un second appel (~3,5 s) et accélère l’affichage initial.
  // Réinitialiser le flag quand l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      hasRefreshedRef.current = false
    }
  }, [user])

  const logout = () => {
    authService.logout()
    localStorage.removeItem(REMEMBER_ME_KEY)
    setUser(null)
    setPermissionsVersion(0)
    // Navigation côté client vers /login (évite le rechargement complet de la page)
    navigate('/login', { replace: true })
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
