import { useState, useEffect, useRef } from 'react'
import { projectService, ProjectMemberDTO, ProjectFunctionDTO, ProjectTaskDTO, ProjectPhaseDTO } from '../../../services/projectService'
import { userService } from '../../../services/userService'
import { useToastContext } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2, Plus, Pencil, Trash2, ChevronDown } from 'lucide-react'
import Modal from '../../../components/Modal'
import ConfirmModal from '../../../components/ConfirmModal'
import Pagination from '../../../components/Pagination'

type Props = { projectId: number; onRefresh: () => void }

export const ProjectMembersTab = ({ projectId, onRefresh }: Props) => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [members, setMembers] = useState<ProjectMemberDTO[]>([])
  const [functions, setFunctions] = useState<ProjectFunctionDTO[]>([])
  const [users, setUsers] = useState<{ id: number; username?: string }[]>([])
  const [tasks, setTasks] = useState<ProjectTaskDTO[]>([])
  const [phases, setPhases] = useState<ProjectPhaseDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addUserId, setAddUserId] = useState<number | ''>('')
  const [addDirectionIds, setAddDirectionIds] = useState<number[]>([])
  const [addExecutionIds, setAddExecutionIds] = useState<number[]>([])
  const [addTaskIds, setAddTaskIds] = useState<number[]>([])
  const [addIsProjectManager, setAddIsProjectManager] = useState(false)
  const [addIsLead, setAddIsLead] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<{ member: ProjectMemberDTO; directionIds: number[]; executionIds: number[]; isProjectManager: boolean; isLead: boolean } | null>(null)
  const [editMember, setEditMember] = useState<ProjectMemberDTO | null>(null)
  const [editDirectionIds, setEditDirectionIds] = useState<number[]>([])
  const [editExecutionIds, setEditExecutionIds] = useState<number[]>([])
  const [editIsProjectManager, setEditIsProjectManager] = useState(false)
  const [editIsLead, setEditIsLead] = useState(false)
  const [editTaskIds, setEditTaskIds] = useState<number[]>([])
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberDTO | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(members.length / itemsPerPage))
  const paginatedMembers = members.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const [addDirectionOpen, setAddDirectionOpen] = useState(false)
  const [addExecutionOpen, setAddExecutionOpen] = useState(false)
  const [addTasksOpen, setAddTasksOpen] = useState(false)
  const [editDirectionOpen, setEditDirectionOpen] = useState(false)
  const [editExecutionOpen, setEditExecutionOpen] = useState(false)
  const [editTasksOpen, setEditTasksOpen] = useState(false)
  const addDirectionRef = useRef<HTMLDivElement>(null)
  const addExecutionRef = useRef<HTMLDivElement>(null)
  const addTasksRef = useRef<HTMLDivElement>(null)
  const editDirectionRef = useRef<HTMLDivElement>(null)
  const editExecutionRef = useRef<HTMLDivElement>(null)
  const editTasksRef = useRef<HTMLDivElement>(null)

  const load = () =>
    Promise.all([
      projectService.getMembers(projectId).then(setMembers).catch(() => setMembers([])),
      projectService.getFunctions(projectId).then(setFunctions).catch(() => setFunctions([])),
      userService.getAll().then((u) => setUsers(u)).catch(() => setUsers([])),
      projectService.getTasks(projectId).then(setTasks).catch(() => setTasks([])),
      projectService.getPhases(projectId).then(setPhases).catch(() => setPhases([])),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [projectId])
  useEffect(() => { setPage(1) }, [projectId])
  useEffect(() => { if (totalPages >= 1 && page > totalPages) setPage(totalPages) }, [page, totalPages])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (addDirectionOpen && addDirectionRef.current && !addDirectionRef.current.contains(e.target as Node)) setAddDirectionOpen(false)
      if (addExecutionOpen && addExecutionRef.current && !addExecutionRef.current.contains(e.target as Node)) setAddExecutionOpen(false)
      if (addTasksOpen && addTasksRef.current && !addTasksRef.current.contains(e.target as Node)) setAddTasksOpen(false)
      if (editDirectionOpen && editDirectionRef.current && !editDirectionRef.current.contains(e.target as Node)) setEditDirectionOpen(false)
      if (editExecutionOpen && editExecutionRef.current && !editExecutionRef.current.contains(e.target as Node)) setEditExecutionOpen(false)
      if (editTasksOpen && editTasksRef.current && !editTasksRef.current.contains(e.target as Node)) setEditTasksOpen(false)
    }
    if (addDirectionOpen || addExecutionOpen || addTasksOpen || editDirectionOpen || editExecutionOpen || editTasksOpen) {
      document.addEventListener('mousedown', onDoc)
      return () => document.removeEventListener('mousedown', onDoc)
    }
  }, [addDirectionOpen, addExecutionOpen, addTasksOpen, editDirectionOpen, editExecutionOpen, editTasksOpen])

  const canAdd = hasPermission('projects.members.add')
  const canRemove = hasPermission('projects.members.remove')
  const canAssignFunction = hasPermission('projects.members.assign_function')

  const directionFns = functions.filter((f) => (f.type || 'execution') === 'direction')
  const executionFns = functions.filter((f) => (f.type || 'execution') === 'execution')
  /** Fonctions direction sauf les rôles uniques Chef de projet / Lead (gérés à part) */
  const directionFnsOther = directionFns.filter((f) => !['Chef de projet', 'Lead'].includes(f.name))

  const projectManagerTaken = members.some((m) => m.is_project_manager)
  const leadTaken = members.some((m) => m.is_lead)

  const memberIds = new Set(members.map((m) => m.user_id))
  const availableUsers = users.filter((u) => !memberIds.has(u.id))

  const memberName = (m: ProjectMemberDTO) => users.find((u) => u.id === m.user_id)?.username || `#${m.user_id}`
  const phaseNameById = (id: number) => phases.find((p) => p.id === id)?.name ?? '—'
  const tasksSorted = [...tasks].sort((a, b) => {
    const oa = phases.find((p) => p.id === a.project_phase_id)?.display_order ?? 0
    const ob = phases.find((p) => p.id === b.project_phase_id)?.display_order ?? 0
    if (oa !== ob) return oa - ob
    return (a.display_order ?? 0) - (b.display_order ?? 0)
  })

  const getDirectionIds = (m: ProjectMemberDTO) => (m.functions || []).filter((f) => (f.type || 'execution') === 'direction').map((f) => f.id)
  const getExecutionIds = (m: ProjectMemberDTO) => (m.functions || []).filter((f) => (f.type || 'execution') === 'execution').map((f) => f.id)
  const labels = (m: ProjectMemberDTO, type: 'direction' | 'execution') => {
    if (type === 'direction') {
      const roles: string[] = []
      if (m.is_project_manager) roles.push('Chef de projet')
      if (m.is_lead) roles.push('Lead')
      const fns = (m.functions || []).filter((f) => (f.type || 'execution') === 'direction').map((f) => f.name)
      return [...roles, ...fns].join(', ') || '—'
    }
    const list = (m.functions || []).filter((f) => (f.type || 'execution') === type)
    return list.map((f) => f.name).join(', ') || '—'
  }

  const openAdd = () => {
    setAddUserId(availableUsers[0]?.id ?? '')
    setAddDirectionIds([])
    setAddExecutionIds([])
    setAddTaskIds([])
    setAddIsProjectManager(false)
    setAddIsLead(false)
    setAddDirectionOpen(false)
    setAddExecutionOpen(false)
    setAddTasksOpen(false)
    setAddOpen(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addUserId) { toast.error('Choisissez un utilisateur'); return }
    setSubmitting(true)
    const newUserId = Number(addUserId)
    try {
      await projectService.addMember(projectId, { user_id: newUserId, function_ids: [...addDirectionIds, ...addExecutionIds] })
      if (addIsProjectManager) await projectService.setProjectManager(projectId, newUserId)
      if (addIsLead) await projectService.setLead(projectId, newUserId)
      // Assigner le membre aux tâches cochées (assignee_ids remplace la liste, on envoie existants + nouvel user)
      await Promise.all(
        addTaskIds.map(async (taskId) => {
          const task = tasks.find((t) => t.id === taskId)
          if (!task) return
          const currentIds = (task.assignees || []).map((a) => a.user_id)
          if (currentIds.includes(newUserId)) return
          await projectService.updateTask(projectId, task.id, { assignee_ids: [...currentIds, newUserId] })
        })
      )
      toast.success('Membre ajouté')
      setAddOpen(false)
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    setIsRemoving(true)
    try {
      await projectService.removeMember(projectId, memberToRemove.user_id)
      toast.success('Membre retiré')
      setMemberToRemove(null)
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setIsRemoving(false) }
  }

  const handleSetFunctions = async (m: ProjectMemberDTO, directionIds: number[], executionIds: number[], isProjectManager: boolean, isLead: boolean) => {
    try {
      await projectService.setMemberFunctions(projectId, m.user_id, [...directionIds, ...executionIds])
      if (isProjectManager !== m.is_project_manager) await projectService.setProjectManager(projectId, isProjectManager ? m.user_id : 0)
      if (isLead !== m.is_lead) await projectService.setLead(projectId, isLead ? m.user_id : 0)
      toast.success('Fonctions mises à jour')
      setEditing(null)
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
  }

  const openEditModal = (m: ProjectMemberDTO) => {
    const currentTaskIds = tasks.filter((t) => (t.assignees || []).some((a) => a.user_id === m.user_id)).map((t) => t.id)
    setEditMember(m)
    setEditDirectionIds(getDirectionIds(m))
    setEditExecutionIds(getExecutionIds(m))
    setEditIsProjectManager(m.is_project_manager)
    setEditIsLead(m.is_lead)
    setEditTaskIds(currentTaskIds)
    setEditDirectionOpen(false)
    setEditExecutionOpen(false)
    setEditTasksOpen(false)
    setEditing(null)
  }
  const closeEditModal = () => { setEditMember(null) }

  const projectManagerTakenExcluding = (excludeUserId: number) => members.some((x) => x.is_project_manager && x.user_id !== excludeUserId)
  const leadTakenExcluding = (excludeUserId: number) => members.some((x) => x.is_lead && x.user_id !== excludeUserId)

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return
    setEditSubmitting(true)
    const uid = editMember.user_id
    try {
      await projectService.setMemberFunctions(projectId, uid, [...editDirectionIds, ...editExecutionIds])
      if (editIsProjectManager !== editMember.is_project_manager) await projectService.setProjectManager(projectId, editIsProjectManager ? uid : 0)
      if (editIsLead !== editMember.is_lead) await projectService.setLead(projectId, editIsLead ? uid : 0)
      for (const task of tasks) {
        const currentIds = (task.assignees || []).map((a) => a.user_id)
        const should = editTaskIds.includes(task.id)
        const has = currentIds.includes(uid)
        if (should && !has) await projectService.updateTask(projectId, task.id, { assignee_ids: [...currentIds, uid] })
        else if (!should && has) await projectService.updateTask(projectId, task.id, { assignee_ids: currentIds.filter((id) => id !== uid) })
      }
      toast.success('Membre modifié')
      closeEditModal()
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setEditSubmitting(false) }
  }

  if (loading) return <div className="flex items-center gap-2 py-6"><Loader2 className="w-5 h-5 animate-spin" /><span>Chargement…</span></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Membres du projet</h3>
        {canAdd && <button type="button" onClick={openAdd} className="btn btn-primary flex items-center gap-1" disabled={availableUsers.length === 0}><Plus className="w-4 h-4" />Ajouter un membre</button>}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucun membre. Ajoutez des utilisateurs au projet.</p>
      ) : (
        <>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">Membre</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">Direction</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">Exécution</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">{memberName(m)}</td>
                  <td className="py-2.5 px-3 align-top">
                    {canAssignFunction && editing?.member.id === m.id ? (
                      <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-w-[220px]">
                        <label className={`flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer ${!(!editing.isProjectManager && projectManagerTaken) ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" checked={editing.isProjectManager} onChange={() => setEditing((x) => (x ? { ...x, isProjectManager: !x.isProjectManager } : null))} disabled={!editing.isProjectManager && projectManagerTaken} className="rounded border-gray-300 dark:border-gray-600" />
                            <span className="text-gray-900 dark:text-gray-100">Chef de projet</span>
                          </div>
                          {!editing.isProjectManager && projectManagerTaken && <span className="text-xs text-gray-500 dark:text-gray-400">(attribué)</span>}
                        </label>
                        <label className={`flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer ${!(!editing.isLead && leadTaken) ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" checked={editing.isLead} onChange={() => setEditing((x) => (x ? { ...x, isLead: !x.isLead } : null))} disabled={!editing.isLead && leadTaken} className="rounded border-gray-300 dark:border-gray-600" />
                            <span className="text-gray-900 dark:text-gray-100">Lead</span>
                          </div>
                          {!editing.isLead && leadTaken && <span className="text-xs text-gray-500 dark:text-gray-400">(attribué)</span>}
                        </label>
                        {directionFnsOther.map((f) => (
                          <label key={f.id} className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" checked={editing.directionIds.includes(f.id)} onChange={() => setEditing((x) => (x ? { ...x, directionIds: x.directionIds.includes(f.id) ? x.directionIds.filter((i) => i !== f.id) : [...x.directionIds, f.id] } : null))} className="rounded border-gray-300 dark:border-gray-600" />
                              <span className="text-gray-900 dark:text-gray-100">{f.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : canAssignFunction ? (
                      <button type="button" onClick={() => setEditing({ member: m, directionIds: getDirectionIds(m), executionIds: getExecutionIds(m), isProjectManager: m.is_project_manager, isLead: m.is_lead })} className="text-primary-600 dark:text-primary-400 hover:underline text-left block">
                        {labels(m, 'direction') || '— (cliquer)'}
                      </button>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">{labels(m, 'direction')}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    {canAssignFunction && editing?.member.id === m.id ? (
                      <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-w-[200px]">
                        {executionFns.map((f) => (
                          <label key={f.id} className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" checked={editing.executionIds.includes(f.id)} onChange={() => setEditing((x) => (x ? { ...x, executionIds: x.executionIds.includes(f.id) ? x.executionIds.filter((i) => i !== f.id) : [...x.executionIds, f.id] } : null))} className="rounded border-gray-300 dark:border-gray-600" />
                              <span className="text-gray-900 dark:text-gray-100">{f.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : canAssignFunction ? (
                      <button type="button" onClick={() => setEditing(editing?.member.id === m.id ? null : { member: m, directionIds: getDirectionIds(m), executionIds: getExecutionIds(m), isProjectManager: m.is_project_manager, isLead: m.is_lead })} className="text-primary-600 dark:text-primary-400 hover:underline text-left block">
                        {labels(m, 'execution') || '— (cliquer)'}
                      </button>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">{labels(m, 'execution')}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 align-top">
                    {editing?.member.id === m.id ? (
                      <span className="flex items-center gap-1 flex-wrap">
                        <button type="button" onClick={() => handleSetFunctions(m, editing.directionIds, editing.executionIds, editing.isProjectManager, editing.isLead)} className="btn btn-primary text-xs">OK</button>
                        <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary text-xs">Annuler</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        {canAssignFunction && <button type="button" onClick={() => openEditModal(m)} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Modifier"><Pencil className="w-4 h-4" /></button>}
                        {canRemove && <button type="button" onClick={() => setMemberToRemove(m)} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Retirer du projet"><Trash2 className="w-4 h-4" /></button>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={members.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
          />
        )}
        </>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un membre">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Utilisateur *</label>
            <select value={addUserId} onChange={(e) => setAddUserId(e.target.value === '' ? '' : Number(e.target.value))} className="input" required>
              {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.username || u.id}</option>)}
            </select>
          </div>
          <div ref={addDirectionRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôles uniques et fonctions de direction</label>
            <button
              type="button"
              onClick={() => { setAddDirectionOpen((v) => !v); setAddExecutionOpen(false); setAddTasksOpen(false) }}
              className="input w-full text-left flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {(() => {
                  const names: string[] = []
                  if (addIsProjectManager) names.push('Chef de projet')
                  if (addIsLead) names.push('Lead')
                  directionFnsOther.filter((f) => addDirectionIds.includes(f.id)).forEach((f) => names.push(f.name))
                  if (names.length === 0) return 'Aucune fonction de direction'
                  if (names.length === 1) return names[0]
                  return `${names.length} sélectionnées`
                })()}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${addDirectionOpen ? 'rotate-180' : ''}`} />
            </button>
            {addDirectionOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                <label className={`flex items-center justify-between px-3 py-2 cursor-pointer ${!projectManagerTaken ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={addIsProjectManager} onChange={(e) => setAddIsProjectManager(e.target.checked)} disabled={projectManagerTaken} className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Chef de projet</span>
                  </div>
                  {projectManagerTaken && <span className="text-xs text-gray-500 dark:text-gray-400">(déjà attribué)</span>}
                </label>
                <label className={`flex items-center justify-between px-3 py-2 cursor-pointer ${!leadTaken ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={addIsLead} onChange={(e) => setAddIsLead(e.target.checked)} disabled={leadTaken} className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">Lead</span>
                  </div>
                  {leadTaken && <span className="text-xs text-gray-500 dark:text-gray-400">(déjà attribué)</span>}
                </label>
                {directionFnsOther.map((f) => (
                  <label key={f.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={addDirectionIds.includes(f.id)} onChange={(e) => setAddDirectionIds((p) => (e.target.checked ? [...p, f.id] : p.filter((i) => i !== f.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{f.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div ref={addExecutionRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonctions d&apos;exécution</label>
            <button
              type="button"
              onClick={() => { setAddExecutionOpen((v) => !v); setAddDirectionOpen(false); setAddTasksOpen(false) }}
              className="input w-full text-left flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {addExecutionIds.length === 0
                  ? 'Aucune fonction d\'exécution'
                  : addExecutionIds.length === 1
                    ? (executionFns.find((f) => f.id === addExecutionIds[0])?.name || '1 sélectionnée')
                    : `${addExecutionIds.length} sélectionnées`}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${addExecutionOpen ? 'rotate-180' : ''}`} />
            </button>
            {addExecutionOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                {executionFns.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucune. Créez-en dans l&apos;onglet Fonctions.</p>
                ) : (
                  executionFns.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                      <input type="checkbox" checked={addExecutionIds.includes(f.id)} onChange={(e) => setAddExecutionIds((p) => (e.target.checked ? [...p, f.id] : p.filter((i) => i !== f.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{f.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div ref={addTasksRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tâches sur lesquelles ce membre travaille</label>
            <button
              type="button"
              onClick={() => { setAddTasksOpen((v) => !v); setAddDirectionOpen(false); setAddExecutionOpen(false) }}
              className="input w-full text-left flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {addTaskIds.length === 0
                  ? 'Aucune tâche'
                  : addTaskIds.length === 1
                    ? (() => { const t = tasks.find((x) => x.id === addTaskIds[0]); return t ? `${phaseNameById(t.project_phase_id)} — ${t.code} ${t.title}` : '1 tâche' })()
                    : `${addTaskIds.length} tâches`}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${addTasksOpen ? 'rotate-180' : ''}`} />
            </button>
            {addTasksOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                {tasksSorted.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucune tâche. Créez-en dans l&apos;onglet Tâches.</p>
                ) : (
                  tasksSorted.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                      <input type="checkbox" checked={addTaskIds.includes(t.id)} onChange={(e) => setAddTaskIds((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="text-gray-500 dark:text-gray-400">{phaseNameById(t.project_phase_id)}</span>
                        {' — '}
                        <span className="font-medium">{t.code}</span> {t.title}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddOpen(false)} className="btn btn-secondary">Annuler</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editMember != null} onClose={closeEditModal} title="Modifier le membre">
        {editMember && (
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Membre</label>
              <div className="input bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed">{memberName(editMember)}</div>
            </div>
            <div ref={editDirectionRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôles uniques et fonctions de direction</label>
              <button
                type="button"
                onClick={() => { setEditDirectionOpen((v) => !v); setEditExecutionOpen(false); setEditTasksOpen(false) }}
                className="input w-full text-left flex items-center justify-between gap-2"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {(() => {
                    const names: string[] = []
                    if (editIsProjectManager) names.push('Chef de projet')
                    if (editIsLead) names.push('Lead')
                    directionFnsOther.filter((f) => editDirectionIds.includes(f.id)).forEach((f) => names.push(f.name))
                    if (names.length === 0) return 'Aucune fonction de direction'
                    if (names.length === 1) return names[0]
                    return `${names.length} sélectionnées`
                  })()}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${editDirectionOpen ? 'rotate-180' : ''}`} />
              </button>
              {editDirectionOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                  <label className={`flex items-center justify-between px-3 py-2 cursor-pointer ${!projectManagerTakenExcluding(editMember.user_id) ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={editIsProjectManager} onChange={(e) => setEditIsProjectManager(e.target.checked)} disabled={!editIsProjectManager && projectManagerTakenExcluding(editMember.user_id)} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Chef de projet</span>
                    </div>
                    {!editIsProjectManager && projectManagerTakenExcluding(editMember.user_id) && <span className="text-xs text-gray-500 dark:text-gray-400">(attribué)</span>}
                  </label>
                  <label className={`flex items-center justify-between px-3 py-2 cursor-pointer ${!leadTakenExcluding(editMember.user_id) ? 'hover:bg-gray-50 dark:hover:bg-gray-600/40' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={editIsLead} onChange={(e) => setEditIsLead(e.target.checked)} disabled={!editIsLead && leadTakenExcluding(editMember.user_id)} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Lead</span>
                    </div>
                    {!editIsLead && leadTakenExcluding(editMember.user_id) && <span className="text-xs text-gray-500 dark:text-gray-400">(attribué)</span>}
                  </label>
                  {directionFnsOther.map((f) => (
                    <label key={f.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked={editDirectionIds.includes(f.id)} onChange={(e) => setEditDirectionIds((p) => (e.target.checked ? [...p, f.id] : p.filter((i) => i !== f.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{f.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div ref={editExecutionRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonctions d&apos;exécution</label>
              <button
                type="button"
                onClick={() => { setEditExecutionOpen((v) => !v); setEditDirectionOpen(false); setEditTasksOpen(false) }}
                className="input w-full text-left flex items-center justify-between gap-2"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {editExecutionIds.length === 0
                    ? 'Aucune fonction d\'exécution'
                    : editExecutionIds.length === 1
                      ? (executionFns.find((f) => f.id === editExecutionIds[0])?.name || '1 sélectionnée')
                      : `${editExecutionIds.length} sélectionnées`}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${editExecutionOpen ? 'rotate-180' : ''}`} />
              </button>
              {editExecutionOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                  {executionFns.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucune. Créez-en dans l&apos;onglet Fonctions.</p>
                  ) : (
                    executionFns.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                        <input type="checkbox" checked={editExecutionIds.includes(f.id)} onChange={(e) => setEditExecutionIds((p) => (e.target.checked ? [...p, f.id] : p.filter((i) => i !== f.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{f.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div ref={editTasksRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tâches sur lesquelles ce membre travaille</label>
              <button
                type="button"
                onClick={() => { setEditTasksOpen((v) => !v); setEditDirectionOpen(false); setEditExecutionOpen(false) }}
                className="input w-full text-left flex items-center justify-between gap-2"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {editTaskIds.length === 0
                    ? 'Aucune tâche'
                    : editTaskIds.length === 1
                      ? (() => { const t = tasks.find((x) => x.id === editTaskIds[0]); return t ? `${phaseNameById(t.project_phase_id)} — ${t.code} ${t.title}` : '1 tâche' })()
                      : `${editTaskIds.length} tâches`}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${editTasksOpen ? 'rotate-180' : ''}`} />
              </button>
              {editTasksOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                  {tasksSorted.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Aucune tâche.</p>
                  ) : (
                    tasksSorted.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600/40 cursor-pointer">
                        <input type="checkbox" checked={editTaskIds.includes(t.id)} onChange={(e) => setEditTaskIds((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))} className="rounded border-gray-300 dark:border-gray-600" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          <span className="text-gray-500 dark:text-gray-400">{phaseNameById(t.project_phase_id)}</span>
                          {' — '}
                          <span className="font-medium">{t.code}</span> {t.title}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeEditModal} className="btn btn-secondary">Annuler</button>
              <button type="submit" disabled={editSubmitting} className="btn btn-primary">{editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={memberToRemove != null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Retirer le membre"
        message={memberToRemove ? `Retirer « ${memberName(memberToRemove)} » du projet ?` : ''}
        confirmText="Retirer"
        cancelText="Annuler"
        isLoading={isRemoving}
      />
    </div>
  )
}
