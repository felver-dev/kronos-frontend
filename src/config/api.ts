// Configuration de l'API
// En développement, utilise le proxy Vite configuré dans vite.config.ts
// En production, utilise VITE_API_BASE_URL ou l'URL par défaut
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true'

// Headers par défaut
export const getDefaultHeaders = () => {
  const token = sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// Fonction utilitaire pour les appels API
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    ...getDefaultHeaders(),
    ...options.headers,
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    // Erreur réseau (backend non accessible)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:8080')
    }
    throw error
  }

  if (!response.ok) {
    let errorMessage = 'Une erreur est survenue'
    let errorDetails: any = null
    
    try {
      const errorData = await response.json()
      console.error('API Error Response complète:', JSON.stringify(errorData, null, 2))
      
      // Le backend peut retourner { success: false, message: "...", error: ... }
      errorMessage = errorData.message || errorMessage
      errorDetails = errorData.error
      
      // Si error est une string, l'utiliser comme message
      if (typeof errorDetails === 'string') {
        errorMessage = errorDetails
      }
      // Si error est un objet (erreur de validation), formater le message
      else if (errorDetails && typeof errorDetails === 'object') {
        const validationErrors = Object.entries(errorDetails)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ')
        if (validationErrors) {
          errorMessage = `Erreurs de validation: ${validationErrors}`
        }
      }
      
      // Afficher aussi le message brut dans la console pour déboguer
      console.error('Message d\'erreur extrait:', errorMessage)
      console.error('Détails d\'erreur:', errorDetails)
    } catch {
      // Si la réponse n'est pas du JSON, utiliser le statusText
      errorMessage = response.statusText || `Erreur ${response.status}`
    }
    
    // Message plus clair pour les erreurs 401
    if (response.status === 401) {
      errorMessage = 'Email ou mot de passe incorrect'
    }
    
    throw new Error(errorMessage)
  }

  // Le backend peut retourner { success: true, data: {...}, message: "..." } ou directement l'objet
  const data = await response.json()
  if (DEBUG_API) {
    console.log('API Response:', data)
  }
  
  // Si le backend retourne { success: true, data: {...} }, extraire data
  if (data.data !== undefined) {
    return data.data as T
  }
  
  // Sinon, retourner directement l'objet
  return data as T
}

// Fonction utilitaire pour les appels API publics (sans authentification)
export const publicApiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    // Erreur réseau (backend non accessible)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:8080')
    }
    throw error
  }

  if (!response.ok) {
    let errorMessage = 'Une erreur est survenue'
    let errorDetails: any = null
    
    try {
      const errorData = await response.json()
      console.error('API Error Response complète:', JSON.stringify(errorData, null, 2))
      
      errorMessage = errorData.message || errorMessage
      errorDetails = errorData.error
      
      if (typeof errorDetails === 'string') {
        errorMessage = errorDetails
      } else if (errorDetails && typeof errorDetails === 'object') {
        const validationErrors = Object.entries(errorDetails)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ')
        if (validationErrors) {
          errorMessage = `Erreurs de validation: ${validationErrors}`
        }
      }
      
      console.error('Message d\'erreur extrait:', errorMessage)
      console.error('Détails d\'erreur:', errorDetails)
    } catch {
      errorMessage = response.statusText || `Erreur ${response.status}`
    }
    
    throw new Error(errorMessage)
  }

  const data = await response.json()
  if (DEBUG_API) {
    console.log('API Response:', data)
  }
  
  if (data.data !== undefined) {
    return data.data as T
  }
  
  return data as T
}