import { useState, useEffect } from 'react'
import { projectService, ProjectPhaseDTO } from '../../../services/projectService'
import { useToastContext } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import Modal from '../../../components/Modal'
import ConfirmModal from '../../../components/ConfirmModal'
import Pagination from '../../../components/Pagination'

const PHASE_STATUS: Record<string, string> = { not_started: 'Non démarrée', in_progress: 'En cours', done: 'Terminée', cancelled: 'Annulée' }

type Props = { projectId: number; onRefresh: () => void }

export const ProjectPhasesTab = ({ projectId, onRefresh }: Props) => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [list, setList] = useState<ProjectPhaseDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editPhase, setEditPhase] = useState<ProjectPhaseDTO | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'not_started' })
  const [submitting, setSubmitting] = useState(false)
  const [phaseToDelete, setPhaseToDelete] = useState<ProjectPhaseDTO | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage))
  const paginatedList = list.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const load = () => projectService.getPhases(projectId).then(setList).catch(() => setList([]))

  useEffect(() => { load().finally(() => setLoading(false)) }, [projectId])
  useEffect(() => { setPage(1) }, [projectId])
  useEffect(() => { if (totalPages >= 1 && page > totalPages) setPage(totalPages) }, [page, totalPages])

  const canCreate = hasPermission('projects.phases.create')
  const canUpdate = hasPermission('projects.phases.update')
  const canDelete = hasPermission('projects.phases.delete')
  const canReorder = hasPermission('projects.phases.reorder')

  const openCreate = () => { setForm({ name: '', description: '', status: 'not_started' }); setEditPhase(null); setModal('create') }
  const openEdit = (p: ProjectPhaseDTO) => { setForm({ name: p.name, description: p.description || '', status: p.status || 'not_started' }); setEditPhase(p); setModal('edit') }
  const closeModal = () => { setModal(null); setEditPhase(null) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSubmitting(true)
    try {
      await projectService.createPhase(projectId, { name: form.name.trim(), description: form.description.trim() || undefined, status: form.status })
      toast.success('Étape créée')
      closeModal()
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPhase || !form.name.trim()) { toast.error('Le nom est requis'); return }
    setSubmitting(true)
    try {
      await projectService.updatePhase(projectId, editPhase.id, { name: form.name.trim(), description: form.description.trim() || undefined, status: form.status })
      toast.success('Étape mise à jour')
      closeModal()
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!phaseToDelete) return
    setIsDeleting(true)
    try {
      await projectService.deletePhase(projectId, phaseToDelete.id)
      toast.success('Étape supprimée')
      setPhaseToDelete(null)
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setIsDeleting(false) }
  }

  const handleReorder = async () => {
    if (!canReorder || list.length < 2) return
    const order = list.map((p) => p.id)
    try {
      await projectService.reorderPhases(projectId, order)
      toast.success('Ordre enregistré')
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
  }

  if (loading) return <div className="flex items-center gap-2 py-6"><Loader2 className="w-5 h-5 animate-spin" /><span>Chargement…</span></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Étapes du projet</h3>
        {canCreate && <button type="button" onClick={openCreate} className="btn btn-primary flex items-center gap-1"><Plus className="w-4 h-4" />Ajouter une étape</button>}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucune étape. Créez-en une pour organiser le projet.</p>
      ) : (
        <>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedList.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {canReorder && <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />}
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                <span className="text-sm text-gray-500">— {PHASE_STATUS[p.status] || p.status}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canUpdate && <button type="button" onClick={() => openEdit(p)} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Modifier"><Pencil className="w-4 h-4" /></button>}
                {canDelete && <button type="button" onClick={() => setPhaseToDelete(p)} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </li>
          ))}
        </ul>
        {list.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={list.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
          />
        )}
        {list.length >= 2 && canReorder && <button type="button" onClick={handleReorder} className="btn btn-secondary text-sm">Enregistrer l'ordre</button>}
        </>
      )}

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Nouvelle étape">
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input">{Object.entries(PHASE_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Modifier l'étape">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input">{Object.entries(PHASE_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button></div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={phaseToDelete != null}
        onClose={() => setPhaseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer l'étape"
        message={phaseToDelete ? `Supprimer l'étape « ${phaseToDelete.name} » ?` : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeleting}
      />
    </div>
  )
}
