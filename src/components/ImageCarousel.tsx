import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export interface CarouselImage {
  id: number
  url: string | null
  fileName: string
}

interface ImageCarouselProps {
  images: CarouselImage[]
  currentIndex: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

/**
 * Carousel / lightbox en popup pour visualiser une liste d'images.
 * Navigation au clavier (Échap = fermer, flèches = précédent/suivant).
 */
export default function ImageCarousel({ images, currentIndex, onClose, onIndexChange }: ImageCarouselProps) {
  const total = images.length
  const current = images[currentIndex]
  const hasPrev = total > 1 && currentIndex > 0
  const hasNext = total > 1 && currentIndex < total - 1

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(currentIndex - 1)
  }, [hasPrev, currentIndex, onIndexChange])

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(currentIndex + 1)
  }, [hasNext, currentIndex, onIndexChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goPrev, goNext])

  if (total === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Carousel d'images"
    >
      {/* Bouton fermer */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Flèche précédent */}
      {hasPrev && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Image précédente"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>
      )}

      {/* Zone centrale : image ou loader */}
      <div
        className="flex-1 flex items-center justify-center max-w-[90vw] max-h-[90vh] mx-16"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {current?.url ? (
          <img
            src={current.url}
            alt={current.fileName}
            className="max-w-full max-h-[90vh] object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/80">
            <Loader2 className="w-12 h-12 animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}
      </div>

      {/* Flèche suivant */}
      {hasNext && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Image suivante"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      )}

      {/* Compteur et nom du fichier en bas */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/90 text-sm">
        <span>
          {currentIndex + 1} / {total}
        </span>
        {current?.fileName && (
          <span className="max-w-[80vw] truncate text-xs text-white/70" title={current.fileName}>
            {current.fileName}
          </span>
        )}
      </div>
    </div>
  )
}
