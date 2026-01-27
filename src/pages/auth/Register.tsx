import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Check, User } from 'lucide-react'
import { authService } from '../../services/authService'
import { departmentService, DepartmentDTO } from '../../services/departmentService'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
  })
  const [departments, setDepartments] = useState<DepartmentDTO[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Charger les départements actifs
  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true)
      try {
        const data = await departmentService.getActive() // Récupérer uniquement les départements actifs (route publique)
        if (data && Array.isArray(data)) {
          setDepartments(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des départements:', error)
        // Ne pas bloquer l'inscription si les départements ne peuvent pas être chargés
      } finally {
        setLoadingDepartments(false)
      }
    }
    loadDepartments()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.username || formData.username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        department_id: formData.departmentId ? parseInt(formData.departmentId) : undefined,
      })
      // Rediriger vers la page de connexion avec un message de succès
      navigate('/login', { state: { message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.' } })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'inscription'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Section gauche - Marketing */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 p-12 flex-col justify-center relative overflow-hidden">
        {/* Bulles décoratives */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-16 left-16 w-32 h-32 bg-primary-300/60 rounded-full blur-lg" 
            style={{ 
              animation: 'float 8s ease-in-out infinite',
              animationDelay: '0s'
            }}
          ></div>
          <div 
            className="absolute top-32 right-24 w-28 h-28 bg-primary-400/50 rounded-full blur-lg" 
            style={{ 
              animation: 'floatSlow 12s ease-in-out infinite',
              animationDelay: '1s'
            }}
          ></div>
          <div 
            className="absolute bottom-40 left-24 w-36 h-36 bg-primary-300/70 rounded-full blur-lg" 
            style={{ 
              animation: 'floatFast 6s ease-in-out infinite',
              animationDelay: '0.5s'
            }}
          ></div>
          <div 
            className="absolute bottom-24 right-16 w-30 h-30 bg-primary-400/55 rounded-full blur-lg" 
            style={{ 
              animation: 'float 8s ease-in-out infinite',
              animationDelay: '2s'
            }}
          ></div>
          <div 
            className="absolute top-1/3 right-1/4 w-24 h-24 bg-primary-300/50 rounded-full blur-lg" 
            style={{ 
              animation: 'floatSlow 12s ease-in-out infinite',
              animationDelay: '1.5s'
            }}
          ></div>
          <div 
            className="absolute bottom-1/3 left-1/3 w-26 h-26 bg-primary-400/60 rounded-full blur-lg" 
            style={{ 
              animation: 'floatFast 6s ease-in-out infinite',
              animationDelay: '0.8s'
            }}
          ></div>
          <div 
            className="absolute top-2/3 left-1/5 w-20 h-20 bg-primary-300/50 rounded-full blur-lg" 
            style={{ 
              animation: 'float 8s ease-in-out infinite',
              animationDelay: '2.5s'
            }}
          ></div>
          <div 
            className="absolute top-1/4 left-1/2 w-22 h-22 bg-primary-400/55 rounded-full blur-lg" 
            style={{ 
              animation: 'floatSlow 12s ease-in-out infinite',
              animationDelay: '1.2s'
            }}
          ></div>

          {/* Petites bulles supplémentaires */}
          <div 
            className="absolute top-8 right-12 w-9 h-9 bg-primary-300/55 rounded-full blur-md" 
            style={{ 
              animation: 'floatFast 7s ease-in-out infinite',
              animationDelay: '1.6s'
            }}
          ></div>
          <div 
            className="absolute bottom-12 left-8 w-7 h-7 bg-primary-400/60 rounded-full blur-sm" 
            style={{ 
              animation: 'floatSlow 11s ease-in-out infinite',
              animationDelay: '2.1s'
            }}
          ></div>
          <div 
            className="absolute top-1/2 left-10 w-6 h-6 bg-primary-300/60 rounded-full blur-sm" 
            style={{ 
              animation: 'float 9s ease-in-out infinite',
              animationDelay: '0.9s'
            }}
          ></div>
          <div 
            className="absolute bottom-1/4 right-6 w-8 h-8 bg-primary-400/70 rounded-full blur-sm" 
            style={{ 
              animation: 'floatFast 5s ease-in-out infinite',
              animationDelay: '1.3s'
            }}
          ></div>
        </div>
        
        {/* Contenu */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-primary-900 mb-4">
            Rejoignez-nous aujourd'hui
          </h1>
          <p className="text-primary-800 text-lg mb-8">
            Créez votre compte et commencez à optimiser la gestion du temps de votre équipe.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Inscription en 2 minutes</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Sécurité renforcée</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Support disponible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite - Formulaire */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-primary-900 p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-primary-500/30 transform transition-transform hover:scale-105">
                <div className="text-white text-center">
                  <div className="text-lg font-bold leading-tight">MCI</div>
                  <div className="text-xs font-semibold leading-tight mt-0.5 opacity-90">CARE CI</div>
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl opacity-20 blur-sm -z-10"></div>
            </div>
          </div>

          {/* Titre */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            Créer un compte
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Remplissez le formulaire pour commencer
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Nom d'utilisateur */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                NOM D'UTILISATEUR *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="jules"
                  autoComplete="off"
                  required
                  minLength={3}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 3 caractères</p>
            </div>

            {/* Nom */}
            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                NOM
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="jules"
                autoComplete="off"
              />
            </div>

            {/* Prénom */}
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                PRÉNOM
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="jules"
                autoComplete="off"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                ADRESSE EMAIL *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="jules@example.com"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                MOT DE PASSE *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                CONFIRMER LE MOT DE PASSE *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Département */}
            <div>
              <label htmlFor="departmentId" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                DÉPARTEMENT
              </label>
              {loadingDepartments ? (
                <div className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Chargement des départements...
                </div>
              ) : (
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Aucun département</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bouton d'inscription */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          {/* Lien vers connexion */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vous avez déjà un compte ?{' '}
              <Link
                to="/login"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
