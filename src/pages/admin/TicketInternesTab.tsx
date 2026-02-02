import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, Filter, RotateCcw } from 'lucide-react'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import {
  ticketInternalService,
  TicketInternalDTO,
  CreateTicketInternalRequest,
} from '../../services/ticketInternalService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { userService, UserDTO } from '../../services/userService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

const INTERNAL_CATEGORIES = [
  { value: 'tache_interne', label: 'Tâche interne' },
  { value: 'demande_interne', label: 'Demande interne' },
  { value: 'suivi_projet', label: 'Suivi projet' },
] as const

const STATUS_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente: 'En attente',
  resolu: 'Résolu',
  cloture: 'Clôturé',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    ouvert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    en_cours: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    en_attente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    resolu: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
    cloture: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  }
  return map[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return date
  }
}

const userName = (u?: { first_name?: string; last_name?: string; username?: string }) => {
  if (!u) return '—'
  if (u.first_name || u.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ')
  return u.username || '—'
}

/** Contenu de l’onglet « Tickets internes » dans la page Tickets. */
export const TicketInternesTab = () => {
  const toast = useToastContext()
  const { hasPermission, user: authUser } = useAuth()
  const [tickets, setTickets] = useState<TicketInternalDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [departmentIdFilter, setDepartmentIdFilter] = useState<number | ''>('')
  const [filialeIdFilter, setFilialeIdFilter] = useState<number | ''>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [createForm, setCreateForm] = useState<CreateTicketInternalRequest>({
    title: '',
    description: '',
    category: 'tache_interne',
    priority: 'medium',
    department_id: 0,
    assigned_to_id: undefined,
  })
  const [assignableUsers, setAssignableUsers] = useState<UserDTO[]>([])
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false)

  const canCreate = hasPermission('tickets_internes.create')
  // Admin système (view_all) peut assigner à n'importe quel employé ; les autres uniquement à un membre de leur département
  const canAssignToAnyone = hasPermission('tickets_internes.view_all')
  // Admin système (view_all) peut choisir n'importe quel département ; le créateur ne peut choisir que le sien
  const canSelectAnyDepartment = hasPermission('tickets_internes.view_all')
  const departmentsForCreate = canSelectAnyDepartment
    ? departments
    : departments.filter((d) => d.id === authUser?.department_id)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const opts: { status?: string; department_id?: number; filiale_id?: number } = {}
      if (statusFilter) opts.status = statusFilter
      if (departmentIdFilter) opts.department_id = departmentIdFilter
      if (filialeIdFilter) opts.filiale_id = filialeIdFilter
      const res = await ticketInternalService.getAll(currentPage, itemsPerPage, opts)
      setTickets(res.tickets ?? [])
      setTotalPages(res.pagination?.total_pages ?? 1)
      setTotalItems(res.pagination?.total ?? 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur chargement tickets internes')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [currentPage, itemsPerPage, statusFilter, departmentIdFilter, filialeIdFilter])

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const list = await departmentService.getAll(false)
        setDepartments(Array.isArray(list) ? list.filter((d) => !d.is_it_department) : [])
      } catch {
        setDepartments([])
      }
    }
    const loadFiliales = async () => {
      try {
        const list = await filialeService.getAll()
        setFiliales(Array.isArray(list) ? list : [])
      } catch {
        setFiliales([])
      }
    }
    loadDepts()
    loadFiliales()
  }, [])

  useEffect(() => {
    if (!isCreateModalOpen || !canCreate) return
    if (!canSelectAnyDepartment && authUser?.department_id) {
      setCreateForm((f) => ({ ...f, department_id: authUser.department_id! }))
    }
    const loadAssignable = async () => {
      setLoadingAssignableUsers(true)
      try {
        const list = await userService.getAll()
        const users = Array.isArray(list) ? list : []
        const active = users.filter((u) => u.is_active !== false)
        if (canAssignToAnyone) {
          setAssignableUsers(active)
        } else if (authUser?.department_id) {
          setAssignableUsers(active.filter((u) => u.department_id === authUser.department_id))
        } else {
          setAssignableUsers([])
        }
      } catch {
        setAssignableUsers([])
      } finally {
        setLoadingAssignableUsers(false)
      }
    }
    loadAssignable()
  }, [isCreateModalOpen, canCreate, canAssignToAnyone, authUser?.department_id])

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.description.trim() || !createForm.department_id) {
      toast.error('Titre, description et département sont requis.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: CreateTicketInternalRequest = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        priority: createForm.priority,
        department_id: createForm.department_id,
      }
      if (createForm.assigned_to_id != null && createForm.assigned_to_id > 0) {
        payload.assigned_to_id = createForm.assigned_to_id
      }
      await ticketInternalService.create(payload)
      toast.success('Ticket interne créé.')
      setIsCreateModalOpen(false)
      setCreateForm({ title: '', description: '', category: 'tache_interne', priority: 'medium', department_id: 0, assigned_to_id: undefined })
      setCurrentPage(1)
      await loadTickets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasActiveFilters = Boolean(statusFilter || departmentIdFilter || filialeIdFilter)
  const resetFilters = () => {
    setStatusFilter('')
    setDepartmentIdFilter('')
    setFilialeIdFilter('')
  }

  const selectClass =
    'w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent text-sm'

  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary inline-flex items-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un ticket interne
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-semibold">Filtres</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                actifs
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-secondary inline-flex items-center text-sm flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Département
            </label>
            <select
              value={departmentIdFilter}
              onChange={(e) => setDepartmentIdFilter(e.target.value ? Number(e.target.value) : '')}
              className={selectClass}
            >
              <option value="">Tous</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filiale
            </label>
            <select
              value={filialeIdFilter}
              onChange={(e) => setFilialeIdFilter(e.target.value ? Number(e.target.value) : '')}
              className={selectClass}
            >
              <option value="">Toutes</option>
              {filiales.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Titre</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Priorité</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Département</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Filiale</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Assigné à</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Créé le</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <span className="text-sm">Chargement...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-4">Aucun ticket interne.</p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn btn-primary inline-flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer le premier
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-mono text-sm">{t.code}</td>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{t.title}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getStatusBadge(t.status)}`}>{STATUS_LABELS[t.status] ?? t.status}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{PRIORITY_LABELS[t.priority] ?? t.priority}</td>
                    <td className="py-3 px-4 text-sm">{t.department?.name ?? t.department_id}</td>
                    <td className="py-3 px-4 text-sm">{t.filiale?.name ?? t.filiale_id}</td>
                    <td className="py-3 px-4 text-sm">{userName(t.assigned_to)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(t.created_at)}</td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/app/ticket-internes/${t.id}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un ticket interne"
      >
        <div className="space-y-4">
          {authUser && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-600 dark:text-gray-400">Créé par :</span>
              <span className="font-medium">
                {authUser.first_name && authUser.last_name
                  ? `${authUser.first_name} ${authUser.last_name}`
                  : authUser.username}
              </span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              className="input w-full"
              placeholder="Titre du ticket"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="input w-full min-h-[80px]"
              placeholder="Description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie *</label>
            <select
              value={createForm.category}
              onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
              className="input w-full"
            >
              {INTERNAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
            <select
              value={createForm.priority}
              onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
              className="input w-full"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Département * (non-IT)</label>
            <select
              value={createForm.department_id || ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, department_id: Number(e.target.value) }))}
              className="input w-full"
              disabled={!canSelectAnyDepartment && departmentsForCreate.length <= 1}
            >
              <option value="">Sélectionner un département</option>
              {departmentsForCreate.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ''}</option>
              ))}
            </select>
            {!canSelectAnyDepartment && departmentsForCreate.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Uniquement votre département.
              </p>
            )}
            {!canSelectAnyDepartment && departmentsForCreate.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Vous devez être rattaché à un département pour créer un ticket interne.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigner à (optionnel)</label>
            {loadingAssignableUsers ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des utilisateurs...
              </div>
            ) : (
              <select
                value={createForm.assigned_to_id ?? ''}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    assigned_to_id: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="input w-full"
              >
                <option value="">— Non assigné —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                    {u.department?.name ? ` (${u.department.name})` : ''}
                  </option>
                ))}
              </select>
            )}
            {!canAssignToAnyone && authUser?.department_id && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Uniquement les membres de votre département.
              </p>
            )}
            {canAssignToAnyone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vous pouvez assigner à n'importe quel employé.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="button" onClick={handleCreate} disabled={isSubmitting} className="btn btn-primary inline-flex items-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
