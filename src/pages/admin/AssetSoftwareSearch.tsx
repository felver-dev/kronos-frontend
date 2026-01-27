import { useEffect, useState } from 'react'
import { Search, HardDrive, RefreshCw, Plus, Eye, Edit, Trash2, List } from 'lucide-react'
import { assetSoftwareService, type AssetSoftwareDTO, type AssetSoftwareStatisticsDTO, type CreateAssetSoftwareRequest, type UpdateAssetSoftwareRequest } from '../../services/assetSoftwareService'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { useToastContext } from '../../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { formatDate } from '../../utils/formatters'

const AssetSoftwareSearch = () => {
  const toast = useToastContext()
  const [activeTab, setActiveTab] = useState<'search' | 'list'>('search')
  
  // États pour la recherche
  const [softwareName, setSoftwareName] = useState('')
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(false)
  const [, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AssetSoftwareDTO[]>([])
  const [, setStats] = useState<AssetSoftwareStatisticsDTO | null>(null)
  
  // États pour la liste
  const [allSoftware, setAllSoftware] = useState<AssetSoftwareDTO[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  
  // États pour les options de recherche
  const [softwareOptionsLoading, setSoftwareOptionsLoading] = useState(false)
  const [softwareOptions, setSoftwareOptions] = useState<string[]>([])

  // Charger les options de logiciels pour le dropdown
  const loadSoftwareOptions = async () => {
    setSoftwareOptionsLoading(true)
    try {
      const data = await assetSoftwareService.getAll()
      // Extraire les noms uniques de tous les logiciels
      const uniqueNames = Array.from(new Set(data.map(s => s.software_name)))
        .sort((a, b) => a.localeCompare(b))
      setSoftwareOptions(uniqueNames)
    } catch (err) {
      console.error('Erreur lors du chargement des options de logiciels:', err)
      setSoftwareOptions([])
    } finally {
      setSoftwareOptionsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    loadSoftwareOptions()
  }, [])

  useEffect(() => {
    if (activeTab === 'list') {
      loadAllSoftware()
    }
  }, [activeTab])
  
  // États pour la création
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateAssetSoftwareRequest>({
    asset_id: undefined,
    software_name: '',
    version: '',
    license_key: '',
    notes: '',
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // États pour les détails/modification/suppression
  const [selectedSoftware, setSelectedSoftware] = useState<AssetSoftwareDTO | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<UpdateAssetSoftwareRequest>({
    software_name: '',
    version: '',
    license_key: '',
    notes: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const formatStatus = (status?: string): string => {
    if (!status) return '-'
    const map: Record<string, string> = {
      available: 'Disponible',
      in_use: 'En utilisation',
      maintenance: 'En maintenance',
      retired: 'Hors service',
    }
    return map[status] || status
  }

  // Calculer l'âge d'un logiciel installé en années et mois
  const calculateSoftwareAge = (installationDate?: string): string => {
    if (!installationDate) return '-'
    try {
      const installation = new Date(installationDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - installation.getTime())
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

  // Calculer l'âge d'un logiciel depuis sa date de création (achat)
  const calculatePurchaseAge = (createdDate?: string): string => {
    if (!createdDate) return '-'
    try {
      const created = new Date(createdDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - created.getTime())
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

  // Charger les statistiques pour alimenter la liste des logiciels
  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const data = await assetSoftwareService.getStatistics()
      setStats(data)
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques des logiciels:', err)
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  // Charger tous les logiciels
  const loadAllSoftware = async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await assetSoftwareService.getAll()
      setAllSoftware(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des logiciels:', err)
      setListError("Erreur lors du chargement des logiciels. Veuillez réessayer.")
      toast.error("Erreur lors du chargement des logiciels")
      setAllSoftware([])
    } finally {
      setListLoading(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!softwareName.trim()) {
      toast.error('Veuillez saisir ou sélectionner un logiciel')
      return
    }

    setLoading(true)
    setError(null)
    try {
      let data: AssetSoftwareDTO[]
      if (version.trim()) {
        data = await assetSoftwareService.getBySoftwareNameAndVersion(softwareName.trim(), version.trim())
      } else {
        data = await assetSoftwareService.getBySoftwareName(softwareName.trim())
      }
      setResults(Array.isArray(data) ? data : [])
      if (data.length === 0) {
        toast.info('Aucun actif trouvé pour ce logiciel')
      }
    } catch (err) {
      console.error('Erreur lors de la recherche de logiciels installés:', err)
      setError("Erreur lors de la recherche. Veuillez réessayer.")
      toast.error("Erreur lors de la recherche des actifs pour ce logiciel")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setSoftwareName('')
    setVersion('')
    setResults([])
    setError(null)
  }

  const handleCreateSoftware = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!createForm.software_name.trim()) {
      setCreateError("Le nom du logiciel est obligatoire.")
      return
    }

    setCreateLoading(true)
    try {
      await assetSoftwareService.create({
        ...createForm,
        asset_id: undefined,
        software_name: createForm.software_name.trim(),
        version: createForm.version?.trim() || undefined,
        license_key: createForm.license_key?.trim() || undefined,
        notes: createForm.notes?.trim() || undefined,
      })
      toast.success('Logiciel ajouté avec succès')
      setCreateForm({
        asset_id: undefined,
        software_name: '',
        version: '',
        license_key: '',
        notes: '',
      })
      setIsCreateModalOpen(false)
      loadStats()
      loadSoftwareOptions()
      if (activeTab === 'list') {
        loadAllSoftware()
      }
      if (softwareName.trim() && softwareName.trim().toLowerCase() === createForm.software_name.trim().toLowerCase()) {
        handleSearch()
      }
    } catch (err) {
      console.error('Erreur lors de la création du logiciel:', err)
      setCreateError("Erreur lors de l'ajout du logiciel. Veuillez réessayer.")
      toast.error("Erreur lors de l'ajout du logiciel")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleViewDetails = async (id: number) => {
    try {
      const software = await assetSoftwareService.getById(id)
      setSelectedSoftware(software)
      setIsDetailModalOpen(true)
    } catch (err) {
      console.error('Erreur lors de la récupération des détails:', err)
      toast.error("Erreur lors de la récupération des détails du logiciel")
    }
  }

  const handleEdit = (software: AssetSoftwareDTO) => {
    setSelectedSoftware(software)
    setEditForm({
      software_name: software.software_name,
      version: software.version || '',
      license_key: software.license_key || '',
      notes: software.notes || '',
    })
    setEditError(null)
    setIsEditModalOpen(true)
  }

  const handleUpdateSoftware = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSoftware) return

    setEditError(null)
    setEditLoading(true)
    try {
      await assetSoftwareService.update(selectedSoftware.id, {
        ...editForm,
        software_name: editForm.software_name?.trim() || undefined,
        version: editForm.version?.trim() || undefined,
        license_key: editForm.license_key?.trim() || undefined,
        notes: editForm.notes?.trim() || undefined,
      })
      toast.success('Logiciel modifié avec succès')
      setIsEditModalOpen(false)
      setSelectedSoftware(null)
      loadSoftwareOptions()
      if (activeTab === 'list') {
        loadAllSoftware()
      } else {
        handleSearch()
      }
    } catch (err) {
      console.error('Erreur lors de la modification du logiciel:', err)
      setEditError("Erreur lors de la modification du logiciel. Veuillez réessayer.")
      toast.error("Erreur lors de la modification du logiciel")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (software: AssetSoftwareDTO) => {
    setSelectedSoftware(software)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedSoftware) return

    setDeleteLoading(true)
    try {
      await assetSoftwareService.delete(selectedSoftware.id)
      toast.success('Logiciel supprimé avec succès')
      setIsDeleteModalOpen(false)
      setSelectedSoftware(null)
      loadSoftwareOptions()
      if (activeTab === 'list') {
        loadAllSoftware()
      } else {
        handleSearch()
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du logiciel:', err)
      toast.error("Erreur lors de la suppression du logiciel")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestion des logiciels</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ajoutez des logiciels installés sur des actifs et recherchez tous les ordinateurs / serveurs qui utilisent un logiciel donné.
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary inline-flex items-center justify-center text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un logiciel
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'search'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Recherche
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-5 h-5 inline mr-2" />
            Liste des logiciels
          </button>
        </nav>
      </div>

      {/* Contenu de l'onglet Recherche */}
      {activeTab === 'search' && (
        <>
          {/* Formulaire de recherche */}
          <div className="card">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logiciel <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={softwareName}
                        onChange={(e) => setSoftwareName(e.target.value)}
                        className="input pl-9 w-full appearance-none"
                      >
                        <option value="">{softwareOptionsLoading ? 'Chargement des logiciels...' : 'Sélectionner un logiciel'}</option>
                        {softwareOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11.0, 2021..."
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary inline-flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>
            </form>
          </div>

          {/* Résultats */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Résultats
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {results.length} actif{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
              </p>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {results.length === 0 && !loading && !error ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucune recherche encore effectuée ou aucun résultat. Saisissez un logiciel ci-dessus puis lancez une recherche.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Logiciel
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actif
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Propriétaire
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Âge
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acheté depuis
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.software_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.version || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {item.asset ? (
                            <Link
                              to={`/admin/assets/${item.asset.id}`}
                              className="text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {item.asset.name}
                            </Link>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Non associé</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.asset?.assigned_user
                            ? `${item.asset.assigned_user.first_name || ''} ${item.asset.assigned_user.last_name || ''}`.trim() ||
                              item.asset.assigned_user.username ||
                              item.asset.assigned_user.email
                            : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.asset?.category?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatStatus(item.asset?.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {calculateSoftwareAge(item.installation_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {calculatePurchaseAge(item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Contenu de l'onglet Liste */}
      {activeTab === 'list' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <List className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Tous les logiciels
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {allSoftware.length} logiciel{allSoftware.length > 1 ? 's' : ''}
            </p>
          </div>

          {listError && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{listError}</p>
            </div>
          )}

          {listLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des logiciels...</p>
            </div>
          ) : allSoftware.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun logiciel enregistré. Cliquez sur "Ajouter un logiciel" pour en créer un.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Logiciel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actif associé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date d'installation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {allSoftware.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.software_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.version || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {item.asset ? (
                          <Link
                            to={`/admin/assets/${item.asset.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {item.asset.name}
                          </Link>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Non associé</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.installation_date ? formatDate(item.installation_date) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(item.id)}
                            className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal création de logiciel */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateError(null)
          setCreateForm({
            asset_id: undefined,
            software_name: '',
            version: '',
            license_key: '',
            notes: '',
          })
        }}
        title="Ajouter un logiciel"
        size="lg"
      >
        <form onSubmit={handleCreateSoftware} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du logiciel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Windows 11, Office 365, Adobe Photoshop..."
                value={createForm.software_name}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    software_name: e.target.value,
                  }))
                }
                className="input w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Saisissez le nom du logiciel. Vous pourrez l'associer à un actif depuis la page de détails de l'actif.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version
              </label>
              <input
                type="text"
                placeholder="Ex: 11.0, 2021, 2024..."
                value={createForm.version || ''}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    version: e.target.value,
                  }))
                }
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clé de licence
            </label>
            <input
              type="text"
              placeholder="Clé de licence (optionnel)"
              value={createForm.license_key || ''}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  license_key: e.target.value,
                }))
              }
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              placeholder="Notes supplémentaires (optionnel)"
              value={createForm.notes || ''}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          {createError && (
            <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
          )}

          <div className="flex justify-end pt-2 gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createLoading || !createForm.software_name.trim()}
              className="btn btn-primary"
            >
              {createLoading ? 'Ajout...' : 'Ajouter le logiciel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal détails */}
      {selectedSoftware && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedSoftware(null)
          }}
          title={`Détails du logiciel: ${selectedSoftware.software_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du logiciel
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedSoftware.software_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Version
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedSoftware.version || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Clé de licence
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedSoftware.license_key || '-'}</p>
              </div>
              {selectedSoftware.asset && selectedSoftware.installation_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date d'installation sur l'actif
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedSoftware.installation_date)}
                  </p>
                </div>
              )}
              {selectedSoftware.asset && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Actif associé
                    </label>
                    <Link
                      to={`/admin/assets/${selectedSoftware.asset.id}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {selectedSoftware.asset.name}
                    </Link>
                  </div>
                  {selectedSoftware.asset.category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Catégorie de l'actif
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedSoftware.asset.category.name}</p>
                    </div>
                  )}
                  {selectedSoftware.asset.assigned_user && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Utilisateur assigné
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {selectedSoftware.asset.assigned_user.first_name && selectedSoftware.asset.assigned_user.last_name
                          ? `${selectedSoftware.asset.assigned_user.first_name} ${selectedSoftware.asset.assigned_user.last_name}`
                          : selectedSoftware.asset.assigned_user.username || selectedSoftware.asset.assigned_user.email}
                      </p>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de création
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedSoftware.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dernière modification
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedSoftware.updated_at)}</p>
              </div>
            </div>
            {selectedSoftware.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedSoftware.notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false)
                  setSelectedSoftware(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal modification */}
      {selectedSoftware && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedSoftware(null)
            setEditError(null)
          }}
          title={`Modifier le logiciel: ${selectedSoftware.software_name}`}
          size="lg"
        >
          <form onSubmit={handleUpdateSoftware} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du logiciel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.software_name || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      software_name: e.target.value,
                    }))
                  }
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={editForm.version || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={editForm.version || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, version: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clé de licence
                </label>
                <input
                  type="text"
                  value={editForm.license_key || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, license_key: e.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                value={editForm.notes || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            {editError && (
              <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
            )}

            <div className="flex justify-end pt-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedSoftware(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editLoading || !editForm.software_name?.trim()}
                className="btn btn-primary"
              >
                {editLoading ? 'Modification...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de suppression */}
      {selectedSoftware && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setSelectedSoftware(null)
          }}
          onConfirm={handleDeleteConfirm}
          title="Supprimer le logiciel"
          message={`Êtes-vous sûr de vouloir supprimer le logiciel "${selectedSoftware.software_name}"${selectedSoftware.version ? ` (version ${selectedSoftware.version})` : ''} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteLoading}
        />
      )}
    </div>
  )
}

export default AssetSoftwareSearch
