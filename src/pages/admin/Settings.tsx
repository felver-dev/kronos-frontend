import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { settingsService } from '../../services/settingsService'
import { Bell, Shield, Mail, Save, AlertCircle } from 'lucide-react'
import { PermissionGuard } from '../../components/PermissionGuard'
import { AccessDenied } from '../../components/AccessDenied'

const Settings = () => {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('notifications')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, any>>({})

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'email', name: 'Email', icon: Mail },
  ]

  // Charger les paramètres au montage du composant
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const data = await settingsService.getAll()
        setSettings(data || {})
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Vérifier les permissions avant d'afficher la page
  const hasSettingsAccess = hasPermission('settings.view') || hasPermission('settings.update') || hasPermission('settings.manage')
  if (!hasSettingsAccess) {
    return <AccessDenied message="Vous n'avez pas la permission d'accéder aux paramètres" />
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convertir les paramètres en format plat pour l'API
      const settingsToSave: Record<string, any> = {}

      // Parcourir toutes les catégories et créer des clés plates
      Object.keys(settings).forEach((category) => {
        const categoryData = settings[category]
        if (typeof categoryData === 'object' && categoryData !== null) {
          Object.keys(categoryData).forEach((key) => {
            // Format: "category.key" ou juste "key" si pas de catégorie
            const fullKey = category !== 'general' ? `${category}.${key}` : key
            settingsToSave[fullKey] = categoryData[key]
          })
        } else {
          settingsToSave[category] = categoryData
        }
      })

      await settingsService.update(settingsToSave)
      alert('Paramètres enregistrés avec succès')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde des paramètres')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }))
  }

  // Fonction helper pour obtenir une valeur de paramètre avec valeur par défaut
  const getSetting = (category: string, key: string, defaultValue: any = '') => {
    return settings[category]?.[key] ?? defaultValue
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Paramètres</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Gérez les paramètres de l'application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar des onglets */}
        <div className="lg:col-span-1">
          <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Contenu */}
        <div className="lg:col-span-3 space-y-6">
          {/* Onglet Notifications */}
          {activeTab === 'notifications' && (
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Paramètres de notifications
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Notifications par email
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Activer les notifications par email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getSetting('notifications', 'emailEnabled', false)}
                        onChange={(e) => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ticket créé</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('notifications', 'ticketCreated', false)}
                          onChange={(e) => updateSetting('notifications', 'ticketCreated', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ticket assigné</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('notifications', 'ticketAssigned', false)}
                          onChange={(e) => updateSetting('notifications', 'ticketAssigned', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ticket résolu</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('notifications', 'ticketResolved', false)}
                          onChange={(e) => updateSetting('notifications', 'ticketResolved', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Sécurité */}
          {activeTab === 'security' && (
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Paramètres de sécurité
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Longueur minimale du mot de passe
                    </label>
                    <input
                      type="number"
                      value={getSetting('security', 'passwordMinLength', 8)}
                      onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      min="6"
                      max="20"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Exiger des majuscules</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('security', 'requireUppercase', false)}
                          onChange={(e) => updateSetting('security', 'requireUppercase', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Exiger des minuscules</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('security', 'requireLowercase', false)}
                          onChange={(e) => updateSetting('security', 'requireLowercase', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Exiger des chiffres</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('security', 'requireNumbers', false)}
                          onChange={(e) => updateSetting('security', 'requireNumbers', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Délai d'expiration de session (minutes)
                    </label>
                    <input
                      type="number"
                      value={getSetting('security', 'sessionTimeout', 30)}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      min="5"
                      max="480"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Email */}
          {activeTab === 'email' && (
            <div className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Configuration SMTP
                </h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Serveur SMTP
                      </label>
                      <input
                        type="text"
                        value={getSetting('email', 'smtpHost', '')}
                        onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Port SMTP
                      </label>
                      <input
                        type="number"
                        value={getSetting('email', 'smtpPort', 587)}
                        onChange={(e) => updateSetting('email', 'smtpPort', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Utilisateur SMTP
                    </label>
                    <input
                      type="text"
                      value={getSetting('email', 'smtpUser', '')}
                      onChange={(e) => updateSetting('email', 'smtpUser', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mot de passe SMTP
                    </label>
                    <input
                      type="password"
                      value={getSetting('email', 'smtpPassword', '')}
                      onChange={(e) => updateSetting('email', 'smtpPassword', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email expéditeur
                      </label>
                      <input
                        type="email"
                        value={getSetting('email', 'fromEmail', '')}
                        onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nom expéditeur
                      </label>
                      <input
                        type="text"
                        value={getSetting('email', 'fromName', '')}
                        onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de sauvegarde */}
          <PermissionGuard permissions={['settings.update', 'settings.manage']}>
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </PermissionGuard>
        </div>
      </div>
    </div>
  )
}

export default Settings
