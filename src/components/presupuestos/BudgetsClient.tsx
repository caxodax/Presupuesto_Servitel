"use client"

import { useState } from "react"
import Link from "next/link"
import { Layers } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { getBudgetsAction } from "@/features/budgets/server/actions"

type BudgetsClientProps = {
    budgets: any[]
    totalPages: number
    currentPage: number
    totalItems: number
    searchParams?: any
}

export function BudgetsClient({ 
    budgets, 
    totalPages,
    currentPage,
    totalItems,
    searchParams: propsSearchParams
}: BudgetsClientProps) {
  const budgetsList = Array.isArray(budgets) ? budgets : (budgets as any).items || []

  const searchParams = useSearchParams()

  const initialQuery = searchParams.get('q') || ""
  const [query, setQuery] = useState(initialQuery)

  const currentGroupId = searchParams.get('groupId')
  const currentCompanyId = searchParams.get('companyId')
  const currentBranchId = searchParams.get('branchId')
  const currentPageParams = searchParams.get('page') || "1"

  const { data: swrData, isLoading } = useSWR(
      ['budgets', currentCompanyId, currentBranchId, query, currentPageParams, currentGroupId],
      () => getBudgetsAction(currentCompanyId || undefined, currentBranchId || undefined, query, Number(currentPageParams), 10, currentGroupId || undefined),
      { 
          fallbackData: { items: budgetsList, total: totalItems, pageCount: totalPages },
          keepPreviousData: true
      }
  )

  const localBudgets = swrData?.items || []
  const swrTotalPages = swrData?.pageCount || totalPages
  const swrTotalItems = swrData?.total || totalItems

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         {/* Se espera que la cabecera con filtros quede en la página o se inyecte como children, 
             pero el buscador lo podemos poner aquí para optimizar su estado local */}
         <div className="w-full md:w-80 shrink-0 ml-auto">
            <SearchInput 
                placeholder="Buscar por referencia..." 
                value={query}
                onChange={(val) => setQuery(val)}
            />
         </div>
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                   <tr>
                     <th className="px-8 py-5">Referencia de Ciclo</th>
                     {!currentCompanyId && <th className="px-8 py-5">Empresa Propietaria</th>}
                     <th className="px-8 py-5">Sucursal Operativa</th>
                     <th className="px-8 py-5 text-right flex-1">Fondo Máximo Autorizado</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                   {localBudgets.map((budget: any) => (
                     <tr key={budget.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group">
                       <td className="px-8 py-4 flex flex-col gap-1">
                          <Link href={`/dashboard/presupuestos/${budget.id}`} className="font-bold text-foreground hover:text-indigo-600 transition-colors flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-500" />
                              {budget.name}
                          </Link>
                          <span className="text-[11px] text-zinc-500 font-medium">
                             {new Date(budget.initialDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                          </span>
                       </td>
                       {!currentCompanyId && (
                          <td className="px-8 py-4 text-muted-foreground">
                             <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                                {budget.branch.company?.name || budget.branch.Company?.name || '---'}
                             </span>
                          </td>
                       )}
                       <td className="px-8 py-4 text-muted-foreground font-medium">{budget.branch.name}</td>
                       <td className="px-8 py-4 text-right">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                             ${Number(budget.amountLimitUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                       </td>
                     </tr>
                   ))}
  
                   {localBudgets.length === 0 && (
                     <tr>
                       <td colSpan={currentCompanyId ? 3 : 4} className="px-8 py-16 text-center text-zinc-500 font-medium italic">
                         {query ? `No se encontraron ciclos que coincidan con "${query}".` : "No hay periodos presupuestarios iniciados bajo los filtros seleccionados."}
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
             
             {swrTotalPages > 1 && (
               <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
                   <Pagination page={currentPage} pageCount={swrTotalPages} total={swrTotalItems} searchParams={propsSearchParams} />
               </div>
             )}
        </div>
      </div>
    </div>
  )
}
