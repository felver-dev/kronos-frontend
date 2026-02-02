import { useState, useEffect, useCallback, useRef } from 'react'
import { filialeService, FilialeDTO, CreateFilialeRequest, UpdateFilialeRequest } from '../../services/filialeService'
import { softwareService, SoftwareDTO, FilialeSoftwareDTO, CreateFilialeSoftwareRequest, UpdateFilialeSoftwareRequest } from '../../services/softwareService'
import { countriesService, type CountryOption } from '../../services/countriesService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionDenied } from '../../components/PermissionDenied'
import { Plus, Edit, Trash2, Loader2, Building2, MapPin, Phone, Mail, Package, Eye } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import ScrollableSelect from '../../components/ScrollableSelect'
import { useNavigate } from 'react-router-dom'
import { AccessDenied } from '../../components/AccessDenied'
import { APP_GROUP_NAME } from '../../config/api'

const Filiales = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [filiales, setFiliales] = useState<FilialeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [filialeToEdit, setFilialeToEdit] = useState<FilialeDTO | null>(null)
  const [filialeToDelete, setFilialeToDelete] = useState<FilialeDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateFilialeRequest>({
    code: '',
    name: '',
    country: '',
    city: '',
    address: undefined,
    phone: '',
    email: '',
    is_software_provider: false,
  })
  const [editFormData, setEditFormData] = useState<UpdateFilialeRequest>({})
  const [selectedFilialeForDeployments, setSelectedFilialeForDeployments] = useState<FilialeDTO | null>(null)
  const [isDeploymentsModalOpen, setIsDeploymentsModalOpen] = useState(false)
  const [deployments, setDeployments] = useState<FilialeSoftwareDTO[]>([])
  const [loadingDeployments, setLoadingDeployments] = useState(false)
  const [softwareList, setSoftwareList] = useState<SoftwareDTO[]>([])
  const [loadingSoftware, setLoadingSoftware] = useState(false)
  const [isCreateDeploymentModalOpen, setIsCreateDeploymentModalOpen] = useState(false)
  const [isEditDeploymentModalOpen, setIsEditDeploymentModalOpen] = useState(false)
  const [isDeleteDeploymentModalOpen, setIsDeleteDeploymentModalOpen] = useState(false)
  const [deploymentToEdit, setDeploymentToEdit] = useState<FilialeSoftwareDTO | null>(null)
  const [deploymentToDelete, setDeploymentToDelete] = useState<FilialeSoftwareDTO | null>(null)
  const [createDeploymentFormData, setCreateDeploymentFormData] = useState<CreateFilialeSoftwareRequest>({
    filiale_id: 0,
    software_id: 0,
    deployed_at: undefined,
    notes: undefined,
  })
  const [editDeploymentFormData, setEditDeploymentFormData] = useState<UpdateFilialeSoftwareRequest>({})

  // Pays, villes et indicatif téléphone (création / édition)
  const [countriesList, setCountriesList] = useState<CountryOption[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [citiesList, setCitiesList] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [createPhonePrefix, setCreatePhonePrefix] = useState('')
  const [createPhoneNumber, setCreatePhoneNumber] = useState('')
  const [editCitiesList, setEditCitiesList] = useState<string[]>([])
  const [loadingEditCities, setLoadingEditCities] = useState(false)
  const [editPhonePrefix, setEditPhonePrefix] = useState('')
  const [editPhoneNumber, setEditPhoneNumber] = useState('')
  const editPhoneInitializedRef = useRef(false)

  const loadCountries = useCallback(async () => {
    setLoadingCountries(true)
    try {
      const list = await countriesService.fetchCountries()
      setCountriesList(list)
    } catch (err) {
      console.error('Erreur chargement pays:', err)
      toast.error('Impossible de charger la liste des pays')
      setCountriesList([])
    } finally {
      setLoadingCountries(false)
    }
  }, [toast])

  const loadCitiesForCountry = useCallback(async (countryName: string, countries: CountryOption[]) => {
    if (!countryName.trim()) {
      setCitiesList([])
      return
    }
    const nameEn = countries.find((c) => c.name === countryName)?.nameEn ?? countryName
    setLoadingCities(true)
    setCitiesList([])
    try {
      const cities = await countriesService.fetchCitiesByCountry(nameEn)
      setCitiesList(cities)
    } catch (err) {
      console.error('Erreur chargement villes:', err)
      setCitiesList([])
    } finally {
      setLoadingCities(false)
    }
  }, [])

  useEffect(() => {
    if (isCreateModalOpen && countriesList.length === 0 && !loadingCountries) {
      loadCountries()
    }
  }, [isCreateModalOpen, countriesList.length, loadingCountries, loadCountries])

  useEffect(() => {
    if (createFormData.country) {
      loadCitiesForCountry(createFormData.country, countriesList)
    } else {
      setCitiesList([])
      setCreatePhonePrefix('')
    }
  }, [createFormData.country, countriesList, loadCitiesForCountry])

  useEffect(() => {
    if (createFormData.country && countriesList.length > 0) {
      const country = countriesList.find((c) => c.name === createFormData.country)
      setCreatePhonePrefix(country?.dialCode ?? '')
    }
  }, [createFormData.country, countriesList])

  useEffect(() => {
    if (isEditModalOpen && countriesList.length === 0 && !loadingCountries) {
      loadCountries()
    }
  }, [isEditModalOpen, countriesList.length, loadingCountries, loadCountries])

  useEffect(() => {
    const countryName = editFormData.country ?? filialeToEdit?.country
    if (!countryName) {
      setEditCitiesList([])
      return
    }
    const nameEn = countriesList.find((c) => c.name === countryName)?.nameEn ?? countryName
    setLoadingEditCities(true)
    setEditCitiesList([])
    countriesService
      .fetchCitiesByCountry(nameEn)
      .then((cities) => setEditCitiesList(cities))
      .catch(() => setEditCitiesList([]))
      .finally(() => setLoadingEditCities(false))
  }, [editFormData.country, filialeToEdit?.country, countriesList])

  useEffect(() => {
    if (!isEditModalOpen) {
      editPhoneInitializedRef.current = false
      return
    }
    if (!filialeToEdit || countriesList.length === 0) return
    const countryName = editFormData.country ?? filialeToEdit.country
    const country = countriesList.find((c) => c.name === countryName)
    if (country) {
      setEditPhonePrefix(country.dialCode)
      if (!editPhoneInitializedRef.current) {
        editPhoneInitializedRef.current = true
        const phone = filialeToEdit.phone || ''
        if (phone.startsWith(country.dialCode)) {
          setEditPhoneNumber(phone.replace(country.dialCode, '').trim())
        } else {
          setEditPhoneNumber(phone)
        }
      }
    }
  }, [isEditModalOpen, filialeToEdit, countriesList, editFormData.country])

  const loadFiliales = async () => {
    setLoading(true)
    try {
      const data = await filialeService.getAll(false)
      setFiliales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des filiales:', error)
      toast.error('Erreur lors du chargement des filiales')
      setFiliales([])
    } finally {
      setLoading(false)
    }
  }

  // Charger les logiciels
  const loadSoftware = async () => {
    setLoadingSoftware(true)
    try {
      const data = await softwareService.getActive()
      setSoftwareList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des logiciels:', error)
      toast.error('Erreur lors du chargement des logiciels')
    } finally {
      setLoadingSoftware(false)
    }
  }

  // Charger les déploiements d'une filiale
  const loadDeployments = async (filialeId: number) => {
    setLoadingDeployments(true)
    try {
      const data = await softwareService.getDeploymentsByFiliale(filialeId)
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
  const handleOpenDeploymentsModal = async (filiale: FilialeDTO) => {
    setSelectedFilialeForDeployments(filiale)
    setIsDeploymentsModalOpen(true)
    if (softwareList.length === 0) {
      await loadSoftware()
    }
    await loadDeployments(filiale.id)
  }

  // Créer un déploiement
  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('software.deploy')) {
      toast.error('Vous n\'avez pas la permission de déployer un logiciel')
      setIsCreateDeploymentModalOpen(false)
      return
    }
    if (!createDeploymentFormData.software_id) {
      toast.error('Veuillez sélectionner un logiciel')
      return
    }
    setIsSubmitting(true)
    try {
      await softwareService.createDeployment(createDeploymentFormData.filiale_id, createDeploymentFormData)
      toast.success('Déploiement créé avec succès')
      setIsCreateDeploymentModalOpen(false)
      setCreateDeploymentFormData({
        filiale_id: createDeploymentFormData.filiale_id,
        software_id: 0,
        deployed_at: undefined,
        notes: undefined,
      })
      if (selectedFilialeForDeployments) {
        await loadDeployments(selectedFilialeForDeployments.id)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du déploiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition de déploiement
  const handleOpenEditDeploymentModal = (deployment: FilialeSoftwareDTO) => {
    if (!hasPermission('software.manage_deployments')) {
      toast.error('Vous n\'avez pas la permission de modifier un déploiement')
      return
    }
    setDeploymentToEdit(deployment)
    setEditDeploymentFormData({
      version: deployment.version,
      deployed_at: deployment.deployed_at,
      is_active: deployment.is_active,
      notes: deployment.notes,
    })
    setIsEditDeploymentModalOpen(true)
  }

  // Mettre à jour un déploiement
  const handleUpdateDeployment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('software.manage_deployments')) {
      toast.error('Vous n\'avez pas la permission de modifier un déploiement')
      setIsEditDeploymentModalOpen(false)
      setDeploymentToEdit(null)
      return
    }
    if (!deploymentToEdit) return
    setIsSubmitting(true)
    try {
      await softwareService.updateDeployment(deploymentToEdit.id, editDeploymentFormData)
      toast.success('Déploiement mis à jour avec succès')
      setIsEditDeploymentModalOpen(false)
      setDeploymentToEdit(null)
      if (selectedFilialeForDeployments) {
        await loadDeployments(selectedFilialeForDeployments.id)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du déploiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Supprimer un déploiement
  const handleDeleteDeploymentClick = (deployment: FilialeSoftwareDTO) => {
    if (!hasPermission('software.manage_deployments')) {
      toast.error('Vous n\'avez pas la permission de supprimer un déploiement')
      return
    }
    setDeploymentToDelete(deployment)
    setIsDeleteDeploymentModalOpen(true)
  }

  const handleDeleteDeploymentConfirm = async () => {
    if (!hasPermission('software.manage_deployments')) {
      toast.error('Vous n\'avez pas la permission de supprimer un déploiement')
      setIsDeleteDeploymentModalOpen(false)
      setDeploymentToDelete(null)
      return
    }
    if (!deploymentToDelete) return
    setIsSubmitting(true)
    try {
      await softwareService.deleteDeployment(deploymentToDelete.id)
      toast.success('Déploiement supprimé avec succès')
      setIsDeleteDeploymentModalOpen(false)
      setDeploymentToDelete(null)
      if (selectedFilialeForDeployments) {
        await loadDeployments(selectedFilialeForDeployments.id)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du déploiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    // Vérifier l'accès à la page
    if (!hasPermission('filiales.view') && !hasPermission('filiales.create') && !hasPermission('filiales.update') && !hasPermission('filiales.manage')) {
      navigate('/app/dashboard')
      return
    }
    loadFiliales()
  }, [hasPermission, navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('filiales.create')) {
      toast.error('Vous n\'avez pas la permission de créer une filiale')
      setIsCreateModalOpen(false)
      return
    }
    if (!createFormData.name.trim() || !createFormData.code.trim()) {
      toast.error('Le nom et le code sont requis')
      return
    }
    setIsSubmitting(true)
    try {
      const phoneValue = createPhonePrefix
        ? `${createPhonePrefix} ${createPhoneNumber}`.trim()
        : createPhoneNumber.trim()
      await filialeService.create({
        ...createFormData,
        phone: phoneValue || undefined,
      })
      toast.success('Filiale créée avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        code: '',
        name: '',
        country: '',
        city: '',
        address: undefined,
        phone: '',
        email: '',
        is_software_provider: false,
      })
      setCreatePhonePrefix('')
      setCreatePhoneNumber('')
      setCitiesList([])
      loadFiliales()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de la filiale')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (filiale: FilialeDTO) => {
    if (!hasPermission('filiales.update') && !hasPermission('filiales.manage')) {
      toast.error('Vous n\'avez pas la permission de modifier une filiale')
      return
    }
    editPhoneInitializedRef.current = false
    setFilialeToEdit(filiale)
    setEditFormData({
      name: filiale.name,
      country: filiale.country ?? '',
      city: filiale.city ?? '',
      address: filiale.address,
      phone: filiale.phone,
      email: filiale.email ?? '',
      is_active: filiale.is_active,
      is_software_provider: filiale.is_software_provider,
    })
    setEditPhoneNumber(filiale.phone ?? '')
    setEditPhonePrefix('')
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('filiales.update') && !hasPermission('filiales.manage')) {
      toast.error('Vous n\'avez pas la permission de modifier une filiale')
      setIsEditModalOpen(false)
      setFilialeToEdit(null)
      return
    }
    if (!filialeToEdit) return
    setIsSubmitting(true)
    try {
      const phoneValue = editPhonePrefix
        ? `${editPhonePrefix} ${editPhoneNumber}`.trim()
        : editPhoneNumber.trim()
      await filialeService.update(filialeToEdit.id, {
        ...editFormData,
        phone: phoneValue || undefined,
      })
      toast.success('Filiale mise à jour avec succès')
      setIsEditModalOpen(false)
      setFilialeToEdit(null)
      loadFiliales()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la filiale')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (filiale: FilialeDTO) => {
    if (!hasPermission('filiales.manage')) {
      toast.error('Vous n\'avez pas la permission de supprimer une filiale')
      return
    }
    setFilialeToDelete(filiale)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!hasPermission('filiales.manage')) {
      toast.error('Vous n\'avez pas la permission de supprimer une filiale')
      setIsDeleteModalOpen(false)
      setFilialeToDelete(null)
      return
    }
    if (!filialeToDelete) return
    setIsSubmitting(true)
    try {
      await filialeService.delete(filialeToDelete.id)
      toast.success('Filiale supprimée avec succès')
      setIsDeleteModalOpen(false)
      setFilialeToDelete(null)
      loadFiliales()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression de la filiale')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vérifier l'accès à la page
  if (!hasPermission('filiales.view') && !hasPermission('filiales.create') && !hasPermission('filiales.update') && !hasPermission('filiales.manage')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Filiales</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les filiales du groupe {APP_GROUP_NAME}</p>
        </div>
        <PermissionGuard permissions={['filiales.create']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle filiale
          </button>
        </PermissionGuard>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des filiales...</span>
          </div>
        ) : !hasPermission('filiales.view') ? (
          <div className="py-8">
            <PermissionDenied message="Vous n'avez pas la permission de voir la liste des filiales" />
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
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
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
                {filiales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucune filiale enregistrée
                    </td>
                  </tr>
                ) : (
                  filiales.map((filiale) => (
                    <tr key={filiale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {filiale.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {filiale.name}
                          {filiale.is_software_provider && (
                            <span className="ml-2 badge bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                              Fournisseur de logiciels
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {filiale.city && filiale.country ? (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {filiale.city}, {filiale.country}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          {filiale.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {filiale.phone}
                            </div>
                          )}
                          {filiale.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {filiale.email}
                            </div>
                          )}
                          {!filiale.phone && !filiale.email && <span>-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {filiale.is_active ? (
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
                          <PermissionGuard permissions={['software.view']} showMessage={false}>
                            <button
                              onClick={() => handleOpenDeploymentsModal(filiale)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              title="Voir les déploiements"
                            >
                              <Package className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['filiales.update', 'filiales.manage']} showMessage={false}>
                            <button
                              onClick={() => handleOpenEditModal(filiale)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permissions={['filiales.manage']} showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(filiale)}
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
            code: '',
            name: '',
            country: '',
            city: '',
            address: undefined,
            phone: '',
            email: '',
            is_software_provider: false,
          })
          setCreatePhonePrefix('')
          setCreatePhoneNumber('')
          setCitiesList([])
        }}
        title="Nouvelle filiale"
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
                placeholder="Ex: MCI, SEN, TOG"
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
                placeholder="Ex: Siège"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pays
              </label>
              <ScrollableSelect
                value={createFormData.country}
                onChange={(name) => setCreateFormData({ ...createFormData, country: name, city: '' })}
                options={countriesList.map((c) => ({ value: c.name, label: c.name }))}
                placeholder="Sélectionner un pays"
                loading={loadingCountries}
                allowEmpty
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ville
              </label>
              {loadingCities ? (
                <div className="input flex items-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Chargement des villes...
                </div>
              ) : citiesList.length > 0 ? (
                <ScrollableSelect
                  value={createFormData.city}
                  onChange={(city) => setCreateFormData({ ...createFormData, city })}
                  options={[
                    ...(createFormData.city && !citiesList.includes(createFormData.city)
                      ? [{ value: createFormData.city, label: createFormData.city }]
                      : []),
                    ...citiesList.map((city) => ({ value: city, label: city })),
                  ]}
                  placeholder="Sélectionner une ville"
                  allowEmpty
                />
              ) : (
                <input
                  type="text"
                  value={createFormData.city}
                  onChange={(e) => setCreateFormData({ ...createFormData, city: e.target.value })}
                  className="input"
                  placeholder="Ex: Abidjan"
                />
              )}
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
                placeholder="Adresse complète"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Téléphone
              </label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden">
                <span className="inline-flex items-center px-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border-r border-gray-300 dark:border-gray-600 whitespace-nowrap">
                  {createPhonePrefix || '—'}
                </span>
                <input
                  type="tel"
                  value={createPhoneNumber}
                  onChange={(e) => setCreatePhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className="input border-0 rounded-none flex-1 min-w-0"
                  placeholder="07 12 34 56 78"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                className="input"
                placeholder="Ex: contact@filiale.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createFormData.is_software_provider ?? false}
                  onChange={(e) => setCreateFormData({ ...createFormData, is_software_provider: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Fournisseur de logiciels</span>
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
              {isSubmitting ? 'Création...' : 'Créer la filiale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      {filialeToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setFilialeToEdit(null)
          }}
          title={`Modifier la filiale: ${filialeToEdit.name}`}
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
                  value={editFormData.name !== undefined ? editFormData.name : filialeToEdit.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Siège"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pays
                </label>
                <ScrollableSelect
                  value={editFormData.country !== undefined ? editFormData.country : (filialeToEdit.country || '')}
                  onChange={(name) => setEditFormData({ ...editFormData, country: name, city: '' })}
                  options={countriesList.map((c) => ({ value: c.name, label: c.name }))}
                  placeholder="Sélectionner un pays"
                  loading={loadingCountries}
                  allowEmpty
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ville
                </label>
                {loadingEditCities ? (
                  <div className="input flex items-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Chargement des villes...
                  </div>
                ) : editCitiesList.length > 0 ? (
                  <ScrollableSelect
                    value={editFormData.city !== undefined ? editFormData.city : (filialeToEdit.city || '')}
                    onChange={(city) => setEditFormData({ ...editFormData, city })}
                    options={[
                      ...((() => {
                        const currentCity = editFormData.city !== undefined ? editFormData.city : (filialeToEdit.city || '')
                        return currentCity && !editCitiesList.includes(currentCity)
                          ? [{ value: currentCity, label: currentCity }]
                          : []
                      })()),
                      ...editCitiesList.map((city) => ({ value: city, label: city })),
                    ]}
                    placeholder="Sélectionner une ville"
                    allowEmpty
                  />
                ) : (
                  <input
                    type="text"
                    value={editFormData.city !== undefined ? editFormData.city : (filialeToEdit.city || '')}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="input"
                    placeholder="Ex: Abidjan"
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                <textarea
                  value={editFormData.address !== undefined ? editFormData.address : (filialeToEdit.address || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value || undefined })}
                  rows={2}
                  className="input"
                  placeholder="Adresse complète"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Téléphone
                </label>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden">
                  <span className="inline-flex items-center px-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border-r border-gray-300 dark:border-gray-600 whitespace-nowrap">
                    {editPhonePrefix || '—'}
                  </span>
                  <input
                    type="tel"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    className="input border-0 rounded-none flex-1 min-w-0"
                    placeholder="07 12 34 56 78"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email !== undefined ? editFormData.email : (filialeToEdit.email || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="input"
                  placeholder="Ex: contact@filiale.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active !== undefined ? editFormData.is_active : filialeToEdit.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Filiale active</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_software_provider !== undefined ? editFormData.is_software_provider : filialeToEdit.is_software_provider}
                    onChange={(e) => setEditFormData({ ...editFormData, is_software_provider: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fournisseur de logiciels</span>
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
          setFilialeToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la filiale"
        message={`Êtes-vous sûr de vouloir supprimer la filiale "${filialeToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />

      {/* Modal des déploiements */}
      {selectedFilialeForDeployments && (
        <Modal
          isOpen={isDeploymentsModalOpen}
          onClose={() => {
            setIsDeploymentsModalOpen(false)
            setSelectedFilialeForDeployments(null)
            setDeployments([])
          }}
          title={`Déploiements - ${selectedFilialeForDeployments.name}`}
          size="xl"
        >
          <div className="space-y-4">
            <PermissionGuard permissions={['software.deploy']}>
              <button
                onClick={() => {
                  setCreateDeploymentFormData({
                    filiale_id: selectedFilialeForDeployments.id,
                    software_id: 0,
                    deployed_at: undefined,
                    notes: undefined,
                  })
                  setIsCreateDeploymentModalOpen(true)
                }}
                className="btn btn-primary flex items-center mb-4"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau déploiement
              </button>
            </PermissionGuard>

            {loadingDeployments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des déploiements...</span>
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucun déploiement enregistré pour cette filiale
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Logiciel
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {deployments.map((deployment) => (
                      <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {deployment.software?.name || 'N/A'}
                            {deployment.software?.code && ` (${deployment.software.code})`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {deployment.software?.version ? `v${deployment.software.version}` : '-'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <PermissionGuard permissions={['software.manage_deployments']} showMessage={false}>
                              <button
                                onClick={() => handleOpenEditDeploymentModal(deployment)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                title="Modifier"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            </PermissionGuard>
                            <PermissionGuard permissions={['software.manage_deployments']} showMessage={false}>
                              <button
                                onClick={() => handleDeleteDeploymentClick(deployment)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                title="Supprimer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </PermissionGuard>
                          </div>
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

      {/* Modal de création de déploiement */}
      {selectedFilialeForDeployments && (
        <Modal
          isOpen={isCreateDeploymentModalOpen}
          onClose={() => {
            setIsCreateDeploymentModalOpen(false)
            setCreateDeploymentFormData({
              filiale_id: selectedFilialeForDeployments.id,
              software_id: 0,
              deployed_at: undefined,
              notes: undefined,
            })
          }}
          title={`Nouveau déploiement - ${selectedFilialeForDeployments.name}`}
          size="lg"
        >
          <form onSubmit={handleCreateDeployment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logiciel <span className="text-red-500">*</span>
              </label>
              {loadingSoftware ? (
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Chargement...
                </div>
              ) : (
                <select
                  required
                  value={createDeploymentFormData.software_id}
                  onChange={(e) => setCreateDeploymentFormData({ ...createDeploymentFormData, software_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                >
                  <option value="0">Sélectionner un logiciel</option>
                  {(softwareList || []).map((software) => (
                    <option key={software.id} value={software.id}>
                      {software.name} {software.code ? `(${software.code})` : ''}
                      {software.version && ` - v${software.version}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {createDeploymentFormData.software_id > 0 && (() => {
              const selectedSoftware = softwareList.find(s => s.id === createDeploymentFormData.software_id)
              if (selectedSoftware?.version) {
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Version du logiciel :</strong> v{selectedSoftware.version}
                    </p>
                  </div>
                )
              }
              return null
            })()}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de déploiement
              </label>
              <input
                type="datetime-local"
                value={createDeploymentFormData.deployed_at ? new Date(createDeploymentFormData.deployed_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setCreateDeploymentFormData({ 
                  ...createDeploymentFormData, 
                  deployed_at: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={createDeploymentFormData.notes || ''}
                onChange={(e) => setCreateDeploymentFormData({ ...createDeploymentFormData, notes: e.target.value || undefined })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Notes sur le déploiement"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateDeploymentModalOpen(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !createDeploymentFormData.software_id}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Création...' : 'Créer le déploiement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal d'édition de déploiement */}
      {deploymentToEdit && (
        <Modal
          isOpen={isEditDeploymentModalOpen}
          onClose={() => {
            setIsEditDeploymentModalOpen(false)
            setDeploymentToEdit(null)
          }}
          title={`Modifier le déploiement`}
          size="lg"
        >
          <form onSubmit={handleUpdateDeployment} className="space-y-4">
            {deploymentToEdit.software?.version && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version du logiciel
                </label>
                <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  v{deploymentToEdit.software.version}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de déploiement
              </label>
              <input
                type="datetime-local"
                value={editDeploymentFormData.deployed_at 
                  ? new Date(editDeploymentFormData.deployed_at).toISOString().slice(0, 16)
                  : (deploymentToEdit.deployed_at ? new Date(deploymentToEdit.deployed_at).toISOString().slice(0, 16) : '')}
                onChange={(e) => setEditDeploymentFormData({ 
                  ...editDeploymentFormData, 
                  deployed_at: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={editDeploymentFormData.notes !== undefined ? editDeploymentFormData.notes : (deploymentToEdit.notes || '')}
                onChange={(e) => setEditDeploymentFormData({ ...editDeploymentFormData, notes: e.target.value || undefined })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Notes sur le déploiement"
              />
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editDeploymentFormData.is_active !== undefined ? editDeploymentFormData.is_active : deploymentToEdit.is_active}
                  onChange={(e) => setEditDeploymentFormData({ ...editDeploymentFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Déploiement actif</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDeploymentModalOpen(false)}
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

      {/* Modal de suppression de déploiement */}
      <ConfirmModal
        isOpen={isDeleteDeploymentModalOpen}
        onClose={() => {
          setIsDeleteDeploymentModalOpen(false)
          setDeploymentToDelete(null)
        }}
        onConfirm={handleDeleteDeploymentConfirm}
        title="Supprimer le déploiement"
        message={`Êtes-vous sûr de vouloir supprimer le déploiement "${deploymentToDelete?.software?.name || 'N/A'}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default Filiales
