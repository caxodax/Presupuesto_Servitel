"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function DashboardFilters({ options }: { options: { companies: any[], branches: any[], budgets: any[] } }) {
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()

   const setFilter = (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      
      // Si cambiamos la empresa, limpia sucursal y presupuesto
      if (key === 'companyId' && value !== searchParams.get('companyId')) {
          params.delete('branchId')
          params.delete('budgetId')
      }
      
      // Si cambiamos la sucursal, limpia el periodo presupuestario para evitar bugs lógicos
      if (key === 'branchId' && value !== searchParams.get('branchId')) {
          params.delete('budgetId')
      }
      
      router.push(`${pathname}?${params.toString()}`)
   }
   
   const currentCompany = searchParams.get('companyId') || ""
   const currentBranch = searchParams.get('branchId') || ""
   
   return (
       <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {options.companies.length > 1 && (
             <>
                <select 
                   value={currentCompany}
                   onChange={e => setFilter('companyId', e.target.value)}
                   className="h-8 px-2 rounded font-medium border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-600 dark:text-zinc-300 text-xs w-[140px] appearance-none cursor-pointer hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                >
                   <option value="">🏢 Todas Empresas</option>
                   {options.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
             </>
          )}

          <select 
             value={currentBranch}
             onChange={e => setFilter('branchId', e.target.value)}
             className="h-8 px-2 rounded font-medium border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-600 dark:text-zinc-300 text-xs w-[140px] appearance-none cursor-pointer hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
             <option value="">🗺️ Todas Sucursales</option>
             {options.branches
                .filter(b => !currentCompany || b.companyId === currentCompany)
                .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />

          <select 
             value={searchParams.get('budgetId') || ""}
             onChange={e => setFilter('budgetId', e.target.value)}
             className="h-8 px-2 rounded font-medium border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-600 dark:text-zinc-300 text-xs w-[160px] appearance-none cursor-pointer hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
             <option value="">⏱️ Todos los Ciclos</option>
             {options.budgets
                .filter(b => (!currentCompany || b.companyId === currentCompany) && (!currentBranch || b.branchId === currentBranch))
                .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
       </div>
   )
}
