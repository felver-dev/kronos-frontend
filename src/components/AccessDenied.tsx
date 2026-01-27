import React from 'react'
import { AlertCircle } from 'lucide-react'

interface AccessDeniedProps {
  message?: string
}

/**
 * Composant pour afficher un message d'accès refusé
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message = 'Vous n\'avez pas la permission d\'accéder à cette page' 
}) => {
  return (
    <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
      <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
        <AlertCircle className="w-5 h-5" />
        <span>{message}</span>
      </div>
    </div>
  )
}
