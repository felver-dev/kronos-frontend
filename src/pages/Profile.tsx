import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mail,
  Phone,
  Calendar,
  Award,
  Loader2,
  Edit,
  Save,
  X,
  Lock,
  User,
  Building2,
  MapPin,
  LogIn,
  RefreshCw,
  Camera,
  Trash2,
} from 'lucide-react'
import { API_BASE_URL } from '../config/api'
import { userService, UserDTO } from '../services/userService'
import { ticketService } from '../services/ticketService'
import { useAuth } from '../contexts/AuthContext'
import { useToastContext } from '../contexts/ToastContext'
import Modal from '../components/Modal'

const Profile = () => {
  const toast = useToastContext()
  const { user: authUser, refreshUser } = useAuth()
  const [profileUser, setProfileUser] = useState<UserDTO | null>(null)
  const [recentAchievements, setRecentAchievements] = useState<
    Array<{ id: string; title: string; date: string; icon: typeof Award }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarObjectUrlRef = useRef<string | null>(null)

  const initials = useMemo(() => {
    const first = profileUser?.first_name?.[0] || ''
    const last = profileUser?.last_name?.[0] || ''
    const fallback = authUser?.firstName?.[0] || authUser?.lastName?.[0] || ''
    return (first || last) ? `${first}${last}` : fallback || '?'
  }, [profileUser, authUser])

  const formatRole = (role?: string) => {
    if (!role) return '—'
    return role.replace(/_/g, ' ').toLowerCase()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const buildAchievements = (resolved: number, efficiency: number) => {
    const achievements: Array<{ id: string; title: string; date: string; icon: typeof Award }> = []
    if (resolved >= 10) {
      achievements.push({ id: 'resolved-10', title: '10 tickets résolus', date: 'Objectif atteint', icon: Award })
    }
    if (resolved >= 50) {
      achievements.push({ id: 'resolved-50', title: '50 tickets résolus', date: 'Objectif atteint', icon: Award })
    }
    if (efficiency >= 90) {
      achievements.push({ id: 'efficiency-90', title: 'Efficacité > 90%', date: 'Objectif atteint', icon: Award })
    }
    return achievements
  }

  const loadProfile = async () => {
    if (!authUser?.id) return
    setLoading(true)
    setError(null)
    try {
      const userId = Number(authUser.id)
      const [userData, resolvedSummary, allSummary] = await Promise.all([
        userService.getById(userId),
        ticketService.getMyTickets(1, 1, 'cloture'),
        ticketService.getMyTickets(1, 1, 'all'),
      ])

      const resolvedCount = resolvedSummary.pagination.total ?? 0
      const totalCount = allSummary.pagination.total ?? 0
      const efficiency = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

      setProfileUser(userData)
      setRecentAchievements(buildAchievements(resolvedCount, efficiency))
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err)
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du profil'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [authUser?.id])

  // Révoquer l'URL objet au démontage du composant
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
    }
  }, [])

  // Charger l'image avatar via l'API (nécessite Authorization)
  useEffect(() => {
    if (!profileUser?.id || !profileUser?.avatar) {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
      setAvatarImageUrl(null)
      return
    }
    const id = profileUser.id
    const avatar = profileUser.avatar
    let cancelled = false

    const doFetch = async (retry = false): Promise<void> => {
      try {
        const token = sessionStorage.getItem('token')
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const res = await fetch(
          `${API_BASE_URL}/users/${id}/avatar?t=${encodeURIComponent(avatar)}`,
          { headers, cache: 'no-store' }
        )
        if (!res.ok) {
          if (retry) {
            if (!cancelled) setAvatarImageUrl(null)
            return
          }
          await new Promise((r) => setTimeout(r, 400))
          if (cancelled) return
          return doFetch(true)
        }
        if (cancelled) return
        const blob = await res.blob()
        if (cancelled) return
        if (avatarObjectUrlRef.current) {
          URL.revokeObjectURL(avatarObjectUrlRef.current)
          avatarObjectUrlRef.current = null
        }
        const u = URL.createObjectURL(blob)
        avatarObjectUrlRef.current = u
        setAvatarImageUrl(u)
      } catch {
        if (retry) {
          if (!cancelled) setAvatarImageUrl(null)
          return
        }
        await new Promise((r) => setTimeout(r, 400))
        if (cancelled) return
        return doFetch(true)
      }
    }

    doFetch()
    return () => {
      cancelled = true
      // Ne pas révoquer ici : on garde l'ancienne image affichée jusqu'à ce que la nouvelle soit prête
    }
  }, [profileUser?.id, profileUser?.avatar])

  const openEditModal = () => {
    setEditForm({
      first_name: profileUser?.first_name || authUser?.firstName || '',
      last_name: profileUser?.last_name || authUser?.lastName || '',
      email: profileUser?.email || authUser?.email || '',
      phone: profileUser?.phone || '',
    })
    setIsEditModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!authUser?.id) return
    if (!editForm.email?.trim()) {
      toast.error('L\'email est obligatoire')
      return
    }
    setIsSaving(true)
    try {
      const updated = await userService.update(Number(authUser.id), {
        first_name: editForm.first_name?.trim() || undefined,
        last_name: editForm.last_name?.trim() || undefined,
        email: editForm.email.trim(),
        phone: editForm.phone?.trim() || undefined,
      })
      toast.success('Profil mis à jour')
      setIsEditModalOpen(false)
      setProfileUser(updated)
      await refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  const openPasswordModal = () => {
    setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    setIsPasswordModalOpen(true)
  }

  const handlePasswordChange = async () => {
    if (!authUser?.id) return
    if (!passwordForm.old_password || !passwordForm.new_password) {
      toast.error('Renseignez le mot de passe actuel et le nouveau')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les deux mots de passe ne correspondent pas')
      return
    }
    setIsSaving(true)
    try {
      await userService.changePassword(Number(authUser.id), {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Mot de passe modifié')
      setIsPasswordModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !authUser?.id) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (JPG, PNG, GIF ou WebP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo')
      return
    }
    e.target.value = ''
    setIsUploadingAvatar(true)
    try {
      const updated = await userService.uploadAvatar(Number(authUser.id), file)
      setProfileUser(updated)
      await refreshUser()
      toast.success('Photo mise à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAvatarDelete = async () => {
    if (!authUser?.id || !profileUser?.avatar) return
    setIsUploadingAvatar(true)
    try {
      const updated = await userService.deleteAvatar(Number(authUser.id))
      setProfileUser(updated)
      await refreshUser()
      toast.success('Photo supprimée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        Chargement du profil...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mon profil</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Consultez et mettez à jour vos informations personnelles
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openEditModal} className="btn btn-primary inline-flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Modifier le profil
          </button>
          <button
            onClick={openPasswordModal}
            className="btn btn-secondary inline-flex items-center border border-gray-300 dark:border-gray-600 hover:border-amber-500/50 dark:hover:border-amber-400/50"
          >
            <Lock className="w-4 h-4 mr-2" />
            Changer le mot de passe
          </button>
        </div>
      </div>

      {error && (
        <div className="card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte identité */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                  {avatarImageUrl ? (
                    <img
                      src={avatarImageUrl}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-3xl">
                      {initials}
                    </span>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="flex justify-center gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Camera className="w-4 h-4" />
                    {profileUser?.avatar ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {profileUser?.avatar && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={isUploadingAvatar}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {profileUser?.first_name || authUser?.firstName || '—'}{' '}
                {profileUser?.last_name || authUser?.lastName || ''}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 capitalize">
                {formatRole(profileUser?.role)}
              </p>
              <span
                className={`mt-2 inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  profileUser?.is_active !== false
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {profileUser?.is_active !== false ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="pt-4 space-y-3">
              {profileUser?.department && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Département</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {profileUser.department.name}
                      {profileUser.department.code && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                          ({profileUser.department.code})
                        </span>
                      )}
                    </p>
                    {profileUser.department.office && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-4 h-4" />
                        {profileUser.department.office.name} – {profileUser.department.office.city}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détails & Réalisations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Informations du compte
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-gray-100 break-all">
                    {profileUser?.email || authUser?.email || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nom d&apos;utilisateur</p>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {profileUser?.username || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Téléphone</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {profileUser?.phone || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dernière connexion</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(profileUser?.last_login) || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Membre depuis</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDate(profileUser?.created_at) || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dernière mise à jour</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDate(profileUser?.updated_at) || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Réalisations
            </h3>
            {recentAchievements.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucune réalisation pour le moment. Les objectifs se débloquent avec l’activité sur les tickets.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAchievements.map((a) => {
                  const Icon = a.icon
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{a.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Édition */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier mon profil"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prénom
            </label>
            <input
              type="text"
              value={editForm.first_name}
              onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
              className="input w-full"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={editForm.last_name}
              onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
              className="input w-full"
              placeholder="Nom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              className="input w-full"
              placeholder="email@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              className="input w-full"
              placeholder="+33 6 12 34 56 78"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary inline-flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              disabled={isSaving}
              className="btn btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Mot de passe */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Changer le mot de passe"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe actuel <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.old_password}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, old_password: e.target.value }))
              }
              className="input w-full"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, new_password: e.target.value }))
              }
              className="input w-full"
              placeholder="Au moins 6 caractères"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))
              }
              className="input w-full"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="btn btn-secondary inline-flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Annuler
            </button>
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={
                isSaving ||
                !passwordForm.old_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="btn btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Lock className="w-4 h-4 mr-1" />
              )}
              Changer le mot de passe
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Profile
