"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Filter, X, Zap, Layers, Loader2 } from "lucide-react"

export function DashboardFilters({ options, userRole }: { options: { companies: any[], branches: any[], budgets: any[], groups?: any[] }, userRole: string }) {
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()
   const [isPending, startTransition] = useTransition()

   const setFilter = (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      
      if (key === 'groupId' && value !== searchParams.get('groupId')) {
          params.delete('companyId')
          params.delete('branchId')
          params.delete('budgetId')
      }
      
      if (key === 'companyId' && value !== searchParams.get('companyId')) {
          params.delete('branchId')
          params.delete('budgetId')
      }
      
      if (key === 'branchId' && value !== searchParams.get('branchId')) {
          params.delete('budgetId')
      }
      
      startTransition(() => {
          router.push(`${pathname}?${params.toString()}`)
      })
   }

   const clearAll = () => {
       startTransition(() => {
           router.push(pathname)
       })
   }
   
   const currentGroup = searchParams.get('groupId') || ""
   const currentCompany = searchParams.get('companyId') || ""
   const currentBranch = searchParams.get('branchId') || ""
   const currentBudget = searchParams.get('budgetId') || ""
   
   const hasActiveFilters = currentGroup || currentCompany || currentBranch || currentBudget

   return (
       <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/50 shadow-inner transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
             
             {isPending && (
                 <div className="pl-2">
                     <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                 </div>
             )}
             
             {/* Filtro Matriz */}
             {userRole === 'SUPER_ADMIN' && options.groups && options.groups.length > 0 && (
                <>
                   <div className="relative group">
                      <select 
                         value={currentGroup}
                         onChange={e => setFilter('groupId', e.target.value)}
                         disabled={isPending}
                         className={`h-8 px-3 pr-8 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[140px] appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait
                            ${currentGroup ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                      >
                         <option value="">🏢 Todas Matrices</option>
                         {options.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-600 transition-colors">
                         <Layers className="w-3 h-3 text-indigo-500" />
                      </div>
                   </div>
                   <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                </>
             )}

             {/* Filtro Empresa */}
             {options.companies.length > 1 && (
                <>
                   <div className="relative group">
                      <select 
                         value={currentCompany}
                         onChange={e => setFilter('companyId', e.target.value)}
                         disabled={isPending}
                         className={`h-8 px-3 pr-8 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[150px] appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait
                            ${currentCompany ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                      >
                         <option value="">🏢 Todas Empresas</option>
                         {options.companies
                            .filter(c => !currentGroup || Number(c.groupId) === Number(currentGroup))
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-600 transition-colors">
                         <Filter className="w-3 h-3" />
                      </div>
                   </div>
                   <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                </>
             )}

             {/* Filtro Sucursal */}
             <div className="relative group">
                <select 
                   value={currentBranch}
                   onChange={e => setFilter('branchId', e.target.value)}
                   disabled={isPending}
                   className={`h-8 px-3 pr-8 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[150px] appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait
                      ${currentBranch ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                   <option value="">🗺️ Todas Sucursales</option>
                   {options.branches
                      .filter(b => !currentCompany || b.companyId.toString() === currentCompany)
                      .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                   <Filter className="w-3 h-3" />
                </div>
             </div>

             <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

             {/* Filtro Presupuesto */}
             <div className="relative group">
                <select 
                   value={currentBudget}
                   onChange={e => setFilter('budgetId', e.target.value)}
                   disabled={isPending}
                   className={`h-8 px-3 pr-8 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[170px] appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait
                      ${currentBudget ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                   <option value="">⏱️ Todos los Ciclos</option>
                   {options.budgets
                      .filter(b => (!currentCompany || b.companyId.toString() === currentCompany) && (!currentBranch || b.branchId.toString() === currentBranch))
                      .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                   <Zap className="w-3 h-3" />
                </div>
             </div>
          </div>

          {hasActiveFilters && (
             <button 
                onClick={clearAll}
                disabled={isPending}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 transition-colors shadow-sm animate-in fade-in zoom-in duration-300 disabled:opacity-50"
                title="Limpiar Filtros"
             >
                <X className="w-4 h-4" />
             </button>
          )}
       </div>
   )
}
