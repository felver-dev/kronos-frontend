import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Check } from 'lucide-react'
import { authService } from '../../services/authService'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await authService.forgotPassword({ email })
      setSuccess(true)
    } catch (err) {
      console.error('Erreur:', err)
      // Même en cas d'erreur, on affiche le message de succès pour la sécurité
      // (pour ne pas révéler si un email existe ou non)
      setSuccess(true)
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
          <div className="absolute top-9 right-14 w-9 h-9 bg-primary-300/55 rounded-full blur-md" style={{ animation: 'floatFast 3.5s ease-in-out infinite', animationDelay: '0.9s' }}></div>
          <div className="absolute bottom-12 left-9 w-7 h-7 bg-primary-400/60 rounded-full blur-sm" style={{ animation: 'floatSlow 5.5s ease-in-out infinite', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-12 w-6 h-6 bg-primary-300/60 rounded-full blur-sm" style={{ animation: 'float 4.5s ease-in-out infinite', animationDelay: '0.35s' }}></div>
          <div className="absolute bottom-1/4 right-7 w-8 h-8 bg-primary-400/70 rounded-full blur-sm" style={{ animation: 'floatFast 2.5s ease-in-out infinite', animationDelay: '0.55s' }}></div>
          <div className="absolute top-1/3 right-8 w-9 h-9 bg-primary-300/55 rounded-full blur-md" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '1.6s' }}></div>
          <div className="absolute bottom-1/3 left-12 w-8 h-8 bg-primary-400/60 rounded-full blur-md" style={{ animation: 'floatSlow 5s ease-in-out infinite', animationDelay: '0.8s' }}></div>
          <div className="absolute top-3/4 right-16 w-7 h-7 bg-primary-300/50 rounded-full blur-md" style={{ animation: 'floatFast 3s ease-in-out infinite', animationDelay: '1.3s' }}></div>
          <div className="absolute top-12 left-1/2 w-6 h-6 bg-primary-400/65 rounded-full blur-md" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.15s' }}></div>
          <div className="absolute bottom-20 right-12 w-9 h-9 bg-primary-300/55 rounded-full blur-md" style={{ animation: 'floatSlow 5.5s ease-in-out infinite', animationDelay: '0.45s' }}></div>
        </div>
        
        {/* Contenu */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-primary-900 mb-4">
            Récupération rapide
          </h1>
          <p className="text-primary-800 text-lg mb-8">
            Recevez votre lien de réinitialisation par email en quelques secondes.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Email instantané</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Lien sécurisé 24h</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-primary-700" />
              <span className="text-primary-900 text-lg">Support disponible</span>
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

          {success ? (
            <>
              {/* Message de succès */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Email envoyé !
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
                </p>
                <Link
                  to="/login"
                  className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Retour à la connexion
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Titre */}
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                Mot de passe oublié ?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>

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
                      placeholder="@name@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Bouton d'envoi */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>

              {/* Lien vers connexion */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <Link
                    to="/login"
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
