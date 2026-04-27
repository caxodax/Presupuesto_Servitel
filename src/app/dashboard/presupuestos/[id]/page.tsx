import { getBudgetDetails } from "@/features/budgets/server/queries"
import { getCategories } from "@/features/categories/server/queries"
import { ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"
import { requireAuth } from "@/lib/permissions"
import { FundTransfer } from "@/components/presupuestos/FundTransfer"
import { MasterBudgetEditor } from "@/components/presupuestos/MasterBudgetEditor"
import { InlineAdjustmentForm } from "@/components/presupuestos/AllocationForms"
import { CreateAllocationModal } from "@/components/presupuestos/CreateAllocationModal"
import { AdjustmentLogModal } from "@/components/presupuestos/AdjustmentLogModal"

export default async function BudgetDetailsPage({ params }: { params: { id: string } }) {
  const user = await requireAuth()
  const data = await getBudgetDetails(Number(params.id))
  const availableCategories = await getCategories(data.budget.companyId)
  
  const { budget, stats } = data

  const allAdjustments = budget.allocations.flatMap((a: any) => 
    a.adjustments.map((adj: any) => ({ ...adj, categoryName: a.category.name }))
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  
  const recentAdjustments = allAdjustments.slice(0, 5)

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-[1400px] mx-auto w-full">
      <Link href="/dashboard/presupuestos" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Regresar a periodos
      </Link>
      
      <div className="flex flex-col md:flex-row w-full items-start md:items-end justify-between gap-6">
         <div>
           <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl font-black tracking-tight text-foreground">{budget.name}</h1>
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                {budget.branch.name}
             </span>
           </div>
           <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
             Periodo válido: {new Date(budget.initialDate).toLocaleDateString()} — {new Date(budget.endDate).toLocaleDateString()}
           </p>
         </div>
         
         <div className="flex flex-wrap items-center gap-3">
             <CreateAllocationModal budgetId={budget.id.toString()} availableCategories={availableCategories} userRole={user.role} />
             <MasterBudgetEditor budgetId={budget.id} currentLimit={stats.originalHardLimit} />
         </div>
      </div>

      {user.role === 'SUPER_ADMIN' && budget.allocations.length > 1 && (
        <FundTransfer allocations={budget.allocations} budgetId={budget.id} />
      )}
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2 -mt-2">
         <MetricBox label="Distribuido Neto" value={stats.netAllocated} color="text-indigo-600 dark:text-indigo-400" />
         <MetricBox label="Sin Distribuir" value={stats.availableToAllocate} />
         <MetricBox label="Ejecutado USD" value={stats.totalConsumedUSD} color="text-rose-600 dark:text-rose-400" />
         <MetricBox label="Flotante VES" value={stats.totalConsumedVES} />
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden w-full">
         <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h2 className="text-lg font-bold text-foreground">Distribución Categórica</h2>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left border-collapse table-auto">
             <thead className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800/50">
               <tr>
                 <th className="px-6 py-4 min-w-[240px]">Área de Gasto (Categoría)</th>
                 <th className="px-6 py-4 text-right">Límite Aprobado</th>
                 <th className="px-6 py-4 text-right">Consumido</th>
                 <th className="px-6 py-4 text-right bg-rose-50/30 dark:bg-rose-950/20 border-l border-zinc-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 min-w-[360px]">Acción de Ajuste</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
               {budget.allocations.map((alloc: any) => (
                 <tr key={alloc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                   <td className="px-6 py-5">
                      <div className="font-bold text-foreground text-[14px] whitespace-normal">{alloc.category.name}</div>
                      {alloc.subcategory && <div className="text-xs text-muted-foreground mt-0.5 font-medium italic">↳ {alloc.subcategory.name}</div>}
                   </td>
                   <td className="px-6 py-5 text-right font-black text-zinc-700 dark:text-zinc-300 whitespace-nowrap">${Number(alloc.amountUSD).toLocaleString()}</td>
                   <td className="px-6 py-5 text-right tabular-nums text-zinc-500 font-bold whitespace-nowrap">${Number(alloc.consumedUSD).toLocaleString()}</td>
                   <td className="p-4 text-right border-l border-zinc-200 dark:border-zinc-800 bg-rose-50/5 dark:bg-rose-950/10">
                       <InlineAdjustmentForm allocationId={alloc.id.toString()} />
                   </td>
                 </tr>
               ))}
               {budget.allocations.length === 0 && (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 font-medium italic">Sin fondos distribuidos en este ciclo.</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
         <div className="flex justify-between items-center px-2">
             <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                 <Activity className="w-4 h-4" /> Registro de Ajustes Post-Asignación
             </h2>
             <AdjustmentLogModal adjustments={allAdjustments} />
         </div>

         {recentAdjustments.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
               {recentAdjustments.map((adj: any) => (
                 <div key={adj.id} className="text-sm bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-foreground line-clamp-1">{adj.categoryName}</span>
                        <span className={`font-black tracking-tight ${Number(adj.amountUSD) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {Number(adj.amountUSD) > 0 ? '+' : ''}{Number(adj.amountUSD)}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 flex-1">{adj.reason}</p>
                    <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                       <span>{new Date(adj.createdAt).toLocaleDateString()}</span>
                       <span>{new Date(adj.createdAt).toLocaleTimeString()}</span>
                    </div>
                 </div>
               ))}
           </div>
         ) : (
           <div className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl py-12 flex items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Sin historial operativo</span>
           </div>
         )}
      </div>

    </div>
  )
}

function MetricBox({ label, value, color = "text-foreground" }: { label: string, value: number, color?: string }) {
  return (
     <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
        <span className={`font-black text-xl tracking-tight ${color}`}>${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
     </div>
  )
}
