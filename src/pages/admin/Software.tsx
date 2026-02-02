import { useState, useEffect } from 'react'
import { softwareService, SoftwareDTO, CreateSoftwareRequest, UpdateSoftwareRequest, FilialeSoftwareDTO } from '../../services/softwareService'
import { filialeService, FilialeDTO } from '../../services/filialeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { Plus, Edit, Trash2, Loader2, Code, Package, Eye, GitBranch, AlertCircle } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const Software = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [softwareList, setSoftwareList] = useState<SoftwareDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [softwareToEdit, setSoftwareToEdit] = useState<SoftwareDTO | null>(null)
  const [softwareToDelete, setSoftwareToDelete] = useState<SoftwareDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateSoftwareRequest>({
    code: '',
    name: '',
    description: undefined,
    version: '',
  })
  const [editFormData, setEditFormData] = useState<UpdateSoftwareRequest>({})
  const [selectedSoftwareForDeployments, setSelectedSoftwareForDeployments] = useState<SoftwareDTO | null>(null)
  const [isDeploymentsModalOpen, setIsDeploymentsModalOpen] = useState(false)
  const [addVersionFrom, setAddVersionFrom] = useState<SoftwareDTO | null>(null)
  const [showVersionNote, setShowVersionNote] = useState(false)
  const [deployments, setDeployments] = useState<FilialeSoftwareDTO[]>([])
  const [loadingDeployments, setLoadingDeployments] = useState(false)
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loadingFiliales, setLoadingFiliales] = useState(false)

  const loadSoftware = async () => {
    setLoading(true)
    try {
      const data = await softwareService.getAll(false)
      setSoftwareList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des logiciels:', error)
      toast.error('Erreur lors du chargement des logiciels')
      setSoftwareList([])
    } finally {
      setLoading(false)
    }
  }

  // Charger les filiales
  const loadFiliales = async () => {
    setLoadingFiliales(true)
    try {
      const data = await filialeService.getActive()
      setFiliales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des filiales:', error)
      toast.error('Erreur lors du chargement des filiales')
    } finally {
      setLoadingFiliales(false)
    }
  }

  // Charger les déploiements d'un logiciel
  const loadDeployments = async (softwareId: number) => {
    setLoadingDeployments(true)
    try {
      const data = await softwareService.getDeploymentsBySoftware(softwareId)
      setDeployments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des déploiements:', error)
      toast.error('Erreur lors du chargement des déploiements')
      setDeployments([])
    } finally {
      setLoadingDeployments(false)
    }
  }

  // Ouvrir le modal des déploiements
  const handleOpenDeploymentsModal = async (software: SoftwareDTO) => {
    setSelectedSoftwareForDeployments(software)
    setIsDeploymentsModalOpen(true)
    if (filiales.length === 0) {
      await loadFiliales()
    }
    await loadDeployments(software.id)
  }

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('software.view') && !hasPermission('software.create') && !hasPermission('software.update') && !hasPermission('software.delete')) {
      navigate('/app/dashboard')
      return
    }
    loadSoftware()
  }, [hasPermission, navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('software.create')) {
      toast.error('Vous n\'avez pas la permission de créer un logiciel')
      setIsCreateModalOpen(false)
      return
    }
    if (!createFormData.name.trim() || !createFormData.code.trim()) {
      toast.error('Le nom et le code sont requis')
      return
    }
    if (addVersionFrom && !createFormData.version.trim()) {
      toast.error('La version est requise pour enregistrer une nouvelle version du logiciel')
      return
    }
    setIsSubmitting(true)
    try {
      await softwareService.create(createFormData)
      toast.success('Logiciel créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        code: '',
        name: '',
        description: undefined,
        version: '',
      })
      setAddVersionFrom(null)
      loadSoftware()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du logiciel')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal de création prérempli pour ajouter une nouvelle version du même logiciel
  const handleOpenAddVersionModal = (software: SoftwareDTO) => {
    if (!hasPermission('software.create')) {
      toast.error('Vous n\'avez pas la permission de créer un logiciel')
      return
    }
    setAddVersionFrom(software)
    setShowVersionNote(false)
    setCreateFormData({
      code: software.code,
      name: software.name,
      description: software.description,
      version: '',
    })
    setIsCreateModalOpen(true)
  }

  const handleOpenEditModal = (software: SoftwareDTO) => {
    if (!hasPermission('software.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un logiciel')
      return
    }
    setSoftwareToEdit(software)
    setEditFormData({
      name: software.name,
      description: software.description,
      version: software.version,
      is_active: software.is_active,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('software.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un logiciel')
      setIsEditModalOpen(false)
      setSoftwareToEdit(null)
      return
    }
    if (!softwareToEdit) return
    setIsSubmitting(true)
    try {
      await softwareService.update(softwareToEdit.id, editFormData)
      toast.success('Logiciel mis à jour avec succès')
      setIsEditModalOpen(false)
      setSoftwareToEdit(null)
      loadSoftware()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du logiciel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (software: SoftwareDTO) => {
    if (!hasPermission('software.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un logiciel')
      return
    }
    setSoftwareToDelete(software)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('software.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un logiciel')
      setIsDeleteModalOpen(false)
      setSoftwareToDelete(null)
      return
    }
    if (!softwareToDelete) return
    setIsSubmitting(true)
    try {
      await softwareService.delete(softwareToDelete.id)
      toast.success('Logiciel supprimé avec succès')
      setIsDeleteModalOpen(false)
      setSoftwareToDelete(null)
      loadSoftware()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du logiciel')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier l'accès à la page
  if (!hasPermission('software.view') && !hasPermission('software.create') && !hasPermission('software.update') && !hasPermission('software.delete')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Logiciels</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les logiciels déployés par la filiale fournisseur IT</p>
        </div>
        <PermissionGuard permissions={['software.create']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau logiciel
          </button>
        </PermissionGuard>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des logiciels...</span>
          </div>
        ) : !hasPermission('software.view') ? (
          <div className="py-8">
            <PermissionDenied message="Vous n'avez pas la permission de voir la liste des logiciels" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {softwareList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun logiciel enregistré
                    </td>
                  </tr>
                ) : (
                  softwareList.map((software) => (
                    <tr key={software.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          <Code className="w-4 h-4 mr-2" />
                          {software.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {software.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {software.version || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                          {software.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {software.is_active ? (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                            Actif
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <PermissionGuard permissions={['software.create']} showMessage={false}>
                            <button
                              onClick={() => handleOpenAddVersionModal(software)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                              title="Ajouter une version"
                            >
                              <GitBranch className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['software.view']} showMessage={false}>
                            <button
                              onClick={() => handleOpenDeploymentsModal(software)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              title="Voir les déploiements"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['software.update']} showMessage={false}>
                            <button
                              onClick={() => handleOpenEditModal(software)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['software.delete']} showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(software)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setAddVersionFrom(null)
            setShowVersionNote(false)
            setCreateFormData({
              code: '',
            name: '',
            description: undefined,
            version: '',
          })
        }}
        title={addVersionFrom ? `Nouvelle version (${addVersionFrom.code})` : 'Nouveau logiciel'}
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.code}
                onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value.toUpperCase() })}
                className="input"
                placeholder="Ex: ISA, ISANET, PORTAL_GARANT"
              />
            </div>
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
                placeholder="Ex: ISA, ISANet, Portail Garant"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Version
                </label>
                {addVersionFrom && (
                  <button
                    type="button"
                    onClick={() => setShowVersionNote(!showVersionNote)}
                    className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
                    title={showVersionNote ? 'Masquer la note' : 'Afficher la note'}
                    aria-label={showVersionNote ? 'Masquer la note' : 'Afficher la note'}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={createFormData.version}
                onChange={(e) => setCreateFormData({ ...createFormData, version: e.target.value })}
                className="input"
                placeholder={addVersionFrom ? 'Ex: 35 (obligatoire pour une nouvelle version)' : 'Ex: 1.0.0, 33, 35'}
              />
              {addVersionFrom && showVersionNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Saisissez la version pour enregistrer une nouvelle version de ce logiciel (ex. 35).
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={createFormData.description || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value || undefined })}
                rows={3}
                className="input"
                placeholder="Description du logiciel"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !createFormData.name.trim() || !createFormData.code.trim() || (!!addVersionFrom && !createFormData.version.trim())}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer le logiciel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      {softwareToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSoftwareToEdit(null)
          }}
          title={`Modifier le logiciel: ${softwareToEdit.name}`}
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name !== undefined ? editFormData.name : softwareToEdit.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: ISA, ISANet, Portail Garant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={editFormData.version !== undefined ? editFormData.version : (softwareToEdit.version || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, version: e.target.value })}
                  className="input"
                  placeholder="Ex: 1.0.0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editFormData.description !== undefined ? editFormData.description : (softwareToEdit.description || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value || undefined })}
                  rows={3}
                  className="input"
                  placeholder="Description du logiciel"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active !== undefined ? editFormData.is_active : softwareToEdit.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Logiciel actif</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSoftwareToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le logiciel"
        message={`Êtes-vous sûr de vouloir supprimer le logiciel "${softwareToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />

      {/* Modal des déploiements */}
      {selectedSoftwareForDeployments && (
        <Modal
          isOpen={isDeploymentsModalOpen}
          onClose={() => {
            setIsDeploymentsModalOpen(false)
            setSelectedSoftwareForDeployments(null)
            setDeployments([])
          }}
          title={`Déploiements - ${selectedSoftwareForDeployments.name}`}
          size="xl"
        >
          <div className="space-y-4">
            {loadingDeployments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des déploiements...</span>
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Ce logiciel n'est déployé dans aucune filiale
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Filiale
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date de déploiement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {deployments.map((deployment) => (
                      <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {deployment.filiale?.name || 'N/A'}
                            {deployment.filiale?.code && ` (${deployment.filiale.code})`}
                            {deployment.filiale?.is_software_provider && (
                              <span className="ml-2 badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                Fournisseur IT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {deployment.version || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {deployment.deployed_at
                              ? new Date(deployment.deployed_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {deployment.is_active ? (
                            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                              Actif
                            </span>
                          ) : (
                            <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              Inactif
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Software
