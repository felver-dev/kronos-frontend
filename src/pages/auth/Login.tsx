import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      // Redirection vers le portail unifié
      navigate('/app/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email ou mot de passe incorrect'
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
          <div className="absolute top-16 left-16 w-32 h-32 bg-primary-300/60 rounded-full blur-lg" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0s' }}></div>
          <div className="absolute top-32 right-24 w-28 h-28 bg-primary-400/50 rounded-full blur-lg" style={{ animation: 'floatSlow 6s ease-in-out infinite', animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-40 left-24 w-36 h-36 bg-primary-300/70 rounded-full blur-lg" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '0.25s' }}></div>
          <div className="absolute bottom-24 right-16 w-30 h-30 bg-primary-400/55 rounded-full blur-lg" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '1s' }}></div>
          <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-primary-300/50 rounded-full blur-lg" style={{ animation: 'floatSlow 6s ease-in-out infinite', animationDelay: '0.75s' }}></div>
          <div className="absolute bottom-1/3 left-1/3 w-26 h-26 bg-primary-400/60 rounded-full blur-lg" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '0.4s' }}></div>
          <div className="absolute top-2/3 left-1/5 w-20 h-20 bg-primary-300/50 rounded-full blur-lg" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '1.25s' }}></div>
          <div className="absolute top-1/4 left-1/2 w-22 h-22 bg-primary-400/55 rounded-full blur-lg" style={{ animation: 'floatSlow 6s ease-in-out infinite', animationDelay: '0.6s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-primary-300/55 rounded-full blur-lg" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.2s' }}></div>
          <div className="absolute bottom-1/2 left-1/4 w-24 h-24 bg-primary-400/50 rounded-full blur-lg" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '0.9s' }}></div>
          <div className="absolute top-20 right-1/2 w-20 h-20 bg-primary-300/60 rounded-full blur-lg" style={{ animation: 'floatSlow 6s ease-in-out infinite', animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-32 right-1/3 w-22 h-22 bg-primary-400/55 rounded-full blur-lg" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.3s' }}></div>
          <div className="absolute top-1/4 left-1/4 w-18 h-18 bg-primary-300/50 rounded-full blur-lg" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '1.1s' }}></div>
          {/* Petites bulles */}
          <div className="absolute top-10 right-10 w-10 h-10 bg-primary-300/50 rounded-full blur-md" style={{ animation: 'floatFast 3.5s ease-in-out infinite', animationDelay: '0.9s' }}></div>
          <div className="absolute bottom-10 left-10 w-8 h-8 bg-primary-400/60 rounded-full blur-md" style={{ animation: 'floatSlow 5.5s ease-in-out infinite', animationDelay: '1.1s' }}></div>
          <div className="absolute top-1/2 left-8 w-6 h-6 bg-primary-300/60 rounded-full blur-md" style={{ animation: 'float 4.5s ease-in-out infinite', animationDelay: '0.35s' }}></div>
          <div className="absolute bottom-1/4 right-8 w-7 h-7 bg-primary-400/70 rounded-full blur-md" style={{ animation: 'floatFast 2.5s ease-in-out infinite', animationDelay: '0.55s' }}></div>
          <div className="absolute top-1/3 right-8 w-9 h-9 bg-primary-300/55 rounded-full blur-md" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '1.6s' }}></div>
          <div className="absolute bottom-1/3 left-12 w-8 h-8 bg-primary-400/60 rounded-full blur-md" style={{ animation: 'floatSlow 5s ease-in-out infinite', animationDelay: '0.8s' }}></div>
          <div className="absolute top-3/4 right-16 w-7 h-7 bg-primary-300/50 rounded-full blur-md" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '1.3s' }}></div>
          <div className="absolute top-12 left-1/2 w-6 h-6 bg-primary-400/65 rounded-full blur-md" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.15s' }}></div>
          <div className="absolute bottom-20 right-12 w-9 h-9 bg-primary-300/55 rounded-full blur-md" style={{ animation: 'floatSlow 5.5s ease-in-out infinite', animationDelay: '0.45s' }}></div>
        </div>
        
        {/* Contenu */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-primary-900 mb-4">
            Gestion du temps simplifiée
          </h1>
          <p className="text-primary-800 text-lg mb-8">
            Suivez vos projets, analysez vos performances et optimisez votre productivité.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Timer en temps réel</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Rapports détaillés</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Collaboration d'équipe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite - Formulaire */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-primary-900 p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/logo-mci-care-ci.png"
              alt="Logo"
              className="h-20 w-auto max-w-[260px] object-contain"
            />
          </div>

          {/* Titre */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            Connexion
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Accédez à votre compte
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                ADRESSE EMAIL *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="jules@example.com"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
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

            {/* Se souvenir de moi et Mot de passe oublié */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Se souvenir de moi</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Message pour les filiales sans compte */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vous n'avez pas de compte ? Rapprochez-vous auprès du service IT de{' '}
              <a
                href="https://mcicareci.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium underline"
              >
                MCI CARE CI
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
