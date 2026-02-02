import { apiRequest } from '../config/api'

// Constantes alignées avec BUDGET_UNITS (8 h/jour, ~20 j/mois, ~240 j/an)
const MIN_PER_DAY = 8 * 60
const MIN_PER_WEEK = 5 * 8 * 60
const MIN_PER_MONTH = 20 * 8 * 60
const MIN_PER_YEAR = 240 * 8 * 60

function fmt(x: number): string {
  if (Number.isInteger(x)) return String(x)
  const d = Math.round(x * 10) / 10
  return (d % 1 === 0 ? String(Math.round(d)) : d.toFixed(1)).replace('.', ',')
}

/**
 * Formate une durée en minutes pour l’affichage projet (budget, consommé).
 * Choisit l’unité la plus lisible : années, mois, semaines, jours, heures ou minutes.
 */
export function formatProjectTime(minutes: number | null | undefined): string {
  if (minutes == null || isNaN(minutes) || minutes < 0) return '—'
  const m = Math.round(minutes)
  if (m === 0) return '0 h'

  const an = m / MIN_PER_YEAR
  const mois = m / MIN_PER_MONTH
  const sem = m / MIN_PER_WEEK
  const j = m / MIN_PER_DAY
  const h = m / 60

  if (an >= 1) return fmt(an) + (an > 1 ? ' ans' : ' an')
  if (mois >= 1) return fmt(mois) + ' mois'
  if (sem >= 1) return fmt(sem) + ' sem'
  if (j >= 1) return fmt(j) + ' j'
  if (h >= 1) return fmt(h) + ' h'
  if (h >= 0.5) return fmt(h) + ' h'
  return m + ' min'
}

export interface ProjectDTO {
  id: number
  name: string
  description?: string
  total_budget_time?: number
  consumed_time: number
  status: string
  start_date?: string
  end_date?: string
  project_manager_id?: number
  lead_id?: number
  created_at: string
  updated_at: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  total_budget_time?: number
  start_date?: string
  end_date?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  total_budget_time?: number | null
  status?: string
  /** AAAA-MM-JJ ou '' pour effacer */
  start_date?: string
  /** AAAA-MM-JJ ou '' pour effacer */
  end_date?: string
}

export interface ProjectBudgetExtensionDTO {
  id: number
  project_id: number
  additional_minutes: number
  justification: string
  start_date?: string
  end_date?: string
  created_by_id?: number
  created_at: string
  created_by?: { id: number; username?: string }
}

export interface ProjectPhaseDTO {
  id: number
  project_id: number
  name: string
  description?: string
  display_order: number
  start_date?: string
  end_date?: string
  status: string
  created_at: string
  updated_at: string
}

export type ProjectFunctionType = 'direction' | 'execution'

export interface ProjectFunctionDTO {
  id: number
  project_id?: number
  name: string
  /** "direction" (Chef de projet, Lead, Tech Lead) ou "execution" (Dev, Testeur) */
  type?: ProjectFunctionType
  display_order: number
  created_at: string
  updated_at: string
}

/** Élément de la liste `functions` renvoyée par l’API pour un membre (many-to-many). */
export interface ProjectMemberFunctionItem {
  id: number
  name: string
  type?: 'direction' | 'execution'
}

export interface ProjectMemberDTO {
  id: number
  project_id: number
  user_id: number
  project_function_id?: number
  is_project_manager: boolean
  is_lead: boolean
  created_at: string
  updated_at: string
  user?: { id: number; username?: string }
  function?: { id: number; name: string }
  /** Fonctions du membre (direction + exécution), via project_member_functions. */
  functions?: ProjectMemberFunctionItem[]
}

export interface ProjectPhaseMemberDTO {
  id: number
  project_phase_id: number
  user_id: number
  project_function_id?: number
  created_at: string
  updated_at: string
  user?: { id: number; username?: string }
  function?: { id: number; name: string }
}

export interface ProjectTaskDTO {
  id: number
  project_id: number
  project_phase_id: number
  code: string
  title: string
  description?: string
  status: string
  priority: string
  assigned_to_id?: number
  created_by_id: number
  estimated_time?: number
  actual_time: number
  due_date?: string
  display_order: number
  closed_at?: string
  created_at: string
  updated_at: string
  project_phase?: { id: number; name: string }
  assigned_to?: { id: number; username?: string }
  created_by?: { id: number; username?: string }
  /** Assignés multiples (project_task_assignees) */
  assignees?: { id: number; user_id: number; user?: { username?: string } }[]
}

export const projectService = {
  /** @param params.scope 'own' = projets de l'utilisateur ; 'department' | 'filiale' | 'global' = périmètre tableau de bord */
  getAll: async (params?: { scope?: 'own' | 'department' | 'filiale' | 'global' }): Promise<ProjectDTO[]> => {
    const query = params?.scope ? `?scope=${encodeURIComponent(params.scope)}` : ''
    return apiRequest<ProjectDTO[]>(`/projects${query}`)
  },

  getById: async (id: number): Promise<ProjectDTO> => {
    return apiRequest<ProjectDTO>(`/projects/${id}`)
  },

  create: async (data: CreateProjectRequest): Promise<ProjectDTO> => {
    return apiRequest<ProjectDTO>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: number, data: UpdateProjectRequest): Promise<ProjectDTO> => {
    return apiRequest<ProjectDTO>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: number, username: string): Promise<void> => {
    return apiRequest<void>(`/projects/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ username }),
    })
  },

  addBudgetExtension: async (
    projectId: number,
    additionalMinutes: number,
    justification: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectBudgetExtensionDTO> => {
    return apiRequest<ProjectBudgetExtensionDTO>(`/projects/${projectId}/budget-extensions`, {
      method: 'POST',
      body: JSON.stringify({
        additional_minutes: additionalMinutes,
        justification,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      }),
    })
  },

  getBudgetExtensions: async (projectId: number): Promise<ProjectBudgetExtensionDTO[]> => {
    return apiRequest<ProjectBudgetExtensionDTO[]>(`/projects/${projectId}/budget-extensions`)
  },

  updateBudgetExtension: async (
    projectId: number,
    extId: number,
    data: { additional_minutes: number; justification: string; start_date?: string; end_date?: string }
  ): Promise<ProjectBudgetExtensionDTO> => {
    return apiRequest<ProjectBudgetExtensionDTO>(`/projects/${projectId}/budget-extensions/${extId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteBudgetExtension: async (projectId: number, extId: number): Promise<void> => {
    return apiRequest<void>(`/projects/${projectId}/budget-extensions/${extId}`, { method: 'DELETE' })
  },

  // Phases
  getPhases: (projectId: number) => apiRequest<ProjectPhaseDTO[]>(`/projects/${projectId}/phases`),
  createPhase: (projectId: number, data: { name: string; description?: string; display_order?: number; status?: string }) =>
    apiRequest<ProjectPhaseDTO>(`/projects/${projectId}/phases`, { method: 'POST', body: JSON.stringify(data) }),
  updatePhase: (projectId: number, phaseId: number, data: { name?: string; description?: string; display_order?: number; status?: string }) =>
    apiRequest<ProjectPhaseDTO>(`/projects/${projectId}/phases/${phaseId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePhase: (projectId: number, phaseId: number) =>
    apiRequest<void>(`/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' }),
  reorderPhases: (projectId: number, order: number[]) =>
    apiRequest<void>(`/projects/${projectId}/phases/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),

  // Functions
  getFunctions: (projectId: number) => apiRequest<ProjectFunctionDTO[]>(`/projects/${projectId}/functions`),
  createFunction: (projectId: number, data: { name: string; type?: ProjectFunctionType; display_order?: number }) =>
    apiRequest<ProjectFunctionDTO>(`/projects/${projectId}/functions`, { method: 'POST', body: JSON.stringify(data) }),
  updateFunction: (projectId: number, functionId: number, data: { name?: string; type?: ProjectFunctionType; display_order?: number }) =>
    apiRequest<ProjectFunctionDTO>(`/projects/${projectId}/functions/${functionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFunction: (projectId: number, functionId: number) =>
    apiRequest<void>(`/projects/${projectId}/functions/${functionId}`, { method: 'DELETE' }),

  // Members
  getMembers: (projectId: number) => apiRequest<ProjectMemberDTO[]>(`/projects/${projectId}/members`),
  addMember: (projectId: number, data: { user_id: number; function_ids?: number[] }) =>
    apiRequest<ProjectMemberDTO>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (projectId: number, userId: number) =>
    apiRequest<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  setMemberFunctions: (projectId: number, userId: number, functionIds: number[]) =>
    apiRequest<void>(`/projects/${projectId}/members/${userId}/function`, { method: 'PUT', body: JSON.stringify({ function_ids: functionIds }) }),
  setProjectManager: (projectId: number, userId: number) =>
    apiRequest<void>(`/projects/${projectId}/members/${userId}/set-project-manager`, { method: 'PUT', body: JSON.stringify({}) }),
  setLead: (projectId: number, userId: number) =>
    apiRequest<void>(`/projects/${projectId}/members/${userId}/set-lead`, { method: 'PUT', body: JSON.stringify({}) }),

  // Phase members
  getPhaseMembers: (projectId: number, phaseId: number) =>
    apiRequest<ProjectPhaseMemberDTO[]>(`/projects/${projectId}/phases/${phaseId}/members`),
  addPhaseMember: (projectId: number, phaseId: number, data: { user_id: number; project_function_id?: number }) =>
    apiRequest<ProjectPhaseMemberDTO>(`/projects/${projectId}/phases/${phaseId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removePhaseMember: (projectId: number, phaseId: number, userId: number) =>
    apiRequest<void>(`/projects/${projectId}/phases/${phaseId}/members/${userId}`, { method: 'DELETE' }),
  setPhaseMemberFunction: (projectId: number, phaseId: number, userId: number, projectFunctionId: number | null) =>
    apiRequest<void>(`/projects/${projectId}/phases/${phaseId}/members/${userId}/function`, { method: 'PUT', body: JSON.stringify({ project_function_id: projectFunctionId }) }),

  // Tasks
  getTasks: (projectId: number) => apiRequest<ProjectTaskDTO[]>(`/projects/${projectId}/tasks`),
  getTasksByPhase: (projectId: number, phaseId: number) =>
    apiRequest<ProjectTaskDTO[]>(`/projects/${projectId}/phases/${phaseId}/tasks`),
  createTask: (projectId: number, data: { project_phase_id: number; title: string; description?: string; status?: string; priority?: string; assignee_ids?: number[]; estimated_time?: number; due_date?: string }) =>
    apiRequest<ProjectTaskDTO>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (projectId: number, taskId: number, data: { title?: string; description?: string; status?: string; priority?: string; assignee_ids?: number[]; estimated_time?: number; actual_time?: number; due_date?: string; project_phase_id?: number }) =>
    apiRequest<ProjectTaskDTO>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (projectId: number, taskId: number) =>
    apiRequest<void>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
}
