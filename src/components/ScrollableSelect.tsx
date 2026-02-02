import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

export interface ScrollableSelectOption {
  value: string
  label: string
}

interface ScrollableSelectProps {
  value: string
  onChange: (value: string) => void
  options: ScrollableSelectOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  id?: string
  /** Si true, affiche un option "vide" en premier (value '') */
  allowEmpty?: boolean
}

/**
 * Liste déroulante avec hauteur max et scroll pour éviter que la liste dépasse l'écran.
 */
export default function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner…',
  disabled = false,
  loading = false,
  className = '',
  id,
  allowEmpty = false,
}: ScrollableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : ''

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setIsOpen((o) => !o)}
        className={`input flex w-full items-center justify-between text-left ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
      >
        <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Chargement…
            </span>
          ) : (
            displayLabel || placeholder
          )}
        </span>
        {!loading && <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && !loading && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-[min(280px,50vh)] overflow-y-auto py-1"
          role="listbox"
        >
          {allowEmpty && (
            <li
              role="option"
              aria-selected={value === ''}
              onClick={() => handleSelect('')}
              className="px-4 py-2 cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {placeholder}
            </li>
          )}
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`px-4 py-2 cursor-pointer truncate hover:bg-gray-100 dark:hover:bg-gray-600 ${value === opt.value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
