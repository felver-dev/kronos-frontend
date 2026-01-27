import { useState, useEffect } from 'react'
import { Shield, Plus, Search, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { slaService, CreateSLARequest, UpdateSLARequest, SLADTO, SLAComplianceDTO, SLAViolationDTO } from '../../services/slaService'
import { ticketCategoryService, TicketCategoryDTO } from '../../services/ticketCategoryService'
import { useToastContext } from '../../contexts/ToastContext'
import { formatDate } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGuard } from '../../components/PermissionGuard'

const SLA = () => {
  const toast = useToastContext()
  const { hasPermission } = useAuth()
  const [slas, setSlas] = useState<SLADTO[]>([])
  const [categories, setCategories] = useState<TicketCategoryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false)
  const [isViolationsModalOpen, setIsViolationsModalOpen] = useState(false)
  const [slaToEdit, setSlaToEdit] = useState<SLADTO | null>(null)
  const [slaToDelete, setSlaToDelete] = useState<SLADTO | null>(null)
  const [slaToView, setSlaToView] = useState<SLADTO | null>(null)
  const [complianceData, setComplianceData] = useState<SLAComplianceDTO | null>(null)
  const [violationsData, setViolationsData] = useState<SLAViolationDTO[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateSLARequest>({
    name: '',
    description: '',
    ticket_category: '' as CreateSLARequest['ticket_category'],
    priority: undefined,
    target_time: 60,
    unit: 'minutes',
    is_active: true,
  })
  const [editFormData, setEditFormData] = useState<UpdateSLARequest>({
    name: '',
    description: '',
    target_time: undefined,
    unit: undefined,
    is_active: undefined,
  })

  // Charger les SLA
  const loadSLAs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await slaService.getAll()
      setSlas(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des SLA:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des SLA')
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des SLA')
      setSlas([])
    } finally {
      setLoading(false)
    }
  }

  // Charger les catégories de tickets
  const loadCategories = async () => {
    try {
      const data = await ticketCategoryService.getAll(true) // Récupérer uniquement les catégories actives
      const categoriesData = Array.isArray(data) ? data : []
      setCategories(categoriesData)
      // Si aucune catégorie n'est sélectionnée et qu'il y a des catégories, sélectionner la première
      if (categoriesData.length > 0 && !createFormData.ticket_category) {
        setCreateFormData((prev) => ({
          ...prev,
          ticket_category: categoriesData[0].slug as CreateSLARequest['ticket_category'],
        }))
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err)
      toast.error('Erreur lors du chargement des catégories de tickets')
    }
  }

  useEffect(() => {
    // Vérifier les permissions avant de charger les données
    if (!hasPermission?.('sla.view') && !hasPermission?.('sla.create') && !hasPermission?.('sla.update') && !hasPermission?.('sla.delete') && !hasPermission?.('sla.manage')) {
      setError('Vous n\'avez pas la permission de voir les SLA')
      setLoading(false)
      return
    }
    loadSLAs()
    loadCategories()
  }, [hasPermission])

  // Filtrer les SLA
  const filteredSLAs = slas.filter((sla) => {
    const matchesSearch =
      sla.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sla.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || sla.ticket_category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Statistiques
  const stats = {
    total: slas.length,
    active: slas.filter((s) => s.is_active).length,
    inactive: slas.filter((s) => !s.is_active).length,
  }

  // Badge de catégorie
  const getCategoryBadge = (categorySlug: string) => {
    // Trouver la catégorie correspondante pour obtenir sa couleur
    const category = categories.find((cat) => cat.slug === categorySlug)
    if (category && category.color) {
      const colorMap: Record<string, string> = {
        red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      }
      return colorMap[category.color] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
    // Fallback si pas de couleur définie
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  // Obtenir le nom de la catégorie depuis son slug
  const getCategoryName = (categorySlug: string) => {
    const category = categories.find((cat) => cat.slug === categorySlug)
    return category ? category.name : categorySlug
  }

  // Formater le temps cible
  const formatTargetTime = (time: number, unit: string) => {
    if (unit === 'minutes') {
      if (time < 60) return `${time} min`
      const hours = Math.floor(time / 60)
      const minutes = time % 60
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
    }
    if (unit === 'hours') {
      if (time < 24) return `${time}h`
      const days = Math.floor(time / 24)
      const hours = time % 24
      return hours > 0 ? `${days}j ${hours}h` : `${days}j`
    }
    if (unit === 'days') {
      return `${time} jour${time > 1 ? 's' : ''}`
    }
    return `${time} ${unit}`
  }

  // Créer un SLA
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission?.('sla.create') && !hasPermission?.('sla.manage')) {
      toast.error('Vous n\'avez pas la permission de créer un SLA')
      return
    }
    
    if (!createFormData.name.trim()) {
      toast.error('Le nom du SLA est requis')
      return
    }
    setIsSubmitting(true)
    try {
      await slaService.create(createFormData)
      toast.success('SLA créé avec succès')
      setIsCreateModalOpen(false)
      setCreateFormData({
        name: '',
        description: '',
        ticket_category: (categories.length > 0 ? categories[0].slug : '') as CreateSLARequest['ticket_category'],
        priority: undefined,
        target_time: 60,
        unit: 'minutes',
        is_active: true,
      })
      loadSLAs()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création du SLA')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal d'édition
  const handleOpenEditModal = (sla: SLADTO) => {
    // Vérifier les permissions avant d'ouvrir le modal
    if (!hasPermission?.('sla.update') && !hasPermission?.('sla.manage')) {
      toast.error('Vous n\'avez pas la permission de modifier un SLA')
      return
    }
    
    setSlaToEdit(sla)
    setEditFormData({
      name: sla.name,
      description: sla.description || '',
      target_time: sla.target_time,
      unit: sla.unit as 'minutes' | 'hours' | 'days',
      is_active: sla.is_active,
    })
    setIsEditModalOpen(true)
  }

  // Mettre à jour un SLA
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission?.('sla.update') && !hasPermission?.('sla.manage')) {
      toast.error('Vous n\'avez pas la permission de modifier un SLA')
      return
    }
    
    if (!slaToEdit || !editFormData.name?.trim()) {
      toast.error('Le nom du SLA est requis')
      return
    }
    setIsSubmitting(true)
    try {
      await slaService.update(slaToEdit.id, editFormData)
      toast.success('SLA mis à jour avec succès')
      setIsEditModalOpen(false)
      setSlaToEdit(null)
      loadSLAs()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du SLA')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal de suppression
  const handleDeleteClick = (sla: SLADTO) => {
    // Vérifier les permissions avant d'ouvrir le modal
    if (!hasPermission?.('sla.delete') && !hasPermission?.('sla.manage')) {
      toast.error('Vous n\'avez pas la permission de supprimer un SLA')
      return
    }
    
    setSlaToDelete(sla)
    setIsDeleteModalOpen(true)
  }

  // Confirmer la suppression
  const handleDeleteConfirm = async () => {
    if (!slaToDelete) return
    
    // Vérifier les permissions avant d'exécuter l'action
    if (!hasPermission?.('sla.delete') && !hasPermission?.('sla.manage')) {
      toast.error('Vous n\'avez pas la permission de supprimer un SLA')
      setIsDeleteModalOpen(false)
      setSlaToDelete(null)
      return
    }
    
    setIsSubmitting(true)
    try {
      await slaService.delete(slaToDelete.id)
      toast.success('SLA supprimé avec succès')
      setIsDeleteModalOpen(false)
      setSlaToDelete(null)
      loadSLAs()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression du SLA')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ouvrir le modal de détails
  const handleOpenDetailsModal = async (sla: SLADTO) => {
    setSlaToView(sla)
    setIsDetailsModalOpen(true)
  }

  // Ouvrir le modal de conformité
  const handleOpenComplianceModal = async (sla: SLADTO) => {
    setSlaToView(sla)
    setComplianceData(null)
    setIsComplianceModalOpen(true)
    try {
      const data = await slaService.getCompliance(sla.id)
      setComplianceData(data)
    } catch (err) {
      console.error('Erreur lors du chargement de la conformité:', err)
      toast.error('Erreur lors du chargement de la conformité')
    }
  }

  // Ouvrir le modal de violations
  const handleOpenViolationsModal = async (sla: SLADTO) => {
    setSlaToView(sla)
    setViolationsData([])
    setIsViolationsModalOpen(true)
    try {
      const data = await slaService.getViolations(sla.id)
      setViolationsData(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des violations:', err)
      toast.error('Erreur lors du chargement des violations')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des SLA...</span>
      </div>
    )
  }

  // Vérifier les permissions avant d'afficher la page
  if (!hasPermission?.('sla.view') && !hasPermission?.('sla.create') && !hasPermission?.('sla.update') && !hasPermission?.('sla.delete') && !hasPermission?.('sla.manage')) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span>Vous n'avez pas la permission de voir les SLA</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SLA (Service Level Agreement)</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600 dark:text-gray-300">Définissez et suivez les délais cibles</p>
            <button
              onClick={() => setIsInfoModalOpen(!isInfoModalOpen)}
              className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center flex-shrink-0"
              title="Qu'est-ce qu'un SLA ?"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <PermissionGuard permissions={['sla.create', 'sla.manage']}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau SLA
          </button>
        </PermissionGuard>
      </div>

      {isInfoModalOpen && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-2">Qu'est-ce qu'un SLA ?</p>
              <p className="whitespace-pre-line">
                Un SLA (Service Level Agreement) est un accord qui définit les délais cibles de traitement pour différents types de tickets.
                {'\n\n'}Caractéristiques principales :
                {'\n'}• Catégorie de ticket : Incident, Demande, Changement, Développement
                {'\n'}• Priorité : Peut être spécifique à une priorité ou s'appliquer à toutes
                {'\n'}• Temps cible : Délai maximum pour répondre ou résoudre (en minutes, heures ou jours)
                {'\n'}• Statut actif : Permet d'activer ou désactiver un SLA
                {'\n\n'}Exemples :
                {'\n'}• Incident critique : Résolution en 1 heure
                {'\n'}• Demande standard : Traitement en 24 heures
                {'\n'}• Changement à risque élevé : Validation en 72 heures
                {'\n\n'}Les SLA permettent de mesurer la performance du service IT et d'identifier les violations de délais.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total SLA</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Actifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Inactifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.inactive}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un SLA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des SLA */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Délai cible
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
              {filteredSLAs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun SLA trouvé
                  </td>
                </tr>
              ) : (
                filteredSLAs.map((sla) => (
                  <tr key={sla.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sla.name}</p>
                        {sla.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{sla.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getCategoryBadge(sla.ticket_category)}`}>
                        {getCategoryName(sla.ticket_category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(() => {
                        if (!sla.priority) return 'Toutes'
                        const priorityMap: Record<string, string> = {
                          faible: 'Faible',
                          normale: 'Normale',
                          elevee: 'Élevée',
                          critique: 'Critique',
                          low: 'Faible',
                          medium: 'Moyenne',
                          normal: 'Normale',
                          high: 'Élevée',
                          critical: 'Critique',
                        }
                        return priorityMap[sla.priority.toLowerCase()] || sla.priority
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatTargetTime(sla.target_time, sla.unit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sla.is_active ? (
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
                        <button
                          onClick={() => handleOpenDetailsModal(sla)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          title="Voir détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenComplianceModal(sla)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Conformité"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenViolationsModal(sla)}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                          title="Violations"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                        <PermissionGuard permissions={['sla.update', 'sla.manage']} showMessage={false}>
                          <button
                            onClick={() => handleOpenEditModal(sla)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permissions={['sla.delete', 'sla.manage']} showMessage={false}>
                          <button
                            onClick={() => handleDeleteClick(sla)}
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
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateFormData({
            name: '',
            description: '',
            ticket_category: (categories.length > 0 ? categories[0].slug : '') as CreateSLARequest['ticket_category'],
            priority: undefined,
            target_time: 60,
            unit: 'minutes',
            is_active: true,
          })
        }}
        title="Nouveau SLA"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
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
              placeholder="Nom du SLA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              rows={3}
              className="input"
              placeholder="Description du SLA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Catégorie de ticket <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={createFormData.ticket_category}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    ticket_category: e.target.value as CreateSLARequest['ticket_category'],
                  })
                }
                className="input"
                disabled={categories.length === 0}
              >
                {categories.length === 0 ? (
                  <option value="">Chargement des catégories...</option>
                ) : (
                  <>
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorité</label>
              <select
                value={createFormData.priority || ''}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    priority: e.target.value ? (e.target.value as CreateSLARequest['priority']) : undefined,
                  })
                }
                className="input"
              >
                <option value="">Toutes les priorités</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temps cible <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={createFormData.target_time}
                onChange={(e) => setCreateFormData({ ...createFormData, target_time: parseInt(e.target.value) })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unité</label>
              <select
                value={createFormData.unit}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    unit: e.target.value as CreateSLARequest['unit'],
                  })
                }
                className="input"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Heures</option>
                <option value="days">Jours</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={createFormData.is_active}
              onChange={(e) => setCreateFormData({ ...createFormData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">SLA actif</label>
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
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Création...' : 'Créer le SLA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition */}
      {slaToEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSlaToEdit(null)
          }}
          title={`Modifier le SLA: ${slaToEdit.name}`}
          size="md"
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
                className="input"
                placeholder="Nom du SLA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="input"
                placeholder="Description du SLA"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temps cible <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editFormData.target_time}
                  onChange={(e) => setEditFormData({ ...editFormData, target_time: parseInt(e.target.value) })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unité</label>
                <select
                  value={editFormData.unit}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      unit: e.target.value as 'minutes' | 'hours' | 'days',
                    })
                  }
                  className="input"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Heures</option>
                  <option value="days">Jours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editFormData.is_active !== undefined ? editFormData.is_active : slaToEdit.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">SLA actif</label>
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
          setSlaToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le SLA"
        message={`Êtes-vous sûr de vouloir supprimer le SLA "${slaToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        isLoading={isSubmitting}
      />

      {/* Modal de détails */}
      {slaToView && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSlaToView(null)
          }}
          title={`Détails du SLA: ${slaToView.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nom</p>
              <p className="text-gray-900 dark:text-gray-100">{slaToView.name}</p>
            </div>
            {slaToView.description && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-gray-900 dark:text-gray-100">{slaToView.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Catégorie</p>
                <span className={`badge ${getCategoryBadge(slaToView.ticket_category)}`}>
                  {getCategoryName(slaToView.ticket_category)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Priorité</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {(() => {
                    if (!slaToView.priority) return 'Toutes'
                    const priorityMap: Record<string, string> = {
                      faible: 'Faible',
                      normale: 'Normale',
                      elevee: 'Élevée',
                      critique: 'Critique',
                      low: 'Faible',
                      medium: 'Moyenne',
                      normal: 'Normale',
                      high: 'Élevée',
                      critical: 'Critique',
                    }
                    return priorityMap[slaToView.priority.toLowerCase()] || slaToView.priority
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Délai cible</p>
                <p className="text-gray-900 dark:text-gray-100">{formatTargetTime(slaToView.target_time, slaToView.unit)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Statut</p>
                {slaToView.is_active ? (
                  <span className="badge bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                    Actif
                  </span>
                ) : (
                  <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    Inactif
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(slaToView.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Modifié le</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(slaToView.updated_at)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de conformité */}
      {slaToView && (
        <Modal
          isOpen={isComplianceModalOpen}
          onClose={() => {
            setIsComplianceModalOpen(false)
            setSlaToView(null)
            setComplianceData(null)
          }}
          title={`Conformité du SLA: ${slaToView.name}`}
          size="lg"
        >
          {complianceData ? (
            <div className="space-y-4">
              <div className="card bg-blue-50 dark:bg-blue-900/20">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taux de conformité</p>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {complianceData.compliance_rate.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total tickets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{complianceData.total_tickets}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conformes</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{complianceData.compliant}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Violations</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{complianceData.violations}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de la conformité...</span>
            </div>
          )}
        </Modal>
      )}

      {/* Modal de violations */}
      {slaToView && (
        <Modal
          isOpen={isViolationsModalOpen}
          onClose={() => {
            setIsViolationsModalOpen(false)
            setSlaToView(null)
            setViolationsData([])
          }}
          title={`Violations du SLA: ${slaToView.name}`}
          size="lg"
        >
          {violationsData.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucune violation enregistrée</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Ticket ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Temps de violation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Date de violation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {violationsData.map((violation) => (
                      <tr key={violation.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          #{violation.ticket_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {violation.violation_time} {violation.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(violation.violated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export default SLA
