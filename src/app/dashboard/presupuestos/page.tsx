import { getBudgets } from "@/features/budgets/server/queries"
import { Layers } from "lucide-react"
import Link from "next/link"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { BranchFilter } from "@/components/ui/BranchFilter"
import { GroupFilter } from "@/components/ui/GroupFilter"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { CreateBudgetModal } from "@/components/presupuestos/CreateBudgetModal"
import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches, getCachedBusinessGroups } from "@/lib/cache"

export default async function BudgetsRootPage(props: { 
  searchParams: Promise<{ companyId?: string; branchId?: string; groupId?: string; q?: string; page?: string }> 
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const { companyId, branchId, groupId, q: query = "" } = searchParams;
  const companyIdNum = companyId ? Number(companyId) : undefined;
  const page = Number(searchParams.page) || 1;
  const limit = 10;

  const [budgetsResult, branchesResult, companiesResult, businessGroups] = await Promise.all([
    getBudgets(companyId, branchId, query, page, limit, groupId),
    getCachedBranches(companyIdNum), 
    user.role === "SUPER_ADMIN" ? getCachedCompanies() : Promise.resolve([]),
    getCachedBusinessGroups(true)
  ])
  
  // Extraer valores paginados o listados
  const { items: budgets, total, pageCount } = budgetsResult as any
  let branches = Array.isArray(branchesResult) ? branchesResult : (branchesResult as any).items || []
  let companies = companiesResult as any[]

  if (groupId) {
    companies = companies.filter((c: any) => Number(c.groupId) === Number(groupId))
    // Filter branches of those companies
    const companyIds = companies.map((c: any) => c.id)
    branches = branches.filter((b: any) => companyIds.includes(b.companyId))
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="animate-in fade-in slide-in-from-left-4 duration-500">
           <h1 className="text-3xl font-black tracking-tight text-foreground">Matriz de Presupuestos</h1>
           <p className="text-sm text-muted-foreground mt-1.5 font-medium">Manejo de ciclos, periodos globales y divisiones operacionales.</p>
         </div>
         <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
           {user.role === "SUPER_ADMIN" && (
              <>
                <GroupFilter groups={businessGroups} />
                <CompanyFilter companies={companies} />
                <BranchFilter branches={branches} selectedCompanyId={companyId} />
              </>
           )}
           <SearchInput placeholder="Buscar por referencia..." />
           <CreateBudgetModal 
              companies={companies} 
              branches={branches} 
              defaultCompanyId={companyId}
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
                     {!companyId && <th className="px-8 py-5">Empresa Propietaria</th>}
                     <th className="px-8 py-5">Sucursal Operativa</th>
                     <th className="px-8 py-5 text-right flex-1">Fondo Máximo Autorizado</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                   {budgets.map((budget: any) => (
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
                       {!companyId && (
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
  
                   {budgets.length === 0 && (
                     <tr>
                       <td colSpan={companyId ? 3 : 4} className="px-8 py-16 text-center text-zinc-500 font-medium italic">
                         {query ? `No se encontraron ciclos que coincidan con "${query}".` : "No hay periodos presupuestarios iniciados bajo los filtros seleccionados."}
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
             
             <Pagination page={page} pageCount={pageCount} total={total} searchParams={searchParams} />
        </div>
      </div>
    </div>
  )
}
