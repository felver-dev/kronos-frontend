import { apiRequest } from '../config/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string | number
    email: string
    firstName: string
    lastName: string
    role: string
    avatar?: string
    permissions?: string[]
  }
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  department_id?: number
}

export interface RegisterResponse {
  message: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

// Service d'authentification
export const authService = {
  // Connexion
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    
    // Sauvegarder le token (session par onglet)
    if (response && response.token) {
      sessionStorage.setItem('token', response.token)
      localStorage.removeItem('token')
    }
    
    return response
  },

  // Inscription
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mot de passe oublié
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Déconnexion
  logout: () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  // Vérifier le token et récupérer l'utilisateur actuel avec ses permissions
  verifyToken: async (): Promise<LoginResponse['user']> => {
    // Le backend retourne { success: true, data: UserDTO, message: "..." }
    // apiRequest extrait déjà data, donc on reçoit directement UserDTO
    const userData = await apiRequest<LoginResponse['user']>('/auth/me', {
      method: 'GET',
    })
    return userData
  },
}
