import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal : plein écran sur mobile, centré avec max-width sur desktop */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div
          className={`relative w-full ${sizeClasses[size]} max-h-[95vh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header : padding réduit sur mobile */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-3 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">{title}</h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content : scroll sur mobile si contenu long */}
          <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default Modal
