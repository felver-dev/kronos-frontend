import { useState, useEffect } from 'react'
import { projectService, formatProjectTime, ProjectDTO, CreateProjectRequest, UpdateProjectRequest } from '../../services/projectService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { Plus, Loader2, FolderKanban, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { useNavigate, Link } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const statusLabels: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

type BudgetUnit = 'jours' | 'semaines' | 'mois' | 'annees'

const BUDGET_UNITS: { value: BudgetUnit; label: string; minutesPerUnit: number }[] = [
  { value: 'jours', label: 'Jours', minutesPerUnit: 8 * 60 },           // 8 h/jour
  { value: 'semaines', label: 'Semaines', minutesPerUnit: 5 * 8 * 60 }, // 5 j × 8 h
  { value: 'mois', label: 'Mois', minutesPerUnit: 20 * 8 * 60 },        // ~20 j ouvrés
  { value: 'annees', label: 'Années', minutesPerUnit: 240 * 8 * 60 },   // ~240 j ouvrés
]

function toMinutes(value: number, unit: BudgetUnit): number {
  const u = BUDGET_UNITS.find((x) => x.value === unit)
  return u ? Math.round(value * u.minutesPerUnit) : 0
}

/** Jours ouvrés (lun–ven) × 8 h entre start et end (inclus), en minutes. 0 si end < start. */
function workingMinutesBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00Z')
  const end = new Date(endStr + 'T00:00:00Z')
  if (end < start) return 0
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count * (8 * 60)
}

const Projects = () => {
  const toast = useToastContext()
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateProjectRequest & { start_date?: string; end_date?: string }>({
    name: '',
    description: '',
    total_budget_time: undefined,
    start_date: '',
    end_date: '',
  })
  const [budgetValue, setBudgetValue] = useState<number | ''>('')
  const [budgetUnit, setBudgetUnit] = useState<BudgetUnit>('jours')

  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null)
  const [editFormData, setEditFormData] = useState<{ name: string; description: string; status: string; start_date: string; end_date: string }>({ name: '', description: '', status: 'active', start_date: '', end_date: '' })
  const [editBudgetValue, setEditBudgetValue] = useState<number | ''>('')
  const [editBudgetUnit, setEditBudgetUnit] = useState<BudgetUnit>('jours')
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  const [deleteTargetProject, setDeleteTargetProject] = useState<ProjectDTO | null>(null)
  const [deleteUsername, setDeleteUsername] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(projects.length / itemsPerPage))
  const paginatedProjects = projects.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await projectService.getAll()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error)
      toast.error('Erreur lors du chargement des projets')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (
      !hasPermission('projects.view') &&
      !hasPermission('projects.view_all') &&
      !hasPermission('projects.view_team') &&
      !hasPermission('projects.view_own') &&
      !hasPermission('projects.create')
    ) {
      navigate('/app/dashboard')
      return
    }
    loadProjects()
  }, [hasPermission, navigate])
  useEffect(() => { if (totalPages >= 1 && page > totalPages) setPage(totalPages) }, [page, totalPages])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('projects.create')) {
      toast.error("Vous n'avez pas la permission de créer un projet")
      setIsCreateModalOpen(false)
      return
    }
    if (!createFormData.name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    const totalMinutes =
      budgetValue !== '' && Number(budgetValue) > 0 ? toMinutes(Number(budgetValue), budgetUnit) : undefined
    const start = createFormData.start_date?.trim()
    const end = createFormData.end_date?.trim()
    if (start && end) {
      if (new Date(end + 'T00:00:00Z') < new Date(start + 'T00:00:00Z')) {
        toast.error('La date de fin prévue doit être postérieure ou égale à la date de début.')
        return
      }
      if (totalMinutes != null && totalMinutes > 0) {
        const max = workingMinutesBetween(start, end)
        if (totalMinutes > max) {
          toast.error('Le budget temps ne peut pas dépasser le temps de travail disponible entre la date de début et la date de fin prévues (jours ouvrés × 8 h/j).')
          return
        }
      }
    }
    setIsSubmitting(true)
    try {
      const created = await projectService.create({
        name: createFormData.name.trim(),
        description: createFormData.description?.trim() || undefined,
        total_budget_time: totalMinutes,
        start_date: createFormData.start_date?.trim() || undefined,
        end_date: createFormData.end_date?.trim() || undefined,
      })
      toast.success('Projet créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({ name: '', description: '', total_budget_time: undefined, start_date: '', end_date: '' })
      setBudgetValue('')
      setBudgetUnit('jours')
      navigate(`/app/projects/${created.id}`)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du projet')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (p: ProjectDTO) => {
    setEditingProject(p)
    setEditFormData({
      name: p.name,
      description: p.description || '',
      status: p.status || 'active',
      start_date: p.start_date ? String(p.start_date).slice(0, 10) : '',
      end_date: p.end_date ? String(p.end_date).slice(0, 10) : '',
    })
    setEditBudgetValue(p.total_budget_time != null ? Math.round((p.total_budget_time / (8 * 60)) * 10) / 10 : '')
    setEditBudgetUnit('jours')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !hasPermission('projects.update')) return
    if (!editFormData.name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    const totalMinutes = editBudgetValue !== '' && Number(editBudgetValue) >= 0 ? toMinutes(Number(editBudgetValue), editBudgetUnit) : 0
    const start = editFormData.start_date?.trim()
    const end = editFormData.end_date?.trim()
    if (start && end) {
      if (new Date(end + 'T00:00:00Z') < new Date(start + 'T00:00:00Z')) {
        toast.error('La date de fin prévue doit être postérieure ou égale à la date de début.')
        return
      }
      if (totalMinutes > 0) {
        const max = workingMinutesBetween(start, end)
        if (totalMinutes > max) {
          toast.error('Le budget temps ne peut pas dépasser le temps de travail disponible entre la date de début et la date de fin prévues (jours ouvrés × 8 h/j).')
          return
        }
      }
    }
    setIsEditSubmitting(true)
    try {
      const data: UpdateProjectRequest = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        total_budget_time: totalMinutes,
        status: editFormData.status || undefined,
        start_date: editFormData.start_date ?? '',
        end_date: editFormData.end_date ?? '',
      }
      await projectService.update(editingProject.id, data)
      toast.success('Projet mis à jour avec succès')
      setEditingProject(null)
      loadProjects()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du projet')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const openDeleteModal = (p: ProjectDTO) => {
    setDeleteTargetProject(p)
    setDeleteUsername('')
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteTargetProject || !hasPermission('projects.delete')) return
    if (!deleteUsername.trim()) {
      toast.error('Saisissez votre nom d\'utilisateur pour confirmer la suppression.')
      return
    }
    setIsDeleting(true)
    try {
      await projectService.delete(deleteTargetProject.id, deleteUsername.trim())
      toast.success('Projet supprimé avec succès')
      setDeleteTargetProject(null)
      setDeleteUsername('')
      loadProjects()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du projet')
    } finally {
      setIsDeleting(false)
    }
  }

  const canView =
    hasPermission('projects.view') ||
    hasPermission('projects.view_all') ||
    hasPermission('projects.view_team') ||
    hasPermission('projects.view_own')

  if (!canView && !hasPermission('projects.create')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Projets</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez les projets, les étapes, les tâches et les membres
          </p>
        </div>
        <PermissionGuard permissions={['projects.create']}>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Nouveau projet
          </button>
        </PermissionGuard>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des projets...</span>
          </div>
        ) : !canView ? (
          <div className="py-8">
            <PermissionDenied message="Vous n'avez pas la permission de voir la liste des projets" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Projet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Budget temps
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun projet. Créez un projet pour commencer.
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`badge ${
                            p.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : p.status === 'completed'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {statusLabels[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {p.total_budget_time != null
                          ? formatProjectTime(p.total_budget_time)
                          : '-'}
                        {p.consumed_time > 0 && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({formatProjectTime(p.consumed_time)} consommé)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/app/projects/${p.id}`}
                            className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            Voir
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </Link>
                          {hasPermission('projects.update') && (
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('projects.delete') && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(p)}
                              className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 dark:hover:text-red-400"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {canView && !loading && projects.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={projects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({ name: '', description: '', total_budget_time: undefined })
          setBudgetValue('')
          setBudgetUnit('jours')
        }}
        title="Nouveau projet"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className="input"
              placeholder="Ex: Migration CRM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={createFormData.description || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Description du projet"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Début prévu
              </label>
              <input
                type="date"
                value={createFormData.start_date || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, start_date: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fin prévue
              </label>
              <input
                type="date"
                value={createFormData.end_date || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, end_date: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget temps (optionnel)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={budgetValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') setBudgetValue('')
                  else {
                    const n = parseFloat(v)
                    if (!isNaN(n) && n >= 0) setBudgetValue(n)
                  }
                }}
                className="input flex-1 w-full min-w-0"
                placeholder="Ex: 10"
              />
              <select
                value={budgetUnit}
                onChange={(e) => setBudgetUnit(e.target.value as BudgetUnit)}
                className="input w-full sm:w-36"
              >
                {BUDGET_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Jours et semaines en base 8 h/jour ; mois ≈ 20 j, année ≈ 240 j ouvrés.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editingProject}
        onClose={() => {
          setEditingProject(null)
          setEditFormData({ name: '', description: '', status: 'active', start_date: '', end_date: '' })
          setEditBudgetValue('')
          setEditBudgetUnit('jours')
        }}
        title="Modifier le projet"
      >
        {editingProject && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="input"
                placeholder="Ex: Migration CRM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Description du projet"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Début prévu
                </label>
                <input
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fin prévue
                </label>
                <input
                  type="date"
                  value={editFormData.end_date}
                  onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget temps (0 pour effacer)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={editBudgetValue}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') setEditBudgetValue('')
                    else {
                      const n = parseFloat(v)
                      if (!isNaN(n) && n >= 0) setEditBudgetValue(n)
                    }
                  }}
                  className="input flex-1"
                  placeholder="Ex: 10"
                />
                <select
                  value={editBudgetUnit}
                  onChange={(e) => setEditBudgetUnit(e.target.value as BudgetUnit)}
                  className="input w-36"
                >
                  {BUDGET_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="input"
              >
                <option value="active">Actif</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={isEditSubmitting} className="btn btn-primary">
                {isEditSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteTargetProject}
        onClose={() => {
          setDeleteTargetProject(null)
          setDeleteUsername('')
        }}
        title="Supprimer le projet"
      >
        {deleteTargetProject && (
          <form onSubmit={handleDelete} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Pour supprimer le projet <strong>« {deleteTargetProject.name} »</strong>, saisissez votre nom
              d&apos;utilisateur pour confirmer.
              {user?.username && (
                <span className="block mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                  Votre nom d&apos;utilisateur : <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{user.username}</code>
                </span>
              )}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                value={deleteUsername}
                onChange={(e) => setDeleteUsername(e.target.value)}
                className="input"
                placeholder={user?.username ? `Ex: ${user.username}` : 'Votre nom d\'utilisateur'}
                autoComplete="username"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteTargetProject(null); setDeleteUsername('') }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isDeleting || !deleteUsername.trim()}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default Projects
