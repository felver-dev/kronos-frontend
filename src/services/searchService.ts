import { apiRequest } from '../config/api'

export interface TicketSearchResultDTO {
  id: number
  title: string
  snippet: string
  status: string
  priority: string
  category: string
  created_by?: {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
  }
  assigned_to?: {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
  }
  created_at: string
}

export interface AssetSearchResultDTO {
  id: number
  name: string
  snippet: string
  serial_number?: string
  category_id: number
  category?: {
    id: number
    name: string
  }
  status: string
  created_at: string
}

export interface KnowledgeArticleSearchResultDTO {
  id: number
  title: string
  snippet: string
  category_id: number
  category?: {
    id: number
    name: string
  }
  author_id: number
  view_count: number
  created_at: string
}

export interface UserSearchResultDTO {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  department?: {
    id: number
    name: string
    code?: string
  }
  role: string
  is_active: boolean
  snippet?: string
  created_at: string
}

export interface TimeEntrySearchResultDTO {
  id: number
  ticket_id: number
  ticket?: {
    id: number
    code: string
    title: string
  }
  user_id: number
  user?: {
    id: number
    username: string
    first_name?: string
    last_name?: string
  }
  time_spent: number
  date: string
  description?: string
  snippet?: string
  validated: boolean
  created_at: string
}

export interface GlobalSearchResultDTO {
  query: string
  types: string[]
  tickets?: TicketSearchResultDTO[]
  assets?: AssetSearchResultDTO[]
  articles?: KnowledgeArticleSearchResultDTO[]
  users?: UserSearchResultDTO[]
  time_entries?: TimeEntrySearchResultDTO[]
  total: number
}

const typeMap: Record<string, string> = {
  ticket: 'tickets',
  asset: 'assets',
  article: 'articles',
  user: 'users',
  time_entry: 'time_entries',
}

export const searchService = {
  globalSearch: async (query: string, types: string[], limit: number = 20): Promise<GlobalSearchResultDTO> => {
    const params = new URLSearchParams()
    params.append('q', query)

    const mappedTypes = types.map((type) => typeMap[type] || type)
    if (mappedTypes.length > 0) {
      params.append('types', mappedTypes.join(','))
    }

    if (limit > 0) {
      params.append('limit', String(limit))
    }

    return apiRequest<GlobalSearchResultDTO>(`/search?${params.toString()}`)
  },
}
