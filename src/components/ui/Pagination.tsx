import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  searchParams?: Record<string, string | string[] | undefined>
  basePath?: string
}

// Server Component puro — sin JS en el cliente.
// Usa <Link> con URL params para navegar entre páginas.
export function Pagination({ page, pageCount, total, searchParams = {}, basePath }: PaginationProps) {
  if (pageCount <= 1) return null

  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams()
    // Preservar todos los searchParams excepto 'page'
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k !== 'page' && v !== undefined) {
        if (Array.isArray(v)) params.set(k, v[0] ?? '')
        else params.set(k, v)
      }
    })
    params.set('page', targetPage.toString())
    return basePath ? `${basePath}?${params.toString()}` : `?${params.toString()}`
  }

  const prevDisabled = page <= 1
  const nextDisabled = page >= pageCount

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800/50">
      <div className="text-xs text-zinc-500 font-medium">
        Mostrando <span className="text-zinc-900 dark:text-zinc-100">{total > 0 ? pageCount : 0}</span> páginas de <span className="text-zinc-900 dark:text-zinc-100">{total}</span> resultados
      </div>
      <div className="flex items-center gap-1">
        {prevDisabled ? (
          <span className="p-2 rounded-lg opacity-30 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </span>
        ) : (
          <Link href={buildPageUrl(page - 1)} className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
        
        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            p === page ? (
              <span
                key={p}
                className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md"
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={buildPageUrl(p)}
                className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                {p}
              </Link>
            )
          ))}
        </div>

        {nextDisabled ? (
          <span className="p-2 rounded-lg opacity-30 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </span>
        ) : (
          <Link href={buildPageUrl(page + 1)} className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
