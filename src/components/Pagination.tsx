import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  itemsPerPageOptions?: number[]
}

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
}: PaginationProps) => {
  // Calculer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si le total est petit
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Toujours afficher la première page
      pages.push(1)

      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      // Ajuster si on est proche du début
      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1)
      }

      // Ajuster si on est proche de la fin
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3)
      }

      // Ajouter les ellipses et les pages
      if (start > 2) {
        pages.push('...')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push('...')
      }

      // Toujours afficher la dernière page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="bg-gray-50 dark:bg-gray-700 px-3 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-600">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Informations sur les résultats */}
        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left order-2 sm:order-1">
          <span className="font-medium text-gray-900 dark:text-gray-100">{startItem}</span>–<span className="font-medium text-gray-900 dark:text-gray-100">{endItem}</span>
          <span className="sm:inline"> / </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{totalItems}</span>
          {totalItems > 1 ? ' résultats' : ' résultat'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center order-1 sm:order-2 min-w-0">
          {/* Sélecteur d'éléments par page */}
          {onItemsPerPageChange && (
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-shrink-0">
              <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Par page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1.5 sm:px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent min-w-0"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contrôles de pagination */}
          <div className="flex items-center justify-center gap-1 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Première page"
              aria-label="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Page précédente"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Numéros de page : sur mobile on affiche moins de boutons, scroll si besoin */}
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto max-w-[220px] sm:max-w-none justify-center min-w-0">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-gray-500 dark:text-gray-400 text-sm flex-shrink-0 hidden sm:inline"
                    >
                      ...
                    </span>
                  )
                }

                const pageNumber = page as number
                const isActive = pageNumber === currentPage

                return (
                  <button
                    key={pageNumber}
                    onClick={() => onPageChange(pageNumber)}
                    className={`min-w-[2rem] sm:min-w-[2.5rem] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-sm transition-colors flex-shrink-0 ${
                      isActive
                        ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:border-primary-500 dark:hover:bg-primary-600'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Page suivante"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Dernière page"
              aria-label="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pagination
