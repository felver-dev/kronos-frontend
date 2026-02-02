import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HardDrive, Plus, Search, Eye, Edit, Trash2, Server, Laptop, Printer, Monitor, AlertCircle, Loader2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { assetService, CreateAssetRequest, AssetDTO, AssetCategoryDTO, UpdateAssetRequest, AssetInventoryDTO } from '../../services/assetService'
import { officeService, type OfficeDTO } from '../../services/officeService'
import { useToastContext } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { AccessDenied } from '../../components/AccessDenied'
import { PermissionGuard } from '../../components/PermissionGuard'

const Assets = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all')
  const [dateFilterFrom, setDateFilterFrom] = useState<string>('')
  const [dateFilterTo, setDateFilterTo] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<AssetDTO | null>(null)
  const [assetToEdit, setAssetToEdit] = useState<AssetDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [assets, setAssets] = useState<AssetDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<AssetInventoryDTO | null>(null)
  const [categories, setCategories] = useState<AssetCategoryDTO[]>([])
  const [offices, setOffices] = useState<OfficeDTO[]>([])
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | ''>('')
  const [selectedEditOfficeId, setSelectedEditOfficeId] = useState<number | ''>('')
  const [formData, setFormData] = useState<CreateAssetRequest>({
    name: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    category_id: 0,
    status: 'available',
  })
  const [editFormData, setEditFormData] = useState<UpdateAssetRequest>({
    name: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    status: 'available',
    location: '',
    notes: '',
  })

  // Charger les actifs et l'inventaire
  const loadAssets = async () => {
    // Vérifier les permissions avant de charger les données
    if (!hasPermission?.('assets.view_all') && !hasPermission?.('assets.view_team') && !hasPermission?.('assets.view_own')) {
      setError('Vous n\'avez pas la permission de voir les actifs')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [assetsData, inventoryData] = await Promise.all([
        assetService.getAll(),
        assetService.getInventory(),
      ])
      // S'assurer que assetsData est toujours un tableau
      setAssets(Array.isArray(assetsData) ? assetsData : [])
      setInventory(inventoryData || null)
    } catch (err) {
      console.error('Erreur lors du chargement des actifs:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des actifs')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des actifs')
      setAssets([]) // S'assurer que assets est toujours un tableau
    } finally {
      setLoading(false)
    }
  }

  // Charger les catégories
  const loadCategories = async () => {
    try {
      const categoriesData = await assetService.getCategories()
      setCategories(categoriesData)
      if (categoriesData.length > 0 && formData.category_id === 0) {
        setFormData((prev) => ({ ...prev, category_id: categoriesData[0].id }))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error)
      toast.error('Erreur lors du chargement des catégories')
      setCategories([]) // S'assurer que categories est toujours un tableau
    }
  }

  // Charger les sièges (offices) pour la localisation des actifs
  const loadOffices = async () => {
    try {
      const data = await officeService.getAll(true)
      setOffices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des sièges:', error)
      toast.error('Erreur lors du chargement des sièges')
      setOffices([])
    }
  }

  useEffect(() => {
    loadAssets()
    loadCategories()
    loadOffices()
  }, [])

  // Calculer l'âge d'un actif en années
  const calculateAssetAge = (purchaseDate?: string): string => {
    if (!purchaseDate) return '-'
    try {
      const purchase = new Date(purchaseDate)
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
  }

  // Filtrer les actifs
  const filteredAssets = (assets || []).filter((asset) => {
    // Filtre par recherche textuelle
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtre par catégorie
    const matchesCategory = categoryFilter === 'all' || asset.category_id === categoryFilter

    // Filtre par statut
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter

    // Filtre par date d'achat
    let matchesDate = true
    if (dateFilterFrom || dateFilterTo) {
      if (!asset.purchase_date) {
        matchesDate = false
      } else {
        const purchaseDate = new Date(asset.purchase_date)
        if (dateFilterFrom) {
          const fromDate = new Date(dateFilterFrom)
          if (purchaseDate < fromDate) matchesDate = false
        }
        if (dateFilterTo) {
          const toDate = new Date(dateFilterTo)
          toDate.setHours(23, 59, 59, 999) // Inclure toute la journée
          if (purchaseDate > toDate) matchesDate = false
        }
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDate
  })

  // Obtenir l'icône selon la catégorie
  const getAssetIcon = (categoryName?: string) => {
    if (!categoryName) return <HardDrive className="w-5 h-5" />
    const name = categoryName.toLowerCase()
    if (name.includes('serveur')) return <Server className="w-5 h-5" />
    if (name.includes('ordinateur') || name.includes('laptop') || name.includes('pc')) return <Laptop className="w-5 h-5" />
    if (name.includes('imprimante') || name.includes('printer')) return <Printer className="w-5 h-5" />
    if (name.includes('écran') || name.includes('monitor')) return <Monitor className="w-5 h-5" />
    return <HardDrive className="w-5 h-5" />
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

  // Créer un actif
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.category_id === 0) {
      toast.error('Veuillez sélectionner une catégorie')
      return
    }
    setIsSubmitting(true)
    try {
      await assetService.create(formData)
      toast.success('Actif créé avec succès')
      setIsModalOpen(false)
      setFormData({
        name: '',
        serial_number: '',
        model: '',
        manufacturer: '',
        category_id: categories[0]?.id || 0,
        status: 'available',
      })
      loadAssets()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la création de l\'actif')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition
  const handleOpenEditModal = (asset: AssetDTO) => {
    setAssetToEdit(asset)
    
    // Essayer de trouver le siège correspondant à la localisation actuelle
    let matchingOfficeId: number | '' = ''
    if (asset.location && offices.length > 0) {
      const matchingOffice = offices.find(office => {
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

  // Mettre à jour un actif
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetToEdit) return
    setIsSubmitting(true)
    try {
      await assetService.update(assetToEdit.id, editFormData)
      toast.success('Actif mis à jour avec succès')
      setIsEditModalOpen(false)
      setAssetToEdit(null)
      loadAssets()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la mise à jour de l\'actif')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Supprimer un actif
  const handleDeleteClick = (asset: AssetDTO) => {
    setAssetToDelete(asset)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return
    try {
      await assetService.delete(assetToDelete.id)
      toast.success('Actif supprimé avec succès')
      setIsDeleteModalOpen(false)
      setAssetToDelete(null)
      loadAssets()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors de la suppression de l\'actif')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission?.('assets.view_all') && !hasPermission?.('assets.view_team') && !hasPermission?.('assets.view_own')) {
    return <AccessDenied message="Vous n'avez pas la permission de voir les actifs" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Actifs IT</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Gérez tous les actifs informatiques</p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Qu'est-ce qu'un actif IT ?"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center w-full sm:w-auto flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base font-medium rounded-lg bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="truncate">Nouvel actif</span>
        </button>
      </div>

      {/* Note d'explication en dessous du header pour ne pas déranger le bouton */}
      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'un actif IT ?</p>
              <p className="whitespace-pre-line">
                Un actif IT est un élément matériel ou logiciel de l'infrastructure informatique de l'entreprise.
                {'\n\n'}Types d'actifs :
                {'\n'}• Serveurs, ordinateurs, imprimantes, écrans
                {'\n'}• Logiciels et licences
                {'\n'}• Équipements réseau
                {'\n'}• Périphériques et accessoires
                {'\n\n'}Informations suivies :
                {'\n'}• Numéro de série, modèle, fabricant
                {'\n'}• Catégorie et localisation
                {'\n'}• Statut (Disponible, En utilisation, En maintenance, Hors service)
                {'\n'}• Dates d'achat et expiration de garantie
                {'\n'}• Assignation à un utilisateur ou service
                {'\n\n'}La gestion des actifs permet de suivre l'inventaire, optimiser l'utilisation et planifier les remplacements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap lg:items-end">
          {/* Recherche */}
          <div className="relative sm:col-span-2 lg:col-span-none lg:flex-1 lg:min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher un actif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Catégorie */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="block w-full min-w-0 lg:w-48 xl:w-56 px-3 py-2.5 pr-10 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent cursor-pointer text-sm sm:text-base appearance-none"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Statut */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full min-w-0 lg:w-48 xl:w-56 px-3 py-2.5 pr-10 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent cursor-pointer text-sm sm:text-base appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="in_use">En utilisation</option>
              <option value="maintenance">En maintenance</option>
              <option value="retired">Hors service</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Dates d'achat */}
          <div className="flex flex-col sm:flex-row gap-2 sm:col-span-2 lg:col-span-none">
            <input
              type="date"
              value={dateFilterFrom}
              onChange={(e) => setDateFilterFrom(e.target.value)}
              placeholder="Date d'achat (début)"
              className="block w-full min-w-0 sm:w-40 px-3 py-2.5 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent text-sm sm:text-base"
            />
            <input
              type="date"
              value={dateFilterTo}
              onChange={(e) => setDateFilterTo(e.target.value)}
              placeholder="Date d'achat (fin)"
              className="block w-full min-w-0 sm:w-40 px-3 py-2.5 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent text-sm sm:text-base"
            />
            {(dateFilterFrom || dateFilterTo) && (
              <button
                onClick={() => {
                  setDateFilterFrom('')
                  setDateFilterTo('')
                }}
                className="px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                title="Réinitialiser les dates"
              >
                ✕ Dates
              </button>
            )}
          </div>

          {/* Bouton Réinitialiser */}
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setCategoryFilter('all')
              setStatusFilter('all')
              setDateFilterFrom('')
              setDateFilterTo('')
            }}
            className="inline-flex items-center justify-center w-full sm:w-auto flex-shrink-0 px-3 py-2.5 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors text-sm sm:text-base"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des actifs */}
      <div className="card overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numéro de série
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Âge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigné à
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'Aucun actif trouvé' : 'Aucun actif enregistré'}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          {getAssetIcon(asset.category?.name)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {asset.manufacturer} {asset.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {asset.category?.name || 'Non catégorisé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{asset.serial_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusBadge(asset.status)}`}>
                        {formatStatus(asset.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{asset.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {calculateAssetAge(asset.purchase_date)}
                      </div>
                      {asset.purchase_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Acheté le {new Date(asset.purchase_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {asset.assigned_user
                          ? `${asset.assigned_user.first_name || ''} ${asset.assigned_user.last_name || ''}`.trim() || asset.assigned_user.username || asset.assigned_user.email
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/assets/${asset.id}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          title="Voir"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <PermissionGuard permission="assets.update">
                          <button
                            onClick={() => handleOpenEditModal(asset)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="assets.delete">
                          <button
                            onClick={() => handleDeleteClick(asset)}
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
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setFormData({
            name: '',
            serial_number: '',
            model: '',
            manufacturer: '',
            category_id: categories[0]?.id || 0,
            status: 'available',
          })
        }}
        title="Nouvel actif"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Nom de l'actif"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro de série
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modèle
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value={0}>Sélectionner une catégorie</option>
                {categories.map((category) => (
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
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as CreateAssetRequest['status'],
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
                value={selectedOfficeId}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setSelectedOfficeId('')
                    setFormData({ ...formData, location: '' })
                    return
                  }
                  const id = parseInt(value, 10)
                  setSelectedOfficeId(id)
                  const office = offices.find((o) => o.id === id)
                  const label = office ? `${office.name} (${office.city})` : ''
                  setFormData({ ...formData, location: label })
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
                value={formData.purchase_date || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
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
                value={formData.warranty_expiry || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
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
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Notes supplémentaires"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.category_id === 0}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer l\'actif'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setAssetToEdit(null)
          setSelectedEditOfficeId('')
        }}
        title="Modifier l'actif"
        size="lg"
      >
        {assetToEdit && (
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
                  {categories.map((category) => (
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
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setAssetToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'actif"
        message={`Êtes-vous sûr de vouloir supprimer l'actif "${assetToDelete?.name}" ? Cette action est irréversible.`}
      />
    </div>
  )
}

export default Assets
