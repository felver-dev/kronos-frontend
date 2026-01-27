import { AlertCircle } from 'lucide-react'
import Modal from './Modal'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string | React.ReactNode
}

const InfoModal = ({ isOpen, onClose, title, content }: InfoModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            {typeof content === 'string' ? (
              <p className="whitespace-pre-line">{content}</p>
            ) : (
              content
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default InfoModal
