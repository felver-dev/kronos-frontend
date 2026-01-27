import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { projectService, formatProjectTime, ProjectDTO, ProjectBudgetExtensionDTO } from '../../services/projectService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2,
  FolderKanban,
  ArrowLeft,
  LayoutDashboard,
  Layers,
  CheckSquare,
  Users,
  Briefcase,
  Calendar,
  Clock,
  Plus,
  History,
  CheckCircle,
  Pencil,
  Trash2,
} from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { AccessDenied } from '../../components/AccessDenied'
import { ProjectPhasesTab, ProjectFunctionsTab, ProjectTasksTab, ProjectMembersTab } from './project'

const statusLabels: Record<string, string> = {
  active: 'Actif',
  completed: 'Clôturé',
  cancelled: 'Annulé',
}

type BudgetUnit = 'jours' | 'semaines' | 'mois' | 'annees'
const BUDGET_UNITS: { value: BudgetUnit; label: string; minutesPerUnit: number }[] = [
  { value: 'jours', label: 'Jours', minutesPerUnit: 8 * 60 },
  { value: 'semaines', label: 'Semaines', minutesPerUnit: 5 * 8 * 60 },
  { value: 'mois', label: 'Mois', minutesPerUnit: 20 * 8 * 60 },
  { value: 'annees', label: 'Années', minutesPerUnit: 240 * 8 * 60 },
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

type TabId = 'overview' | 'phases' | 'tasks' | 'members' | 'functions'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'phases', label: 'Étapes', icon: Layers },
  { id: 'tasks', label: 'Tâches', icon: CheckSquare },
  { id: 'members', label: 'Membres', icon: Users },
  { id: 'functions', label: 'Fonctions', icon: Briefcase },
]

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const toast = useToastContext()
  const { hasPermission, isAuthenticated } = useAuth()
  const [project, setProject] = useState<ProjectDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const [budgetExtensions, setBudgetExtensions] = useState<ProjectBudgetExtensionDTO[]>([])
  const [loadingExtensions, setLoadingExtensions] = useState(false)
  const [isExtendBudgetModalOpen, setIsExtendBudgetModalOpen] = useState(false)
  const [extendBudgetValue, setExtendBudgetValue] = useState<number | ''>('')
  const [extendBudgetUnit, setExtendBudgetUnit] = useState<BudgetUnit>('jours')
  const [extendJustification, setExtendJustification] = useState('')
  const [extendStartDate, setExtendStartDate] = useState('')
  const [extendEndDate, setExtendEndDate] = useState('')
  const [isExtendSubmitting, setIsExtendSubmitting] = useState(false)

  const [isEditExtensionModalOpen, setIsEditExtensionModalOpen] = useState(false)
  const [editingExtension, setEditingExtension] = useState<ProjectBudgetExtensionDTO | null>(null)
  const [editExtValue, setEditExtValue] = useState<number | ''>('')
  const [editExtUnit, setEditExtUnit] = useState<BudgetUnit>('jours')
  const [editExtJustification, setEditExtJustification] = useState('')
  const [editExtStartDate, setEditExtStartDate] = useState('')
  const [editExtEndDate, setEditExtEndDate] = useState('')
  const [isEditExtSubmitting, setIsEditExtSubmitting] = useState(false)

  const [isDeleteExtensionModalOpen, setIsDeleteExtensionModalOpen] = useState(false)
  const [extensionToDelete, setExtensionToDelete] = useState<ProjectBudgetExtensionDTO | null>(null)
  const [isDeleteExtSubmitting, setIsDeleteExtSubmitting] = useState(false)

  const loadProject = async () => {
    if (!id) return
    setLoading(true)
    try {
      const p = await projectService.getById(parseInt(id, 10))
      setProject(p)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Projet introuvable')
      setProject(null)
    } finally {
      setLoading(false)
    }
  }

  const loadBudgetExtensions = async () => {
    if (!id) return
    setLoadingExtensions(true)
    try {
      const list = await projectService.getBudgetExtensions(parseInt(id, 10))
      setBudgetExtensions(Array.isArray(list) ? list : [])
    } catch {
      setBudgetExtensions([])
    } finally {
      setLoadingExtensions(false)
    }
  }

  const openExtendBudgetModal = () => {
    setExtendBudgetValue('')
    setExtendBudgetUnit('jours')
    setExtendJustification('')
    setExtendStartDate('')
    setExtendEndDate('')
    setIsExtendBudgetModalOpen(true)
  }

  const handleExtendBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    const canExtend = hasPermission('projects.budget.manage') || hasPermission('projects.update')
    if (!canExtend) return
    if (project.status !== 'completed') {
      toast.error("L'extension de budget n'est possible que sur un projet clôturé.")
      return
    }
    if (extendBudgetValue === '' || Number(extendBudgetValue) <= 0) {
      toast.error('Indiquez un temps à ajouter (strictement positif).')
      return
    }
    if (!extendJustification.trim() || extendJustification.trim().length < 3) {
      toast.error('Une justification d\'au moins 3 caractères est requise.')
      return
    }
    const start = extendStartDate.trim()
    const end = extendEndDate.trim()
    if ((start && !end) || (!start && end)) {
      toast.error('Renseignez les deux dates (début et fin de la période) ou aucune.')
      return
    }
    if (start && end) {
      if (new Date(end + 'T00:00:00Z') < new Date(start + 'T00:00:00Z')) {
        toast.error('La date de fin de l\'extension doit être postérieure ou égale à la date de début.')
        return
      }
      const minutes = toMinutes(Number(extendBudgetValue), extendBudgetUnit)
      const max = workingMinutesBetween(start, end)
      if (minutes > max) {
        toast.error('Le temps ajouté ne peut pas dépasser le temps de travail disponible entre les dates (jours ouvrés × 8 h/j).')
        return
      }
    }
    setIsExtendSubmitting(true)
    try {
      const minutes = toMinutes(Number(extendBudgetValue), extendBudgetUnit)
      await projectService.addBudgetExtension(project.id, minutes, extendJustification.trim(), start || undefined, end || undefined)
      toast.success('Budget étendu avec succès. Le projet est repassé en Actif.')
      setIsExtendBudgetModalOpen(false)
      await loadProject()
      loadBudgetExtensions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'extension du budget')
    } finally {
      setIsExtendSubmitting(false)
    }
  }

  const openEditExtensionModal = (ext: ProjectBudgetExtensionDTO) => {
    setEditingExtension(ext)
    setEditExtUnit('jours')
    setEditExtValue(Math.round((ext.additional_minutes / (8 * 60)) * 100) / 100)
    setEditExtJustification(ext.justification)
    setEditExtStartDate(ext.start_date || '')
    setEditExtEndDate(ext.end_date || '')
    setIsEditExtensionModalOpen(true)
  }

  const closeEditExtensionModal = () => {
    setIsEditExtensionModalOpen(false)
    setEditingExtension(null)
    setEditExtValue('')
    setEditExtJustification('')
    setEditExtStartDate('')
    setEditExtEndDate('')
  }

  const handleEditExtension = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !editingExtension) return
    if (!hasPermission('projects.budget.extensions.update') && !hasPermission('projects.budget.manage')) return
    if (editExtValue === '' || Number(editExtValue) <= 0) {
      toast.error('Indiquez un temps à ajouter (strictement positif).')
      return
    }
    if (!editExtJustification.trim() || editExtJustification.trim().length < 3) {
      toast.error('Une justification d\'au moins 3 caractères est requise.')
      return
    }
    const start = editExtStartDate.trim()
    const end = editExtEndDate.trim()
    if ((start && !end) || (!start && end)) {
      toast.error('Renseignez les deux dates (début et fin de la période) ou aucune.')
      return
    }
    if (start && end) {
      if (new Date(end + 'T00:00:00Z') < new Date(start + 'T00:00:00Z')) {
        toast.error('La date de fin de l\'extension doit être postérieure ou égale à la date de début.')
        return
      }
      const minutes = toMinutes(Number(editExtValue), editExtUnit)
      const max = workingMinutesBetween(start, end)
      if (minutes > max) {
        toast.error('Le temps ajouté ne peut pas dépasser le temps de travail disponible entre les dates (jours ouvrés × 8 h/j).')
        return
      }
    }
    setIsEditExtSubmitting(true)
    try {
      const minutes = toMinutes(Number(editExtValue), editExtUnit)
      await projectService.updateBudgetExtension(project.id, editingExtension.id, {
        additional_minutes: minutes,
        justification: editExtJustification.trim(),
        start_date: start || undefined,
        end_date: end || undefined,
      })
      toast.success('Extension modifiée avec succès.')
      closeEditExtensionModal()
      await loadProject()
      loadBudgetExtensions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification de l\'extension')
    } finally {
      setIsEditExtSubmitting(false)
    }
  }

  const openDeleteExtensionModal = (ext: ProjectBudgetExtensionDTO) => {
    setExtensionToDelete(ext)
    setIsDeleteExtensionModalOpen(true)
  }

  const handleDeleteExtension = async () => {
    if (!project || !extensionToDelete) return
    if (!hasPermission('projects.budget.extensions.delete') && !hasPermission('projects.budget.manage')) return
    setIsDeleteExtSubmitting(true)
    try {
      await projectService.deleteBudgetExtension(project.id, extensionToDelete.id)
      toast.success('Extension supprimée. Le budget du projet a été diminué.')
      setIsDeleteExtensionModalOpen(false)
      setExtensionToDelete(null)
      await loadProject()
      loadBudgetExtensions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'extension')
    } finally {
      setIsDeleteExtSubmitting(false)
    }
  }

  const openCloseModal = () => setIsCloseModalOpen(true)

  const handleCloseProject = async () => {
    if (!project || !hasPermission('projects.update')) return
    setIsClosing(true)
    try {
      await projectService.update(project.id, { status: 'completed' })
      toast.success('Projet clôturé')
      setIsCloseModalOpen(false)
      loadProject()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la clôture du projet')
    } finally {
      setIsClosing(false)
    }
  }

  useEffect(() => {
    if (!id || !isAuthenticated) return
    const canView =
      hasPermission('projects.view') ||
      hasPermission('projects.view_all') ||
      hasPermission('projects.view_team') ||
      hasPermission('projects.view_own')
    if (!canView) return
    loadProject()
  }, [id, isAuthenticated])

  useEffect(() => {
    if (!id || !isAuthenticated) return
    const canView =
      hasPermission('projects.view') ||
      hasPermission('projects.view_all') ||
      hasPermission('projects.view_team') ||
      hasPermission('projects.view_own')
    if (!canView) return
    loadBudgetExtensions()
  }, [id, isAuthenticated])

  const canView =
    hasPermission('projects.view') ||
    hasPermission('projects.view_all') ||
    hasPermission('projects.view_team') ||
    hasPermission('projects.view_own')

  if (!canView) {
    return <AccessDenied />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement du projet...</span>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">Projet introuvable.</p>
        <Link to="/app/projects" className="btn btn-primary mt-4 inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux projets
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/app/projects"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Retour aux projets"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {statusLabels[project.status] || project.status}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasPermission('projects.update') && project.status !== 'completed' && project.status !== 'cancelled' && (
            <button
              type="button"
              onClick={openCloseModal}
              className="btn flex items-center border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              title="Clôturer le projet"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Clôturer le projet
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Onglets">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="card">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {project.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget temps</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {project.total_budget_time != null
                      ? formatProjectTime(project.total_budget_time)
                      : 'Non défini'}
                  </p>
                  {project.consumed_time > 0 && (
                    <p className="text-sm text-gray-500">Consommé : {formatProjectTime(project.consumed_time)}</p>
                  )}
                  {(hasPermission('projects.budget.manage') || hasPermission('projects.update')) && project.status === 'completed' && (
                    <button
                      type="button"
                      onClick={openExtendBudgetModal}
                      className="mt-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Étendre le budget
                    </button>
                  )}
                  {(hasPermission('projects.budget.manage') || hasPermission('projects.update')) && project.status !== 'completed' && (
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">L&apos;extension de budget n&apos;est possible que sur un projet clôturé.</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Début / Fin prévus</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {project.start_date || project.end_date
                      ? `${project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR') : '—'} → ${project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR') : '—'}`
                      : 'Non définies'}
                  </p>
                </div>
              </div>
            </div>
            {(hasPermission('projects.budget.view') || hasPermission('projects.budget.manage') || canView) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Périodes du projet (phases)
                </h3>
                {loadingExtensions ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
                ) : (
                  <ul className="space-y-2">
                    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Phase 1 — Période initiale</span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {project.start_date || project.end_date
                          ? `${project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR') : '—'} → ${project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR') : '—'}`
                          : 'Non définies'}
                      </span>
                    </li>
                    {[...budgetExtensions].reverse().map((e, i) => (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">Phase {i + 2} — Extension</span>
                        <span className="font-medium text-green-700 dark:text-green-400">+{formatProjectTime(e.additional_minutes)}</span>
                        {e.start_date && e.end_date ? (
                          <span className="text-gray-600 dark:text-gray-300">
                            {new Date(e.start_date).toLocaleDateString('fr-FR')} → {new Date(e.end_date).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">Période non renseignée</span>
                        )}
                        <span className="text-gray-500 dark:text-gray-400">
                          Créé le {new Date(e.created_at).toLocaleDateString('fr-FR')}
                          {e.created_by?.username && ` par ${e.created_by.username}`}
                        </span>
                        <span className="flex items-center gap-2 ml-auto shrink-0">
                          {(hasPermission('projects.budget.extensions.update') || hasPermission('projects.budget.manage')) && (
                            <button
                              type="button"
                              onClick={() => openEditExtensionModal(e)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded text-gray-600 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
                              title="Modifier l'extension"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                          )}
                          {(hasPermission('projects.budget.extensions.delete') || hasPermission('projects.budget.manage')) && (
                            <button
                              type="button"
                              onClick={() => openDeleteExtensionModal(e)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                              title="Supprimer l'extension"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          )}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 w-full">— {e.justification}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'phases' && (
          <ProjectPhasesTab projectId={project.id} onRefresh={loadProject} />
        )}
        {activeTab === 'tasks' && (
          <ProjectTasksTab projectId={project.id} onRefresh={loadProject} />
        )}
        {activeTab === 'members' && (
          <ProjectMembersTab projectId={project.id} onRefresh={loadProject} />
        )}
        {activeTab === 'functions' && (
          <ProjectFunctionsTab projectId={project.id} onRefresh={loadProject} />
        )}
      </div>

      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleCloseProject}
        title="Clôturer le projet"
        message={project ? `Clôturer le projet « ${project.name} » ? Le projet passera en statut Clôturé. Vous pourrez étendre le budget une fois clôturé.` : ''}
        confirmText="Clôturer"
        cancelText="Annuler"
        confirmButtonClass="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        isLoading={isClosing}
      />

      <Modal
        isOpen={isExtendBudgetModalOpen}
        onClose={() => { setIsExtendBudgetModalOpen(false); setExtendBudgetValue(''); setExtendJustification(''); setExtendStartDate(''); setExtendEndDate('') }}
        title="Étendre le budget temps"
      >
        <form onSubmit={handleExtendBudget} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ajoutez du temps au budget du projet, la justification et la période couverte par cette extension.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temps à ajouter <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={extendBudgetValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') setExtendBudgetValue('')
                  else { const n = parseFloat(v); if (!isNaN(n) && n >= 0) setExtendBudgetValue(n) }
                }}
                className="input flex-1"
                placeholder="Ex: 5"
                required
              />
              <select value={extendBudgetUnit} onChange={(e) => setExtendBudgetUnit(e.target.value as BudgetUnit)} className="input w-36">
                {BUDGET_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Début de la période (extension)</label>
              <input
                type="date"
                value={extendStartDate}
                onChange={(e) => setExtendStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fin de la période (extension)</label>
              <input
                type="date"
                value={extendEndDate}
                onChange={(e) => setExtendEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Renseignez les deux dates ou aucune. Si les deux sont renseignées, le temps ajouté ne peut pas dépasser le nombre de jours ouvrés dans cette période.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Justification <span className="text-red-500">*</span></label>
            <textarea
              value={extendJustification}
              onChange={(e) => setExtendJustification(e.target.value)}
              className="input"
              rows={3}
              placeholder="Ex: Phase 2 validée, périmètre étendu..."
              required
              minLength={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsExtendBudgetModalOpen(false)} className="btn btn-secondary">Annuler</button>
            <button type="submit" disabled={isExtendSubmitting} className="btn btn-primary">
              {isExtendSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : 'Étendre le budget'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditExtensionModalOpen} onClose={closeEditExtensionModal} title="Modifier l'extension">
        <form onSubmit={handleEditExtension} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Modifiez le temps ajouté, la justification et la période de cette extension.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temps à ajouter <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={editExtValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') setEditExtValue('')
                  else { const n = parseFloat(v); if (!isNaN(n) && n >= 0) setEditExtValue(n) }
                }}
                className="input flex-1"
                placeholder="Ex: 5"
                required
              />
              <select value={editExtUnit} onChange={(e) => setEditExtUnit(e.target.value as BudgetUnit)} className="input w-36">
                {BUDGET_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Début de la période (extension)</label>
              <input type="date" value={editExtStartDate} onChange={(e) => setEditExtStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fin de la période (extension)</label>
              <input type="date" value={editExtEndDate} onChange={(e) => setEditExtEndDate(e.target.value)} className="input" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Renseignez les deux dates ou aucune. Si les deux sont renseignées, le temps ajouté ne peut pas dépasser le nombre de jours ouvrés dans cette période.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Justification <span className="text-red-500">*</span></label>
            <textarea
              value={editExtJustification}
              onChange={(e) => setEditExtJustification(e.target.value)}
              className="input"
              rows={3}
              placeholder="Ex: Phase 2 validée, périmètre étendu..."
              required
              minLength={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeEditExtensionModal} className="btn btn-secondary">Annuler</button>
            <button type="submit" disabled={isEditExtSubmitting} className="btn btn-primary">
              {isEditExtSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteExtensionModalOpen}
        onClose={() => { setIsDeleteExtensionModalOpen(false); setExtensionToDelete(null) }}
        onConfirm={handleDeleteExtension}
        title="Supprimer l'extension"
        message={extensionToDelete
          ? `Supprimer cette extension ? Le budget du projet sera diminué de ${formatProjectTime(extensionToDelete.additional_minutes)}.`
          : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isDeleteExtSubmitting}
      />
    </div>
  )
}

export default ProjectDetails
