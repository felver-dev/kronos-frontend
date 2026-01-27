import { useState, useEffect } from 'react'
import { officeService, OfficeDTO, CreateOfficeRequest, UpdateOfficeRequest } from '../../services/officeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { Plus, Edit, Trash2, Loader2, MapPin } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const Offices = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [offices, setOffices] = useState<OfficeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [officeToEdit, setOfficeToEdit] = useState<OfficeDTO | null>(null)
  const [officeToDelete, setOfficeToDelete] = useState<OfficeDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateOfficeRequest>({
    name: '',
    country: '',
    city: '',
    commune: undefined,
    address: undefined,
    longitude: undefined,
    latitude: undefined,
    is_active: true,
  })
  const [editFormData, setEditFormData] = useState<UpdateOfficeRequest>({})

  const loadOffices = async () => {
    setLoading(true)
    try {
      const data = await officeService.getAll(false)
      setOffices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des sièges:', error)
      toast.error('Erreur lors du chargement des sièges')
      setOffices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('offices.view') && !hasPermission('offices.create') && !hasPermission('offices.update') && !hasPermission('offices.delete')) {
      navigate('/app/dashboard')
      return
    }
    loadOffices()
  }, [hasPermission, navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('offices.create')) {
      toast.error('Vous n\'avez pas la permission de créer un siège')
      setIsCreateModalOpen(false)
      return
    }
    if (!createFormData.name.trim() || !createFormData.country.trim() || !createFormData.city.trim()) {
      toast.error('Le nom, le pays et la ville sont requis')
      return
    }
    setIsSubmitting(true)
    try {
      await officeService.create(createFormData)
      toast.success('Siège créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        name: '',
        country: '',
        city: '',
        commune: undefined,
        address: undefined,
        longitude: undefined,
        latitude: undefined,
        is_active: true,
      })
      loadOffices()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du siège')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (office: OfficeDTO) => {
    if (!hasPermission('offices.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un siège')
      return
    }
    setOfficeToEdit(office)
    setEditFormData({
      name: office.name,
      country: office.country,
      city: office.city,
      commune: office.commune,
      address: office.address,
      longitude: office.longitude,
      latitude: office.latitude,
      is_active: office.is_active,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('offices.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un siège')
      setIsEditModalOpen(false)
      setOfficeToEdit(null)
      return
    }
    if (!officeToEdit) return
    setIsSubmitting(true)
    try {
      await officeService.update(officeToEdit.id, editFormData)
      toast.success('Siège mis à jour avec succès')
      setIsEditModalOpen(false)
      setOfficeToEdit(null)
      loadOffices()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du siège')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (office: OfficeDTO) => {
    if (!hasPermission('offices.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un siège')
      return
    }
    setOfficeToDelete(office)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('offices.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un siège')
      setIsDeleteModalOpen(false)
      setOfficeToDelete(null)
      return
    }
    if (!officeToDelete) return
    setIsSubmitting(true)
    try {
      await officeService.delete(officeToDelete.id)
      toast.success('Siège supprimé avec succès')
      setIsDeleteModalOpen(false)
      setOfficeToDelete(null)
      loadOffices()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du siège')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier l'accès à la page
  if (!hasPermission('offices.view') && !hasPermission('offices.create') && !hasPermission('offices.update') && !hasPermission('offices.delete')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sièges</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les sièges de MCI Care CI</p>
        </div>
        <PermissionGuard permissions={['offices.create']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau siège
          </button>
        </PermissionGuard>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des sièges...</span>
          </div>
        ) : !hasPermission('offices.view') ? (
          <div className="py-8">
            <PermissionDenied message="Vous n'avez pas la permission de voir la liste des sièges" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ville
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Commune
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Localisation
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
                {offices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun siège enregistré
                    </td>
                  </tr>
                ) : (
                  offices.map((office) => (
                    <tr key={office.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {office.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {office.country}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {office.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {office.commune || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {office.latitude && office.longitude ? (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-1" />
                            {office.latitude.toFixed(6)}, {office.longitude.toFixed(6)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {office.is_active ? (
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
                          <PermissionGuard permissions={['offices.update']} showMessage={false}>
                            <button
                              onClick={() => handleOpenEditModal(office)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['offices.delete']} showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(office)}
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
          setCreateFormData({
            name: '',
            country: '',
            city: '',
            commune: undefined,
            address: undefined,
            longitude: undefined,
            latitude: undefined,
            is_active: true,
          })
        }}
        title="Nouveau siège"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du siège <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                className="input"
                placeholder="Ex: Siège Plateau 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pays <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.country}
                onChange={(e) => setCreateFormData({ ...createFormData, country: e.target.value })}
                className="input"
                placeholder="Ex: Côte d'Ivoire"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.city}
                onChange={(e) => setCreateFormData({ ...createFormData, city: e.target.value })}
                className="input"
                placeholder="Ex: Abidjan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commune
              </label>
              <input
                type="text"
                value={createFormData.commune || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, commune: e.target.value || undefined })}
                className="input"
                placeholder="Ex: Plateau"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse
              </label>
              <textarea
                value={createFormData.address || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, address: e.target.value || undefined })}
                rows={2}
                className="input"
                placeholder="Adresse complète du siège"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={createFormData.latitude || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input"
                placeholder="Ex: 5.3197"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={createFormData.longitude || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="input"
                placeholder="Ex: -4.0267"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createFormData.is_active ?? true}
                  onChange={(e) => setCreateFormData({ ...createFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Siège actif</span>
              </label>
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
              disabled={isSubmitting || !createFormData.name.trim() || !createFormData.country.trim() || !createFormData.city.trim()}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer le siège'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      {officeToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setOfficeToEdit(null)
          }}
          title={`Modifier le siège: ${officeToEdit.name}`}
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du siège <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name || officeToEdit.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Siège Plateau 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pays <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.country || officeToEdit.country}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  className="input"
                  placeholder="Ex: Côte d'Ivoire"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ville <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.city || officeToEdit.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="input"
                  placeholder="Ex: Abidjan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Commune
                </label>
                <input
                  type="text"
                  value={editFormData.commune !== undefined ? editFormData.commune : (officeToEdit.commune || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, commune: e.target.value || undefined })}
                  className="input"
                  placeholder="Ex: Plateau"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                <textarea
                  value={editFormData.address !== undefined ? editFormData.address : (officeToEdit.address || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value || undefined })}
                  rows={2}
                  className="input"
                  placeholder="Adresse complète du siège"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={editFormData.latitude !== undefined ? editFormData.latitude : (officeToEdit.latitude || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="input"
                  placeholder="Ex: 5.3197"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={editFormData.longitude !== undefined ? editFormData.longitude : (officeToEdit.longitude || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="input"
                  placeholder="Ex: -4.0267"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active !== undefined ? editFormData.is_active : officeToEdit.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Siège actif</span>
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
          setOfficeToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le siège"
        message={`Êtes-vous sûr de vouloir supprimer le siège "${officeToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default Offices
