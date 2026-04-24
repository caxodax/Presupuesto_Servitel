import { getBudgets } from "@/features/budgets/server/queries"
import { getBranches, getCompanies } from "@/features/companies/server/queries"
import { createBudget } from "@/features/budgets/server/actions"
import { Layers } from "lucide-react"
import Link from "next/link"
import { BudgetForm } from "@/components/presupuestos/BudgetForm"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { requireAuth } from "@/lib/permissions"

export default async function BudgetsRootPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string } 
}) {
  const user = await requireAuth()
  const { companyId } = searchParams;

  const [budgets, branches, companies] = await Promise.all([
    getBudgets(companyId),
    getBranches(companyId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
  ])
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-full items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Matriz de Presupuestos</h1>
           <p className="text-sm text-muted-foreground mt-1.5">Manejo de ciclos, periodos globales y divisiones.</p>
         </div>
         {user.role === "SUPER_ADMIN" && (
           <CompanyFilter companies={companies} />
         )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Lateral: Crear Periodo Operativo */}
        <BudgetForm 
          companies={companies} 
          branches={branches} 
          defaultCompanyId={companyId}
        />

        {/* Tabla Lista de Ciclos Presupuestarios */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-medium">
                 <tr>
                   <th className="px-6 py-3.5">Referencia</th>
                   {!companyId && <th className="px-6 py-3.5">Empresa</th>}
                   <th className="px-6 py-3.5">Sucursal</th>
                   <th className="px-6 py-3.5 text-right flex-1">Fondo Máximo</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                 {budgets.map(budget => (
                   <tr key={budget.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group">
                     <td className="px-6 py-4 flex flex-col gap-1">
                        <Link href={`/dashboard/presupuestos/${budget.id}`} className="font-semibold text-foreground hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" />
                            {budget.name}
                        </Link>
                        <span className="text-[11px] text-zinc-500">
                           {budget.initialDate.toLocaleDateString()} - {budget.endDate.toLocaleDateString()}
                        </span>
                     </td>
                     {!companyId && (
                        <td className="px-6 py-4 text-muted-foreground">
                           <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                              {budget.branch.company.name}
                           </span>
                        </td>
                     )}
                     <td className="px-6 py-4 text-muted-foreground">{budget.branch.name}</td>
                     <td className="px-6 py-4 text-right">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                           ${Number(budget.amountLimitUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                     </td>
                   </tr>
                 ))}

                 {budgets.length === 0 && (
                   <tr>
                     <td colSpan={companyId ? 3 : 4} className="px-6 py-8 text-center text-zinc-500">Sistema sin periodos presupuestarios iniciados.</td>
                   </tr>
                 )}
               </tbody>
             </table>
        </div>
      </div>
    </div>
  )
}
