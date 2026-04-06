import { getBudgetDetails } from "@/features/budgets/server/queries"
import { getCategories } from "@/features/categories/server/queries"
import { upsertAllocation, registerAdjustment } from "@/features/budgets/server/actions"
import { ArrowLeft, PlusCircle, Activity } from "lucide-react"
import Link from "next/link"

export default async function BudgetDetailsPage({ params }: { params: { id: string } }) {
  const [data, availableCategories] = await Promise.all([
    getBudgetDetails(params.id),
    getCategories()
  ])
  
  const { budget, stats } = data

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/presupuestos" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Regresar a periodos
      </Link>
      
      <div className="flex w-full items-end justify-between">
         <div>
           <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl font-bold tracking-tight text-foreground">{budget.name}</h1>
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                {budget.branch.name}
             </span>
           </div>
           <p className="text-sm text-muted-foreground flex items-center gap-2">
             Periodo válido: {budget.initialDate.toLocaleDateString()} — {budget.endDate.toLocaleDateString()}
           </p>
         </div>
         
         <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Presupuesto Master (USD)</h3>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
               ${stats.originalHardLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 -mt-2">
         <MetricBox label="Distribuido Neto" value={stats.netAllocated} color="text-indigo-600 dark:text-indigo-400" />
         <MetricBox label="Sin Distribuir" value={stats.availableToAllocate} />
         <MetricBox label="Ejecutado USD" value={stats.totalConsumedUSD} color="text-rose-600 dark:text-rose-400" />
         <MetricBox label="Flotante VES" value={stats.totalConsumedVES} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Asignaciones de Gasto */}
        <div className="xl:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
           <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Distribución Categórica</h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase text-zinc-500 font-semibold bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800/50">
                 <tr>
                   <th className="px-5 py-3">Área de Gasto (Categoría)</th>
                   <th className="px-5 py-3 text-right">Límite Aprobado</th>
                   <th className="px-5 py-3 text-right">Consumido</th>
                   <th className="px-5 py-3 text-right bg-rose-50/30 dark:bg-rose-950/20 border-l border-zinc-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400">Acción de Ajuste</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                 {budget.allocations.map(alloc => (
                   <tr key={alloc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                     <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{alloc.category.name}</div>
                        {alloc.subcategory && <div className="text-xs text-muted-foreground mt-0.5">↳ {alloc.subcategory.name}</div>}
                     </td>
                     <td className="px-5 py-4 text-right font-medium">${Number(alloc.amountUSD).toLocaleString()}</td>
                     <td className="px-5 py-4 text-right tabular-nums text-zinc-500">${Number(alloc.consumedUSD).toLocaleString()}</td>
                     <td className="p-3 text-right border-l border-zinc-200 dark:border-zinc-800 bg-rose-50/10 dark:bg-rose-950/10">
                         {/* Mini formulario in-line para ajustes rapidos directos al Allocation */}
                         <form action={registerAdjustment} className="flex flex-col gap-1.5 items-end justify-center w-full">
                           <input type="hidden" name="allocationId" value={alloc.id} />
                           {/* Input numerico permite negativo */}
                           <div className="flex gap-2 w-full max-w-[200px]">
                              <input type="number" step="0.01" name="amountUSD" required placeholder="± $0.00" className="w-20 h-7 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2" />
                              <input type="text" name="reason" required placeholder="Razón..." className="flex-1 h-7 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2" />
                           </div>
                           <button type="submit" className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded">Aplicar Ajuste</button>
                         </form>
                     </td>
                   </tr>
                 ))}
                 {budget.allocations.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">Sin fondos distribuidos.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Panel Lateral: Asignador y Log */}
        <div className="xl:col-span-1 flex flex-col gap-6">
           <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900 shadow-sm p-6">
             <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Asignar Fondos a Categoría
             </h2>
             <form action={upsertAllocation} className="flex flex-col gap-4">
                <input type="hidden" name="budgetId" value={budget.id} />
                <div className="space-y-1">
                   <label className="text-xs font-semibold">Categoría Directa</label>
                   <select name="categoryId" required className="w-full h-8 text-sm outline-none px-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
                      {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fondos Iniciales Categóricos</label>
                   <input type="number" step="0.01" name="amountUSD" required placeholder="0.00" className="w-full h-8 text-sm outline-none px-2 rounded border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 font-medium" />
                </div>
                <button type="submit" className="w-full h-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded text-xs font-bold hover:opacity-90">Distribuir</button>
             </form>
           </div>
           
           <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm p-6 flex flex-col">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Log de Ajustes
              </h2>
              <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-3 pr-2">
                 {budget.allocations.flatMap(a => a.adjustments.map(adj => ({ ...adj, categoryName: a.category.name }))).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(adj => (
                    <div key={adj.id} className="text-xs border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-1">
                       <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-foreground">{adj.categoryName}</span>
                          <span className={`font-bold ${Number(adj.amountUSD) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {Number(adj.amountUSD) > 0 ? '+' : ''}{Number(adj.amountUSD)}
                          </span>
                       </div>
                       <p className="text-zinc-500">{adj.reason}</p>
                       <span className="text-[10px] text-zinc-400 block mt-1">{adj.createdAt.toLocaleTimeString()}</span>
                    </div>
                 ))}
                 {budget.allocations.every(a => a.adjustments.length === 0) && (
                    <p className="text-xs text-zinc-500 italic">No hay historial de ajustes post-asignación.</p>
                 )}
              </div>
           </div>
        </div>
        
      </div>
    </div>
  )
}

function MetricBox({ label, value, color = "text-foreground" }: { label: string, value: number, color?: string }) {
  return (
     <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        <span className={`font-bold tabular-nums ${color}`}>${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
     </div>
  )
}
