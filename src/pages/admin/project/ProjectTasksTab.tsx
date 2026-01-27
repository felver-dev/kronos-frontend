import { useState, useEffect, useRef } from 'react'
import { projectService, ProjectPhaseDTO, ProjectTaskDTO } from '../../../services/projectService'
import { userService } from '../../../services/userService'
import { useToastContext } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2, Plus, Pencil, Trash2, ChevronDown, CheckCircle } from 'lucide-react'
import Modal from '../../../components/Modal'
import ConfirmModal from '../../../components/ConfirmModal'
import Pagination from '../../../components/Pagination'

const TASK_STATUS: Record<string, string> = { ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente', cloture: 'Clôturé' }
const TASK_PRIORITY: Record<string, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique' }

type TimeUnit = 'min' | 'h' | 'jours' | 'semaines'
const TIME_UNITS: { value: TimeUnit; label: string; toMinutes: (v: number) => number; fromMinutes: (m: number) => number }[] = [
  { value: 'min', label: 'Minutes', toMinutes: (v) => Math.round(v), fromMinutes: (m) => m },
  { value: 'h', label: 'Heures', toMinutes: (v) => Math.round(v * 60), fromMinutes: (m) => Math.round((m / 60) * 100) / 100 },
  { value: 'jours', label: 'Jours', toMinutes: (v) => Math.round(v * 8 * 60), fromMinutes: (m) => Math.round((m / (8 * 60)) * 2) / 2 },
  { value: 'semaines', label: 'Semaines', toMinutes: (v) => Math.round(v * 5 * 8 * 60), fromMinutes: (m) => Math.round((m / (5 * 8 * 60)) * 2) / 2 },
]
function toMinutes(val: number | '', unit: TimeUnit): number | undefined {
  if (val === '' || val == null || isNaN(Number(val))) return undefined
  const u = TIME_UNITS.find((x) => x.value === unit)
  return u ? u.toMinutes(Number(val)) : undefined
}
function formatEstimatedTime(m?: number | null): string {
  if (m == null || m === undefined) return '—'
  const sem = 5 * 8 * 60
  if (m >= sem && m % sem === 0) return m / sem + ' sem'
  if (m >= 480 && m % 480 === 0) return m / 480 + ' j'
  if (m >= 60) return Math.round((m / 60) * 10) / 10 + ' h'
  return m + ' min'
}
function bestDisplayForMinutes(m: number): { value: number; unit: TimeUnit } {
  const sem = 5 * 8 * 60
  if (m >= sem && m % sem === 0) return { value: m / sem, unit: 'semaines' }
  if (m >= 480 && m % 480 === 0) return { value: m / 480, unit: 'jours' }
  if (m >= 60) return { value: Math.round((m / 60) * 100) / 100, unit: 'h' }
  return { value: m, unit: 'min' }
}

type Props = { projectId: number; onRefresh: () => void }

export const ProjectTasksTab = ({ projectId, onRefresh }: Props) => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [phases, setPhases] = useState<ProjectPhaseDTO[]>([])
  const [tasks, setTasks] = useState<ProjectTaskDTO[]>([])
  const [users, setUsers] = useState<{ id: number; username?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [phaseFilter, setPhaseFilter] = useState<number | ''>('')
  const [modal, setModal] = useState<'create' | 'edit' | 'close' | null>(null)
  const [editTask, setEditTask] = useState<ProjectTaskDTO | null>(null)
  const [closeTask, setCloseTask] = useState<ProjectTaskDTO | null>(null)
  const [closeForm, setCloseForm] = useState({ actual_time: '' as number | '', actual_time_unit: 'h' as TimeUnit })
  const [form, setForm] = useState({ project_phase_id: 0, title: '', description: '', status: 'ouvert', priority: 'medium', assignee_ids: [] as number[], estimated_time: '' as number | '', estimated_time_unit: 'h' as TimeUnit, actual_time: '' as number | '', actual_time_unit: 'h' as TimeUnit, due_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [assigneesOpen, setAssigneesOpen] = useState(false)
  const assigneesRef = useRef<HTMLDivElement>(null)
  const [taskToDelete, setTaskToDelete] = useState<ProjectTaskDTO | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(tasks.length / itemsPerPage))
  const paginatedTasks = tasks.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  useEffect(() => {
    if (!assigneesOpen) return
    const onDoc = (e: MouseEvent) => {
      if (assigneesRef.current && !assigneesRef.current.contains(e.target as Node)) setAssigneesOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [assigneesOpen])

  useEffect(() => {
    setLoading(true)
    const tasksPromise = phaseFilter === ''
      ? projectService.getTasks(projectId)
      : projectService.getTasksByPhase(projectId, phaseFilter)
    Promise.all([
      projectService.getPhases(projectId).then(setPhases).catch(() => setPhases([])),
      userService.getAll().then((u) => setUsers(u)).catch(() => setUsers([])),
      tasksPromise.then(setTasks).catch(() => setTasks([])),
    ]).finally(() => setLoading(false))
  }, [projectId, phaseFilter])

  const canCreate = hasPermission('projects.tasks.create')
  const canUpdate = hasPermission('projects.tasks.update')
  const canClose = hasPermission('projects.tasks.close')
  const canDelete = hasPermission('projects.tasks.delete')

  const fetchTasks = () => phaseFilter === '' ? projectService.getTasks(projectId) : projectService.getTasksByPhase(projectId, phaseFilter)
  const phaseName = (id: number) => phases.find((p) => p.id === id)?.name || '—'
  const userName = (id?: number) => (id ? users.find((u) => u.id === id)?.username || `#${id}` : '—')
  const assigneesLabel = (t: ProjectTaskDTO) => {
    const a = t.assignees
    if (a?.length) return a.map((x) => x.user?.username ?? userName(x.user_id)).filter(Boolean).join(', ') || '—'
    if (t.assigned_to) return t.assigned_to.username || '—'
    return userName(t.assigned_to_id) || '—'
  }

  const openCreate = () => {
    setForm({
      project_phase_id: phases[0]?.id || 0,
      title: '',
      description: '',
      status: 'ouvert',
      priority: 'medium',
      assignee_ids: [],
      estimated_time: '',
      estimated_time_unit: 'h',
      actual_time: '',
      actual_time_unit: 'h',
      due_date: '',
    })
    setEditTask(null)
    setAssigneesOpen(false)
    setModal('create')
  }
  const openEdit = (t: ProjectTaskDTO) => {
    const dEst = t.estimated_time != null && t.estimated_time > 0 ? bestDisplayForMinutes(t.estimated_time) : { value: '' as number | '', unit: 'h' as TimeUnit }
    const dAct = t.actual_time != null && t.actual_time > 0 ? bestDisplayForMinutes(t.actual_time) : { value: '' as number | '', unit: 'h' as TimeUnit }
    setForm({
      project_phase_id: t.project_phase_id ?? t.project_phase?.id ?? phases[0]?.id ?? 0,
      title: t.title,
      description: t.description || '',
      status: t.status || 'ouvert',
      priority: t.priority || 'medium',
      assignee_ids: t.assignees?.map((x) => x.user_id) ?? (t.assigned_to_id ? [t.assigned_to_id] : []),
      estimated_time: dEst.value,
      estimated_time_unit: dEst.unit,
      actual_time: dAct.value,
      actual_time_unit: dAct.unit,
      due_date: t.due_date ? t.due_date.slice(0, 10) : '',
    })
    setEditTask(t)
    setAssigneesOpen(false)
    setModal('edit')
  }

  const onEstimatedUnitChange = (newUnit: TimeUnit) => {
    setForm((f) => {
      if (f.estimated_time === '') return { ...f, estimated_time_unit: newUnit }
      const u = TIME_UNITS.find((x) => x.value === f.estimated_time_unit)
      const u2 = TIME_UNITS.find((x) => x.value === newUnit)
      if (!u || !u2) return { ...f, estimated_time_unit: newUnit }
      const min = u.toMinutes(Number(f.estimated_time))
      return { ...f, estimated_time: u2.fromMinutes(min), estimated_time_unit: newUnit }
    })
  }
  const onEditActualUnitChange = (newUnit: TimeUnit) => {
    setForm((f) => {
      if (f.actual_time === '') return { ...f, actual_time_unit: newUnit }
      const u = TIME_UNITS.find((x) => x.value === f.actual_time_unit)
      const u2 = TIME_UNITS.find((x) => x.value === newUnit)
      if (!u || !u2) return { ...f, actual_time_unit: newUnit }
      const min = u.toMinutes(Number(f.actual_time))
      return { ...f, actual_time: u2.fromMinutes(min), actual_time_unit: newUnit }
    })
  }
  const closeModal = () => { setModal(null); setEditTask(null); setAssigneesOpen(false) }

  const openClose = (t: ProjectTaskDTO) => {
    const baseMin = (t.actual_time != null && t.actual_time > 0)
      ? t.actual_time
      : Math.max(0, Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000))
    const b = bestDisplayForMinutes(baseMin)
    setCloseTask(t)
    setCloseForm({ actual_time: b.value, actual_time_unit: b.unit })
    setModal('close')
  }
  const closeCloseModal = () => { setModal(null); setCloseTask(null) }
  const onCloseActualUnitChange = (newUnit: TimeUnit) => {
    setCloseForm((f) => {
      if (f.actual_time === '') return { ...f, actual_time_unit: newUnit }
      const u = TIME_UNITS.find((x) => x.value === f.actual_time_unit)
      const u2 = TIME_UNITS.find((x) => x.value === newUnit)
      if (!u || !u2) return { ...f, actual_time_unit: newUnit }
      const min = u.toMinutes(Number(f.actual_time))
      return { ...f, actual_time: u2.fromMinutes(min), actual_time_unit: newUnit }
    })
  }
  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closeTask) return
    const mins = toMinutes(closeForm.actual_time, closeForm.actual_time_unit)
    if (mins === undefined) {
      toast.error('Veuillez saisir un temps passé valide (nombre + unité).')
      return
    }
    setSubmitting(true)
    try {
      await projectService.updateTask(projectId, closeTask.id, { status: 'cloture', actual_time: mins })
      toast.success('Tâche clôturée')
      closeCloseModal()
      const list = await fetchTasks()
      setTasks(list)
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.project_phase_id) { toast.error('Titre et étape requis'); return }
    setSubmitting(true)
    try {
      await projectService.createTask(projectId, {
        project_phase_id: form.project_phase_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        assignee_ids: form.assignee_ids,
        estimated_time: toMinutes(form.estimated_time, form.estimated_time_unit),
        due_date: form.due_date || undefined,
      })
      toast.success('Tâche créée')
      closeModal()
      const list = await fetchTasks()
      setTasks(list)
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTask || !form.title.trim()) { toast.error('Titre requis'); return }
    if (!form.project_phase_id) { toast.error('Étape requise'); return }
    setSubmitting(true)
    try {
      const actualMins = toMinutes(form.actual_time, form.actual_time_unit)
      await projectService.updateTask(projectId, editTask.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        assignee_ids: form.assignee_ids,
        estimated_time: toMinutes(form.estimated_time, form.estimated_time_unit),
        ...(actualMins !== undefined ? { actual_time: actualMins } : {}),
        due_date: form.due_date || undefined,
        project_phase_id: form.project_phase_id,
      })
      toast.success('Tâche mise à jour')
      closeModal()
      const list = await fetchTasks()
      setTasks(list)
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return
    setIsDeleting(true)
    try {
      await projectService.deleteTask(projectId, taskToDelete.id)
      toast.success('Tâche supprimée')
      setTaskToDelete(null)
      setTasks((prev) => prev.filter((x) => x.id !== taskToDelete.id))
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setIsDeleting(false) }
  }

  if (loading) return <div className="flex items-center gap-2 py-6"><Loader2 className="w-5 h-5 animate-spin" /><span>Chargement…</span></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tâches</h3>
          {phases.length > 0 && (
            <select value={phaseFilter === '' ? '' : String(phaseFilter)} onChange={(e) => setPhaseFilter(e.target.value === '' ? '' : Number(e.target.value))} className="input text-sm w-48">
              <option value="">Toutes les étapes</option>
              {phases.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          )}
        </div>
        {canCreate && phases.length > 0 && <button type="button" onClick={openCreate} className="btn btn-primary flex items-center gap-1"><Plus className="w-4 h-4" />Nouvelle tâche</button>}
      </div>
      {phases.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Créez d'abord des étapes pour ajouter des tâches.</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucune tâche.</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-2">Code</th><th className="text-left py-2">Titre</th><th className="text-left py-2">Étape</th><th className="text-left py-2">Statut</th><th className="text-left py-2">Priorité</th><th className="text-left py-2">Temps est.</th><th className="text-left py-2">Temps passé</th><th className="text-left py-2">Assigné</th><th></th></tr></thead>
            <tbody>
              {paginatedTasks.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 font-mono text-xs">{row.code}</td>
                  <td className="py-2">{row.title}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{phaseName(row.project_phase_id)}</td>
                  <td className="py-2">{TASK_STATUS[row.status] || row.status}</td>
                  <td className="py-2">{TASK_PRIORITY[row.priority] || row.priority}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{formatEstimatedTime(row.estimated_time)}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{(row.actual_time != null && row.actual_time > 0) ? formatEstimatedTime(row.actual_time) : '—'}</td>
                  <td className="py-2">{assigneesLabel(row)}</td>
                  <td className="py-2">
                    {(canUpdate || canClose) && row.status !== 'cloture' && <button type="button" onClick={() => openClose(row)} className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 mr-1" title="Clôturer"><CheckCircle className="w-4 h-4" /></button>}
                    {canUpdate && <button type="button" onClick={() => openEdit(row)} className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 mr-1" title="Modifier"><Pencil className="w-4 h-4" /></button>}
                    {canDelete && <button type="button" onClick={() => setTaskToDelete(row)} className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {phases.length > 0 && tasks.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={tasks.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
          />
        )}
        </>
      )}

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Nouvelle tâche">
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Étape *</label><select value={form.project_phase_id} onChange={(e) => setForm((f) => ({ ...f, project_phase_id: Number(e.target.value) }))} className="input" required>{phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Titre *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Statut</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input">{Object.entries(TASK_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Priorité</label><select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="input">{Object.entries(TASK_PRIORITY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <div ref={modal === 'create' ? assigneesRef : undefined} className="relative">
            <label className="block text-sm font-medium mb-1">Assignés</label>
            <button
              type="button"
              onClick={() => setAssigneesOpen((v) => !v)}
              className="input w-full text-left flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {form.assignee_ids.length === 0
                  ? 'Aucun assigné'
                  : form.assignee_ids.length === 1
                    ? (users.find((u) => u.id === form.assignee_ids[0])?.username || '1 sélectionné')
                    : `${form.assignee_ids.length} utilisateurs sélectionnés`}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${assigneesOpen ? 'rotate-180' : ''}`} />
            </button>
            {assigneesOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                {users.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucun utilisateur disponible</p>
                ) : (
                  users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignee_ids.includes(u.id)}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          assignee_ids: e.target.checked ? [...f.assignee_ids, u.id] : f.assignee_ids.filter((id) => id !== u.id),
                        }))}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{u.username || `#${u.id}`}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Temps estimé</label><div className="flex gap-1"><select value={form.estimated_time_unit} onChange={(e) => onEstimatedUnitChange(e.target.value as TimeUnit)} className="input w-28">{TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select><input type="number" min={0} step={form.estimated_time_unit === 'min' ? 1 : 0.5} value={form.estimated_time} onChange={(e) => setForm((f) => ({ ...f, estimated_time: e.target.value === '' ? '' : Number(e.target.value) }))} className="input flex-1" placeholder="—" /></div></div>
            <div><label className="block text-sm font-medium mb-1">Échéance</label><input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="input" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === 'close'} onClose={closeCloseModal} title={closeTask ? `Clôturer « ${closeTask.title} » ?` : 'Clôturer la tâche'}>
        <form onSubmit={handleClose} className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {closeTask && (() => {
              const baseMin = (closeTask.actual_time != null && closeTask.actual_time > 0) ? closeTask.actual_time : Math.max(0, Math.round((Date.now() - new Date(closeTask.created_at).getTime()) / 60000))
              const isEstimated = !(closeTask.actual_time != null && closeTask.actual_time > 0)
              return <>Temps passé : <strong>{formatEstimatedTime(baseMin)}</strong>{isEstimated ? ' (estimé depuis la création)' : ''}. Vous pouvez le modifier ci‑dessous.</>
            })()}
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Temps passé (à enregistrer) *</label>
            <div className="flex gap-1">
              <select value={closeForm.actual_time_unit} onChange={(e) => onCloseActualUnitChange(e.target.value as TimeUnit)} className="input w-28">{TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
              <input type="number" min={0} step={closeForm.actual_time_unit === 'min' ? 1 : 0.5} value={closeForm.actual_time} onChange={(e) => { const v = e.target.value; const n = v === '' ? '' : Number(String(v).replace(',', '.')); setCloseForm((f) => ({ ...f, actual_time: n })) }} className="input flex-1" required />
            </div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeCloseModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clôturer'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Modifier la tâche">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Titre *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Étape *</label><select value={form.project_phase_id} onChange={(e) => setForm((f) => ({ ...f, project_phase_id: Number(e.target.value) }))} className="input" required>{phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Statut</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input">{Object.entries(TASK_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Priorité</label><select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="input">{Object.entries(TASK_PRIORITY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <div ref={modal === 'edit' ? assigneesRef : undefined} className="relative">
            <label className="block text-sm font-medium mb-1">Assignés</label>
            <button
              type="button"
              onClick={() => setAssigneesOpen((v) => !v)}
              className="input w-full text-left flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {form.assignee_ids.length === 0
                  ? 'Aucun assigné'
                  : form.assignee_ids.length === 1
                    ? (users.find((u) => u.id === form.assignee_ids[0])?.username || '1 sélectionné')
                    : `${form.assignee_ids.length} utilisateurs sélectionnés`}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${assigneesOpen ? 'rotate-180' : ''}`} />
            </button>
            {assigneesOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                {users.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucun utilisateur disponible</p>
                ) : (
                  users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignee_ids.includes(u.id)}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          assignee_ids: e.target.checked ? [...f.assignee_ids, u.id] : f.assignee_ids.filter((id) => id !== u.id),
                        }))}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{u.username || `#${u.id}`}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium mb-1">Temps estimé</label><div className="flex gap-1"><select value={form.estimated_time_unit} onChange={(e) => onEstimatedUnitChange(e.target.value as TimeUnit)} className="input w-28">{TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select><input type="number" min={0} step={form.estimated_time_unit === 'min' ? 1 : 0.5} value={form.estimated_time} onChange={(e) => setForm((f) => ({ ...f, estimated_time: e.target.value === '' ? '' : Number(e.target.value) }))} className="input flex-1" placeholder="—" /></div></div>
            <div><label className="block text-sm font-medium mb-1">Échéance</label><input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="input" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Temps passé</label>
            <div className="flex gap-1">
              <select value={form.actual_time_unit} onChange={(e) => onEditActualUnitChange(e.target.value as TimeUnit)} className="input w-28">{TIME_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
              <input type="number" min={0} step={form.actual_time_unit === 'min' ? 1 : 0.5} value={form.actual_time} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, actual_time: v === '' ? '' : Number(String(v).replace(',', '.')) })) }} className="input flex-1" placeholder="Optionnel" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sert au suivi du temps consommé et au calcul du temps du projet.</p>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button></div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={taskToDelete != null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer la tâche"
        message={taskToDelete ? `Supprimer la tâche « ${taskToDelete.title} » ?` : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeleting}
      />
    </div>
  )
}
