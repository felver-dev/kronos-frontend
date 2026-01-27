import { apiRequest } from '../config/api'
import { UserDTO } from './userService'

export interface CreateKnowledgeArticleRequest {
  title: string
  content: string
  category_id: number
  is_published?: boolean
}

export interface UpdateKnowledgeArticleRequest {
  title?: string
  content?: string
  category_id?: number
  is_published?: boolean
}

export interface KnowledgeArticleDTO {
  id: number
  title: string
  content: string
  category_id: number
  category?: KnowledgeCategoryDTO
  author_id: number
  author?: UserDTO
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface KnowledgeCategoryDTO {
  id: number
  name: string
  description?: string
  parent_id?: number
}

export interface CreateKnowledgeCategoryRequest {
  name: string
  description?: string
  parent_id?: number
}

export interface UpdateKnowledgeCategoryRequest {
  name?: string
  description?: string
  parent_id?: number | null
}

export interface KnowledgeArticleSearchResultDTO {
  id: number
  title: string
  snippet: string
  category_id: number
  category?: KnowledgeCategoryDTO
  author_id: number
  view_count: number
  created_at: string
}

export const knowledgeService = {
  // Articles
  // Récupérer tous les articles (protégé)
  getAll: async (): Promise<KnowledgeArticleDTO[]> => {
    return apiRequest<KnowledgeArticleDTO[]>('/knowledge-base/articles')
  },

  // Récupérer un article par ID (protégé)
  getById: async (id: number): Promise<KnowledgeArticleDTO> => {
    return apiRequest<KnowledgeArticleDTO>(`/knowledge-base/articles/${id}`)
  },

  // Récupérer les articles publiés (public)
  getPublished: async (): Promise<KnowledgeArticleDTO[]> => {
    return apiRequest<KnowledgeArticleDTO[]>('/knowledge-base/articles/published')
  },

  // Rechercher des articles (public)
  search: async (query: string): Promise<KnowledgeArticleSearchResultDTO[]> => {
    return apiRequest<KnowledgeArticleSearchResultDTO[]>(`/knowledge-base/articles/search?q=${encodeURIComponent(query)}`)
  },

  // Créer un article
  create: async (data: CreateKnowledgeArticleRequest): Promise<KnowledgeArticleDTO> => {
    return apiRequest<KnowledgeArticleDTO>('/knowledge-base/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour un article
  update: async (id: number, data: UpdateKnowledgeArticleRequest): Promise<KnowledgeArticleDTO> => {
    return apiRequest<KnowledgeArticleDTO>(`/knowledge-base/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer un article
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/knowledge-base/articles/${id}`, {
      method: 'DELETE',
    })
  },

  // Publier/Dépublier un article
  publish: async (id: number, published: boolean): Promise<KnowledgeArticleDTO> => {
    const payload = { published }
    console.log('Publish payload:', payload)
    return apiRequest<KnowledgeArticleDTO>(`/knowledge-base/articles/${id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  // Incrémenter le compteur de vues
  incrementViewCount: async (id: number): Promise<void> => {
    return apiRequest<void>(`/knowledge-base/articles/${id}/view`, {
      method: 'POST',
    })
  },

  // Récupérer les articles par catégorie
  getByCategory: async (categoryId: number): Promise<KnowledgeArticleDTO[]> => {
    return apiRequest<KnowledgeArticleDTO[]>(`/knowledge-base/articles/by-category/${categoryId}`)
  },

  // Récupérer les articles par auteur
  getByAuthor: async (authorId: number): Promise<KnowledgeArticleDTO[]> => {
    return apiRequest<KnowledgeArticleDTO[]>(`/knowledge-base/articles/by-author/${authorId}`)
  },

  // Catégories
  // Récupérer toutes les catégories
  getCategories: async (): Promise<KnowledgeCategoryDTO[]> => {
    return apiRequest<KnowledgeCategoryDTO[]>('/knowledge-base/categories')
  },

  // Récupérer une catégorie par ID
  getCategoryById: async (id: number): Promise<KnowledgeCategoryDTO> => {
    return apiRequest<KnowledgeCategoryDTO>(`/knowledge-base/categories/${id}`)
  },

  // Créer une catégorie
  createCategory: async (data: CreateKnowledgeCategoryRequest): Promise<KnowledgeCategoryDTO> => {
    return apiRequest<KnowledgeCategoryDTO>('/knowledge-base/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Mettre à jour une catégorie
  updateCategory: async (id: number, data: UpdateKnowledgeCategoryRequest): Promise<KnowledgeCategoryDTO> => {
    return apiRequest<KnowledgeCategoryDTO>(`/knowledge-base/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Supprimer une catégorie
  deleteCategory: async (id: number): Promise<void> => {
    return apiRequest<void>(`/knowledge-base/categories/${id}`, {
      method: 'DELETE',
    })
  },
}
