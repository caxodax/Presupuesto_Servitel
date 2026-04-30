"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface PaginationProps {
  page: number
  pageCount: number
  total: number
}

export function Pagination({ page, pageCount, total }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800/50">
      <div className="text-xs text-zinc-500 font-medium">
        Mostrando <span className="text-zinc-900 dark:text-zinc-100">{total > 0 ? pageCount : 0}</span> páginas de <span className="text-zinc-900 dark:text-zinc-100">{total}</span> resultados
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                p === page 
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= pageCount}
          className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
