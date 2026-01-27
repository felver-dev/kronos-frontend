import React from 'react'
import { Lock } from 'lucide-react'

interface PermissionDeniedProps {
  message?: string
  compact?: boolean
  className?: string
}

/**
 * Composant pour afficher un message indiquant qu'une permission est requise
 * Utilisé dans PermissionGuard et PermissionRoute pour informer l'utilisateur
 */
export const PermissionDenied: React.FC<PermissionDeniedProps> = ({ 
  message = 'Vous n\'avez pas les permissions nécessaires pour accéder à cette fonctionnalité',
  compact = false,
  className = ''
}) => {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm ${className}`}>
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div className={`card bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
            Permission requise
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PermissionDenied
