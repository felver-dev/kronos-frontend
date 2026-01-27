import { AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  isLoading?: boolean
  requireNameConfirmation?: boolean
  confirmationName?: string
}

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  isLoading = false,
  requireNameConfirmation = false,
  confirmationName = '',
}: ConfirmModalProps) => {
  const [inputName, setInputName] = useState('')

  // Réinitialiser le champ quand le modal s'ouvre/ferme
  useEffect(() => {
    if (!isOpen) {
      setInputName('')
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (requireNameConfirmation && inputName !== confirmationName) {
      return
    }
    onConfirm()
  }

  const isConfirmDisabled = requireNameConfirmation && inputName !== confirmationName

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Message d'avertissement */}
        <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-800 dark:text-red-200">
            {message}
          </div>
        </div>

        {/* Champ de confirmation du nom si requis */}
        {requireNameConfirmation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pour confirmer, saisissez le nom de la catégorie : <span className="font-mono text-red-600 dark:text-red-400">{confirmationName}</span>
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Saisissez le nom de la catégorie"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent"
              autoFocus
            />
            {inputName && inputName !== confirmationName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Le nom ne correspond pas
              </p>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isConfirmDisabled}
            className={`px-4 py-2 ${confirmButtonClass} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Suppression...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal
