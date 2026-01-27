import { useState, useEffect } from 'react'
import { projectService, ProjectFunctionDTO, ProjectFunctionType } from '../../../services/projectService'
import { useToastContext } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '../../../components/Modal'
import ConfirmModal from '../../../components/ConfirmModal'

const FUNCTION_TYPES: { value: ProjectFunctionType; label: string }[] = [
  { value: 'direction', label: 'Direction' },
  { value: 'execution', label: 'Exécution' },
]

type Props = { projectId: number; onRefresh: () => void }

export const ProjectFunctionsTab = ({ projectId, onRefresh }: Props) => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [list, setList] = useState<ProjectFunctionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editFn, setEditFn] = useState<ProjectFunctionDTO | null>(null)
  const [name, setName] = useState('')
  const [fnType, setFnType] = useState<ProjectFunctionType>('execution')
  const [submitting, setSubmitting] = useState(false)
  const [functionToDelete, setFunctionToDelete] = useState<ProjectFunctionDTO | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = () => projectService.getFunctions(projectId).then(setList).catch(() => setList([]))

  useEffect(() => { load().finally(() => setLoading(false)) }, [projectId])

  const canCreate = hasPermission('projects.functions.create')
  const canUpdate = hasPermission('projects.functions.update')
  const canDelete = hasPermission('projects.functions.delete')

  const openCreate = () => { setName(''); setFnType('execution'); setEditFn(null); setModal('create') }
  const openEdit = (f: ProjectFunctionDTO) => { setName(f.name); setFnType((f.type || 'execution') as ProjectFunctionType); setEditFn(f); setModal('edit') }
  const closeModal = () => { setModal(null); setEditFn(null) }

  const typeLabel = (t?: string) => t === 'direction' ? 'Direction' : 'Exécution'

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Le nom est requis'); return }
    setSubmitting(true)
    try {
      await projectService.createFunction(projectId, { name: name.trim(), type: fnType })
      toast.success('Fonction créée')
      closeModal()
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFn || !name.trim()) { toast.error('Le nom est requis'); return }
    setSubmitting(true)
    try {
      await projectService.updateFunction(projectId, editFn.id, { name: name.trim(), type: fnType })
      toast.success('Fonction mise à jour')
      closeModal()
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!functionToDelete) return
    setIsDeleting(true)
    try {
      await projectService.deleteFunction(projectId, functionToDelete.id)
      toast.success('Fonction supprimée')
      setFunctionToDelete(null)
      load()
      onRefresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
    finally { setIsDeleting(false) }
  }

  if (loading) return <div className="flex items-center gap-2 py-6"><Loader2 className="w-5 h-5 animate-spin" /><span>Chargement…</span></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fonctions projet</h3>
        {canCreate && <button type="button" onClick={openCreate} className="btn btn-primary flex items-center gap-1"><Plus className="w-4 h-4" />Ajouter</button>}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Aucune fonction. Ajoutez-en pour affecter les membres.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {list.map((f) => (
            <li key={f.id} className="py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-900 dark:text-gray-100">{f.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${(f.type || 'execution') === 'direction' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}>
                  {typeLabel(f.type)}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canUpdate && <button type="button" onClick={() => openEdit(f)} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Modifier"><Pencil className="w-4 h-4" /></button>}
                {canDelete && <button type="button" onClick={() => setFunctionToDelete(f)} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Nouvelle fonction">
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required placeholder="Ex: Développeur, Lead…" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={fnType} onChange={(e) => setFnType(e.target.value as ProjectFunctionType)} className="input">{FUNCTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Modifier la fonction">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={fnType} onChange={(e) => setFnType(e.target.value as ProjectFunctionType)} className="input">{FUNCTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="btn btn-secondary">Annuler</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button></div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={functionToDelete != null}
        onClose={() => setFunctionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer la fonction"
        message={functionToDelete ? `Supprimer la fonction « ${functionToDelete.name} » ?` : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={isDeleting}
      />
    </div>
  )
}
