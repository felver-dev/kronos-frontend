import { useState, useEffect } from 'react'
import { departmentService, DepartmentDTO, CreateDepartmentRequest, UpdateDepartmentRequest } from '../../services/departmentService'
import { officeService, OfficeDTO } from '../../services/officeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { Plus, Edit, Trash2, Loader2, Building2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'

const Departments = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [offices, setOffices] = useState<OfficeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [departmentToEdit, setDepartmentToEdit] = useState<DepartmentDTO | null>(null)
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateDepartmentRequest>({
    name: '',
    code: '',
    description: undefined,
    office_id: undefined,
    is_active: true,
  })
  const [editFormData, setEditFormData] = useState<UpdateDepartmentRequest>({})

  const loadDepartments = async () => {
    setLoading(true)
    try {
      const data = await departmentService.getAll(false)
      setDepartments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des départements:', error)
      toast.error('Erreur lors du chargement des départements')
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }

  const loadOffices = async () => {
    try {
      const data = await officeService.getAll(true) // Seulement les sièges actifs
      setOffices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des sièges:', error)
    }
  }

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('departments.view') && !hasPermission('departments.create') && !hasPermission('departments.update') && !hasPermission('departments.delete')) {
      navigate('/app/dashboard')
      return
    }
    loadDepartments()
    loadOffices()
  }, [hasPermission, navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('departments.create')) {
      toast.error('Vous n\'avez pas la permission de créer un département')
      setIsCreateModalOpen(false)
      return
    }
    if (!createFormData.name.trim() || !createFormData.code.trim()) {
      toast.error('Le nom et le code sont requis')
      return
    }
    setIsSubmitting(true)
    try {
      await departmentService.create(createFormData)
      toast.success('Département créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        name: '',
        code: '',
        description: undefined,
        office_id: undefined,
        is_active: true,
      })
      loadDepartments()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du département')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (department: DepartmentDTO) => {
    if (!hasPermission('departments.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un département')
      return
    }
    setDepartmentToEdit(department)
    setEditFormData({
      name: department.name,
      code: department.code,
      description: department.description,
      office_id: department.office_id,
      is_active: department.is_active,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('departments.update')) {
      toast.error('Vous n\'avez pas la permission de modifier un département')
      setIsEditModalOpen(false)
      setDepartmentToEdit(null)
      return
    }
    if (!departmentToEdit) return
    setIsSubmitting(true)
    try {
      await departmentService.update(departmentToEdit.id, editFormData)
      toast.success('Département mis à jour avec succès')
      setIsEditModalOpen(false)
      setDepartmentToEdit(null)
      loadDepartments()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du département')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (department: DepartmentDTO) => {
    if (!hasPermission('departments.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un département')
      return
    }
    setDepartmentToDelete(department)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('departments.delete')) {
      toast.error('Vous n\'avez pas la permission de supprimer un département')
      setIsDeleteModalOpen(false)
      setDepartmentToDelete(null)
      return
    }
    if (!departmentToDelete) return
    setIsSubmitting(true)
    try {
      await departmentService.delete(departmentToDelete.id)
      toast.success('Département supprimé avec succès')
      setIsDeleteModalOpen(false)
      setDepartmentToDelete(null)
      loadDepartments()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du département')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier l'accès à la page
  if (!hasPermission('departments.view') && !hasPermission('departments.create') && !hasPermission('departments.update') && !hasPermission('departments.delete')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Départements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les départements de MCI Care CI</p>
        </div>
        <PermissionGuard permissions={['departments.create']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau département
          </button>
        </PermissionGuard>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des départements...</span>
          </div>
        ) : !hasPermission('departments.view') ? (
          <div className="py-8">
            <PermissionDenied message="Vous n'avez pas la permission de voir la liste des départements" />
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
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Siège
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
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun département enregistré
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {department.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {department.code}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {department.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {department.office ? (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Building2 className="w-4 h-4 mr-1" />
                            {department.office.name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {department.is_active ? (
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
                          <PermissionGuard permissions={['departments.update']} showMessage={false}>
                            <button
                              onClick={() => handleOpenEditModal(department)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['departments.delete']} showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(department)}
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
            code: '',
            description: undefined,
            office_id: undefined,
            is_active: true,
          })
        }}
        title="Nouveau département"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du département <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                className="input"
                placeholder="Ex: IT, RH, Finance"
              />
            </div>
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
                placeholder="Ex: IT, RH, FIN"
              />
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
                placeholder="Description du département"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Siège
              </label>
              <select
                value={createFormData.office_id || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, office_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="input"
              >
                <option value="">Aucun siège</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name} - {office.city}, {office.country}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createFormData.is_active ?? true}
                  onChange={(e) => setCreateFormData({ ...createFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Département actif</span>
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
              disabled={isSubmitting || !createFormData.name.trim() || !createFormData.code.trim()}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer le département'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      {departmentToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setDepartmentToEdit(null)
          }}
          title={`Modifier le département: ${departmentToEdit.name}`}
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du département <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name || departmentToEdit.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: IT, RH, Finance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.code || departmentToEdit.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                  className="input"
                  placeholder="Ex: IT, RH, FIN"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editFormData.description !== undefined ? editFormData.description : (departmentToEdit.description || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value || undefined })}
                  rows={3}
                  className="input"
                  placeholder="Description du département"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Siège
                </label>
                <select
                  value={editFormData.office_id !== undefined ? editFormData.office_id : (departmentToEdit.office_id || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, office_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="input"
                >
                  <option value="">Aucun siège</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name} - {office.city}, {office.country}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active !== undefined ? editFormData.is_active : departmentToEdit.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Département actif</span>
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
          setDepartmentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le département"
        message={`Êtes-vous sûr de vouloir supprimer le département "${departmentToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default Departments
