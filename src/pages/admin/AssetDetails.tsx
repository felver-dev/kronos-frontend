import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, HardDrive, Calendar, MapPin, User, Tag, FileText, Edit, Trash2, Server, Laptop, Printer, Monitor, Loader2, Ticket, AlertCircle, Package, Plus } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { assetService, AssetDTO, UpdateAssetRequest, AssetCategoryDTO } from '../../services/assetService'
import { userService } from '../../services/userService'
import { TicketDTO } from '../../services/ticketService'
import { officeService, type OfficeDTO } from '../../services/officeService'
import { assetSoftwareService, AssetSoftwareDTO, CreateAssetSoftwareRequest, UpdateAssetSoftwareRequest } from '../../services/assetSoftwareService'
import { useToastContext } from '../../contexts/ToastContext'

const AssetDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [asset, setAsset] = useState<AssetDTO | null>(null)
  const [linkedTickets, setLinkedTickets] = useState<TicketDTO[]>([])
  const [installedSoftware, setInstalledSoftware] = useState<AssetSoftwareDTO[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<AssetCategoryDTO[]>([])
  const [offices, setOffices] = useState<OfficeDTO[]>([])
  const [, setSoftwareStats] = useState<any>(null)
  const [loadingSoftwareNames, setLoadingSoftwareNames] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false)
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false)
  const [isEditSoftwareModalOpen, setIsEditSoftwareModalOpen] = useState(false)
  const [isDeleteSoftwareModalOpen, setIsDeleteSoftwareModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [softwareToDelete, setSoftwareToDelete] = useState<AssetSoftwareDTO | null>(null)
  const [softwareToEdit, setSoftwareToEdit] = useState<AssetSoftwareDTO | null>(null)
  const [selectedEditOfficeId, setSelectedEditOfficeId] = useState<number | ''>('')
  const [editFormData, setEditFormData] = useState<UpdateAssetRequest>({
    name: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    status: 'available',
    location: '',
    notes: '',
  })
  const [softwareFormData, setSoftwareFormData] = useState<CreateAssetSoftwareRequest>({
    asset_id: 0,
    software_name: '',
    version: '',
    license_key: '',
    installation_date: '',
    notes: '',
  })
  const [editSoftwareFormData, setEditSoftwareFormData] = useState<UpdateAssetSoftwareRequest>({
    software_name: '',
    version: '',
    license_key: '',
    installation_date: '',
    notes: '',
  })

  // Charger l'actif
  const loadAsset = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const assetData = await assetService.getById(parseInt(id))
      setAsset(assetData)
      
      // Charger les tickets liés
      try {
        const tickets = await assetService.getLinkedTickets(parseInt(id))
        setLinkedTickets(Array.isArray(tickets) ? tickets : [])
      } catch (err) {
        console.error('Erreur lors du chargement des tickets liés:', err)
        setLinkedTickets([]) // S'assurer que linkedTickets reste un tableau
      }

      // Charger les logiciels installés
      try {
        const software = await assetSoftwareService.getByAssetId(parseInt(id))
        setInstalledSoftware(Array.isArray(software) ? software : [])
      } catch (err) {
        console.error('Erreur lors du chargement des logiciels installés:', err)
        setInstalledSoftware([])
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'actif:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'actif')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'actif')
    } finally {
      setLoading(false)
    }
  }

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      const usersData = await userService.getAll()
      setUsers(usersData)
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
    }
  }

  // Charger les catégories
  const loadCategories = async () => {
    try {
      const response = await assetService.getCategories()
      // Gérer le cas où l'API retourne un objet avec pagination ou un tableau
      const categoriesData = Array.isArray(response) 
        ? response 
        : (response as any).categories 
        ? (response as any).categories 
        : []
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      setCategories([]) // S'assurer que categories reste un tableau en cas d'erreur
    }
  }

  // Charger les sièges pour la localisation
  const loadOffices = async () => {
    try {
      const data = await officeService.getAll(true)
      setOffices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des sièges:', err)
      toast.error('Erreur lors du chargement des sièges')
      setOffices([])
    }
  }

  // Charger tous les logiciels pour obtenir les noms et versions
  const [allSoftwareList, setAllSoftwareList] = useState<AssetSoftwareDTO[]>([])
  const [, setLoadingSoftwareList] = useState(false)

  const loadSoftwareNames = async () => {
    setLoadingSoftwareNames(true)
    setLoadingSoftwareList(true)
    try {
      // Charger tous les logiciels pour avoir accès aux noms et versions
      const allSoftware = await assetSoftwareService.getAll()
      setAllSoftwareList(allSoftware)
      
      // Charger aussi les stats pour compatibilité
      const stats = await assetSoftwareService.getStatistics()
      setSoftwareStats(stats)
    } catch (err) {
      console.error('Erreur lors du chargement des logiciels:', err)
      setAllSoftwareList([])
      setSoftwareStats(null)
    } finally {
      setLoadingSoftwareNames(false)
      setLoadingSoftwareList(false)
    }
  }

  // Extraire les noms de logiciels uniques depuis tous les logiciels
  const softwareNames = useMemo(() => {
    const names = allSoftwareList.map((s) => s.software_name)
    // Supprimer les doublons et trier
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [allSoftwareList])

  // Obtenir la clé de licence pour un logiciel et une version donnés
  const getLicenseKey = (softwareName: string, version?: string): string => {
    if (!softwareName) return ''
    const matchingSoftware = allSoftwareList.find((s) => {
      if (version) {
        return s.software_name === softwareName && s.version === version && s.license_key
      }
      return s.software_name === softwareName && s.license_key
    })
    return matchingSoftware?.license_key || ''
  }

  // Extraire les versions disponibles pour un logiciel donné
  const getAvailableVersions = (softwareName: string, currentVersion?: string): string[] => {
    if (!softwareName) return []
    const versions = allSoftwareList
      .filter((s) => s.software_name === softwareName && s.version)
      .map((s) => s.version!)
    
    // Si une version actuelle est fournie et n'est pas dans la liste, l'ajouter
    if (currentVersion && !versions.includes(currentVersion)) {
      versions.push(currentVersion)
    }
    
    // Supprimer les doublons et trier
    return Array.from(new Set(versions)).sort((a, b) => a.localeCompare(b))
  }

  useEffect(() => {
    loadAsset()
    loadUsers()
    loadCategories()
    loadOffices()
    loadSoftwareNames()
  }, [id])

  // Ouvrir le modal d'édition
  const handleOpenEditModal = () => {
    if (!asset) return

    // Tenter de retrouver le siège correspondant à la localisation actuelle
    let matchingOfficeId: number | '' = ''
    if (asset.location && offices.length > 0) {
      const matchingOffice = offices.find((office) => {
        const officeLabel = `${office.name} (${office.city})`
        return asset.location === officeLabel || asset.location === office.name
      })
      if (matchingOffice) {
        matchingOfficeId = matchingOffice.id
      }
    }
    setSelectedEditOfficeId(matchingOfficeId)

    setEditFormData({
      name: asset.name,
      serial_number: asset.serial_number || '',
      model: asset.model || '',
      manufacturer: asset.manufacturer || '',
      category_id: asset.category_id,
      status: asset.status,
      location: asset.location || '',
      notes: asset.notes || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : undefined,
      warranty_expiry: asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : undefined,
    })
    setIsEditModalOpen(true)
  }

  // Mettre à jour l'actif
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asset) return
    setIsSubmitting(true)
    try {
      await assetService.update(asset.id, editFormData)
      toast.success('Actif mis à jour avec succès')
      setIsEditModalOpen(false)
      loadAsset()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la mise à jour de l\'actif')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Assigner l'actif
  const handleAssign = async () => {
    if (!asset || !selectedUserId) return
    setIsSubmitting(true)
    try {
      await assetService.assign(asset.id, selectedUserId)
      toast.success('Actif assigné avec succès')
      setIsAssignModalOpen(false)
      setSelectedUserId(null)
      loadAsset()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de l\'assignation de l\'actif')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Retirer l'assignation
  const handleUnassign = async () => {
    if (!asset) return
    setIsSubmitting(true)
    try {
      await assetService.unassign(asset.id)
      toast.success('Assignation retirée avec succès')
      setIsUnassignModalOpen(false)
      loadAsset()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors du retrait de l\'assignation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Charger les logiciels installés
  const loadSoftware = async () => {
    if (!id) return
    try {
      const software = await assetSoftwareService.getByAssetId(parseInt(id))
      setInstalledSoftware(Array.isArray(software) ? software : [])
    } catch (err) {
      console.error('Erreur lors du chargement des logiciels:', err)
      toast.error('Erreur lors du chargement des logiciels installés')
      setInstalledSoftware([])
    }
  }

  // Ouvrir le modal de création de logiciel
  const handleOpenSoftwareModal = () => {
    if (!asset) return
    setSoftwareFormData({
      asset_id: asset.id,
      software_name: '',
      version: '',
      license_key: '',
      installation_date: '',
      notes: '',
    })
    setIsSoftwareModalOpen(true)
  }

  // Créer un logiciel installé
  const handleCreateSoftware = async () => {
    if (!asset) return
    if (!softwareFormData.software_name.trim()) {
      toast.error('Le nom du logiciel est obligatoire')
      return
    }

    setIsSubmitting(true)
    try {
      await assetSoftwareService.create(softwareFormData)
      toast.success('Logiciel installé ajouté avec succès')
      setIsSoftwareModalOpen(false)
      loadSoftware()
      loadSoftwareNames() // Recharger la liste des noms et versions de logiciels
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de l\'ajout du logiciel installé')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition de logiciel
  const handleOpenEditSoftwareModal = (software: AssetSoftwareDTO) => {
    setSoftwareToEdit(software)
    setEditSoftwareFormData({
      software_name: software.software_name,
      version: software.version || '',
      license_key: software.license_key || '',
      installation_date: software.installation_date ? software.installation_date.split('T')[0] : '',
      notes: software.notes || '',
    })
    setIsEditSoftwareModalOpen(true)
  }

  // Mettre à jour un logiciel installé
  const handleUpdateSoftware = async () => {
    if (!softwareToEdit) return

    setIsSubmitting(true)
    try {
      await assetSoftwareService.update(softwareToEdit.id, editSoftwareFormData)
      toast.success('Logiciel installé mis à jour avec succès')
      setIsEditSoftwareModalOpen(false)
      setSoftwareToEdit(null)
      loadSoftware()
      loadSoftwareNames() // Recharger la liste des noms et versions de logiciels
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la mise à jour du logiciel installé')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Supprimer un logiciel installé
  const handleDeleteSoftwareClick = (software: AssetSoftwareDTO) => {
    setSoftwareToDelete(software)
    setIsDeleteSoftwareModalOpen(true)
  }

  const handleDeleteSoftwareConfirm = async () => {
    if (!softwareToDelete) return

    setIsSubmitting(true)
    try {
      await assetSoftwareService.delete(softwareToDelete.id)
      toast.success('Logiciel installé supprimé avec succès')
      setIsDeleteSoftwareModalOpen(false)
      setSoftwareToDelete(null)
      loadSoftware()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la suppression du logiciel installé')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Supprimer l'actif
  const handleDelete = async () => {
    if (!asset) return
    setIsSubmitting(true)
    try {
      await assetService.delete(asset.id)
      toast.success('Actif supprimé avec succès')
      navigate('/admin/assets')
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la suppression de l\'actif')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formater le statut
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      available: 'Disponible',
      in_use: 'En utilisation',
      maintenance: 'En maintenance',
      retired: 'Hors service',
    }
    return statusMap[status] || status
  }

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      in_use: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      maintenance: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      retired: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    }
    return styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Obtenir l'icône selon la catégorie
  const getAssetIcon = (categoryName?: string) => {
    if (!categoryName) return <HardDrive className="w-8 h-8" />
    const name = categoryName.toLowerCase()
    if (name.includes('serveur')) return <Server className="w-8 h-8" />
    if (name.includes('ordinateur') || name.includes('laptop') || name.includes('pc')) return <Laptop className="w-8 h-8" />
    if (name.includes('imprimante') || name.includes('printer')) return <Printer className="w-8 h-8" />
    if (name.includes('écran') || name.includes('monitor')) return <Monitor className="w-8 h-8" />
    return <HardDrive className="w-8 h-8" />
  }

  // Formater la date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/assets"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Link>
        <div className="card">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p>{error || 'Actif introuvable'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/assets"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  {getAssetIcon(asset.category?.name)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{asset.name}</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {asset.manufacturer} {asset.model}
                  </p>
                </div>
              </div>
              <span className={`badge ${getStatusBadge(asset.status)}`}>
                {formatStatus(asset.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <Tag className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Catégorie</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {asset.category?.name || 'Non catégorisé'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Numéro de série</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {asset.serial_number || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {asset.location || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Assigné à</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {asset.assigned_user
                      ? `${asset.assigned_user.first_name || ''} ${asset.assigned_user.last_name || ''}`.trim() || asset.assigned_user.username || asset.assigned_user.email
                      : 'Non assigné'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {asset.notes && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{asset.notes}</p>
            </div>
          )}

          {/* Tickets liés */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Ticket className="w-5 h-5 mr-2" />
              Tickets liés ({(linkedTickets || []).length})
            </h2>
            {!linkedTickets || linkedTickets.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun ticket lié à cet actif</p>
            ) : (
              <div className="space-y-3">
                {linkedTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/admin/tickets/${ticket.id}`}
                    className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{ticket.code} - {ticket.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ticket.status} • {ticket.priority}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Logiciels installés */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Logiciels installés ({(installedSoftware || []).length})
              </h2>
              <button
                onClick={handleOpenSoftwareModal}
                className="btn btn-primary flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </button>
            </div>
            {!installedSoftware || installedSoftware.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun logiciel installé sur cet actif</p>
            ) : (
              <div className="space-y-3">
                {installedSoftware.map((software) => (
                  <div
                    key={software.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{software.software_name}</h3>
                          {software.version && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">v{software.version}</span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {software.installation_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Installé le {new Date(software.installation_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          {software.license_key && (
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span>Clé: {software.license_key}</span>
                            </div>
                          )}
                          {software.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{software.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleOpenEditSoftwareModal(software)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSoftwareClick(software)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informations financières */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Informations</h3>
            <div className="space-y-4">
              {asset.purchase_date && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date d'achat</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(asset.purchase_date)}</p>
                  </div>
                </div>
              )}
              {asset.purchase_date && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Âge de l'actif</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {(() => {
                      try {
                        const purchase = new Date(asset.purchase_date)
                        const now = new Date()
                        const diffTime = Math.abs(now.getTime() - purchase.getTime())
                        const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365))
                        const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30))
                        
                        if (diffYears === 0) {
                          return diffMonths === 0 ? '< 1 mois' : `${diffMonths} mois`
                        }
                        return diffMonths > 0 ? `${diffYears} an${diffYears > 1 ? 's' : ''} ${diffMonths} mois` : `${diffYears} an${diffYears > 1 ? 's' : ''}`
                      } catch {
                        return '-'
                      }
                    })()}
                  </p>
                </div>
              )}
              {asset.warranty_expiry && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expiration garantie</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(asset.warranty_expiry)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(asset.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Modifié le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(asset.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleOpenEditModal}
                className="w-full btn btn-primary flex items-center justify-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </button>
              {asset.assigned_user ? (
                <button
                  onClick={() => setIsUnassignModalOpen(true)}
                  className="w-full btn btn-secondary"
                >
                  Retirer l'assignation
                </button>
              ) : (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="w-full btn btn-secondary"
                >
                  Assigner
                </button>
              )}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full btn btn-danger"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedEditOfficeId('')
        }}
        title="Modifier l'actif"
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro de série
              </label>
              <input
                type="text"
                value={editFormData.serial_number}
                onChange={(e) => setEditFormData({ ...editFormData, serial_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modèle
              </label>
              <input
                type="text"
                value={editFormData.model}
                onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fabricant
              </label>
              <input
                type="text"
                value={editFormData.manufacturer}
                onChange={(e) => setEditFormData({ ...editFormData, manufacturer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie
              </label>
              <select
                value={editFormData.category_id}
                onChange={(e) => setEditFormData({ ...editFormData, category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                {Array.isArray(categories) && categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    status: e.target.value as UpdateAssetRequest['status'],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="available">Disponible</option>
                <option value="in_use">En utilisation</option>
                <option value="maintenance">En maintenance</option>
                <option value="retired">Hors service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Localisation (siège)
              </label>
              <select
                value={selectedEditOfficeId}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setSelectedEditOfficeId('')
                    setEditFormData({ ...editFormData, location: '' })
                    return
                  }
                  const officeId = parseInt(value, 10)
                  setSelectedEditOfficeId(officeId)
                  const selectedOffice = offices.find((o) => o.id === officeId)
                  const label = selectedOffice ? `${selectedOffice.name} (${selectedOffice.city})` : ''
                  setEditFormData({ ...editFormData, location: label })
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="">Sélectionner un siège</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name} ({office.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date d'achat
              </label>
              <input
                type="date"
                value={editFormData.purchase_date || ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    purchase_date: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration garantie
              </label>
              <input
                type="date"
                value={editFormData.warranty_expiry || ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    warranty_expiry: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Notes supplémentaires"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'assignation */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false)
          setSelectedUserId(null)
        }}
        title="Assigner l'actif"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Utilisateur
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(parseInt(e.target.value) || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            >
              <option value="">Sélectionner un utilisateur</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username || user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false)
                setSelectedUserId(null)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAssign}
              disabled={isSubmitting || !selectedUserId}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Assignation...' : 'Assigner'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'actif"
        message={`Êtes-vous sûr de vouloir supprimer l'actif "${asset.name}" ? Cette action est irréversible.`}
      />

      {/* Modal de confirmation de retrait d'assignation */}
      <ConfirmModal
        isOpen={isUnassignModalOpen}
        onClose={() => setIsUnassignModalOpen(false)}
        onConfirm={handleUnassign}
        title="Retirer l'assignation"
        message={`Êtes-vous sûr de vouloir retirer l'assignation de l'actif "${asset.name}" ?`}
      />

      {/* Modal de création de logiciel installé */}
      <Modal
        isOpen={isSoftwareModalOpen}
        onClose={() => {
          setIsSoftwareModalOpen(false)
          setSoftwareFormData({
            asset_id: asset?.id || 0,
            software_name: '',
            version: '',
            license_key: '',
            installation_date: '',
            notes: '',
          })
        }}
        title="Ajouter un logiciel installé"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateSoftware()
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logiciel <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={softwareFormData.software_name}
                onChange={(e) => {
                  const selectedSoftwareName = e.target.value
                  // Si une version est déjà sélectionnée, essayer de préremplir la licence
                  const licenseKey = softwareFormData.version 
                    ? getLicenseKey(selectedSoftwareName, softwareFormData.version)
                    : getLicenseKey(selectedSoftwareName)
                  
                  setSoftwareFormData({ 
                    ...softwareFormData, 
                    software_name: selectedSoftwareName,
                    version: '', // Réinitialiser la version quand on change de logiciel
                    license_key: licenseKey // Préremplir la clé de licence si disponible
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="">{loadingSoftwareNames ? 'Chargement des logiciels...' : 'Sélectionner un logiciel'}</option>
                {softwareNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version
              </label>
              <select
                value={softwareFormData.version}
                onChange={(e) => {
                  const selectedVersion = e.target.value
                  const licenseKey = getLicenseKey(softwareFormData.software_name, selectedVersion || undefined)
                  setSoftwareFormData({ 
                    ...softwareFormData, 
                    version: selectedVersion,
                    license_key: licenseKey // Préremplir la clé de licence
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                disabled={!softwareFormData.software_name}
              >
                <option value="">
                  {softwareFormData.software_name
                    ? getAvailableVersions(softwareFormData.software_name).length === 0
                      ? 'Aucune version disponible'
                      : 'Sélectionner une version (optionnel)'
                    : 'Sélectionnez d\'abord un logiciel'}
                </option>
                {softwareFormData.software_name &&
                  getAvailableVersions(softwareFormData.software_name).map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date d'installation
              </label>
              <input
                type="date"
                value={softwareFormData.installation_date}
                onChange={(e) => setSoftwareFormData({ ...softwareFormData, installation_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clé de licence
              </label>
              <input
                type="text"
                value={softwareFormData.license_key}
                onChange={(e) => setSoftwareFormData({ ...softwareFormData, license_key: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Clé de licence (optionnel)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={softwareFormData.notes}
              onChange={(e) => setSoftwareFormData({ ...softwareFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Notes supplémentaires (optionnel)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsSoftwareModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition de logiciel installé */}
      <Modal
        isOpen={isEditSoftwareModalOpen}
        onClose={() => {
          setIsEditSoftwareModalOpen(false)
          setSoftwareToEdit(null)
        }}
        title="Modifier le logiciel installé"
        size="md"
      >
        {softwareToEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUpdateSoftware()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du logiciel <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={editSoftwareFormData.software_name || ''}
                onChange={(e) => {
                  const selectedSoftwareName = e.target.value
                  // Si une version est déjà sélectionnée, essayer de préremplir la licence
                  const licenseKey = editSoftwareFormData.version 
                    ? getLicenseKey(selectedSoftwareName, editSoftwareFormData.version)
                    : getLicenseKey(selectedSoftwareName)
                  
                  setEditSoftwareFormData({ 
                    ...editSoftwareFormData, 
                    software_name: selectedSoftwareName,
                    version: '', // Réinitialiser la version quand on change de logiciel
                    license_key: licenseKey // Préremplir la clé de licence si disponible
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="">{loadingSoftwareNames ? 'Chargement des logiciels...' : 'Sélectionner un logiciel'}</option>
                {softwareNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version
                </label>
                <select
                  value={editSoftwareFormData.version || ''}
                  onChange={(e) => {
                    const selectedVersion = e.target.value
                    const licenseKey = getLicenseKey(editSoftwareFormData.software_name || '', selectedVersion || undefined)
                    setEditSoftwareFormData({ 
                      ...editSoftwareFormData, 
                      version: selectedVersion,
                      license_key: licenseKey // Préremplir la clé de licence
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  disabled={!editSoftwareFormData.software_name}
                >
                  <option value="">
                    {editSoftwareFormData.software_name
                      ? getAvailableVersions(editSoftwareFormData.software_name, editSoftwareFormData.version).length === 0
                        ? 'Aucune version disponible'
                        : 'Sélectionner une version (optionnel)'
                      : 'Sélectionnez d\'abord un logiciel'}
                  </option>
                  {editSoftwareFormData.software_name &&
                    getAvailableVersions(editSoftwareFormData.software_name, editSoftwareFormData.version).map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date d'installation
                </label>
                <input
                  type="date"
                  value={editSoftwareFormData.installation_date || ''}
                  onChange={(e) => setEditSoftwareFormData({ ...editSoftwareFormData, installation_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clé de licence
              </label>
              <input
                type="text"
                value={editSoftwareFormData.license_key || ''}
                onChange={(e) => setEditSoftwareFormData({ ...editSoftwareFormData, license_key: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Clé de licence (optionnel)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={editSoftwareFormData.notes || ''}
                onChange={(e) => setEditSoftwareFormData({ ...editSoftwareFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                placeholder="Notes supplémentaires (optionnel)"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditSoftwareModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de confirmation de suppression de logiciel */}
      <ConfirmModal
        isOpen={isDeleteSoftwareModalOpen}
        onClose={() => {
          setIsDeleteSoftwareModalOpen(false)
          setSoftwareToDelete(null)
        }}
        onConfirm={handleDeleteSoftwareConfirm}
        title="Supprimer le logiciel installé"
        message={`Êtes-vous sûr de vouloir supprimer "${softwareToDelete?.software_name}" de cet actif ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default AssetDetails
