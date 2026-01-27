import { Link, useLocation } from 'react-router-dom'
import { Home, ArrowLeft, AlertCircle } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Page non trouvée
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          {location.pathname && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
              <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                {location.pathname}
              </code>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Home className="w-5 h-5 mr-2" />
            Retour à l'accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Page précédente
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
