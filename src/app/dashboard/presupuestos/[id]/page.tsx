import { getBudgetDetails } from "@/features/budgets/server/queries"
import { getCachedCategories } from "@/lib/cache"
import { ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"
import { requireAuth } from "@/lib/permissions"
import { FundTransfer } from "@/components/presupuestos/FundTransfer"
import { MasterBudgetEditor } from "@/components/presupuestos/MasterBudgetEditor"
import { InlineAdjustmentForm } from "@/components/presupuestos/AllocationForms"
import { BudgetAllocationsTable } from "@/components/presupuestos/BudgetAllocationsTable"
import { CreateAllocationModal } from "@/components/presupuestos/CreateAllocationModal"
import { AdjustmentLogModal } from "@/components/presupuestos/AdjustmentLogModal"

export default async function BudgetDetailsPage({ params }: { params: { id: string } }) {
  const [user, data] = await Promise.all([
    requireAuth(),
    getBudgetDetails(Number(params.id))
  ])
  
  // Usamos la capa de caché para las categorías del presupuesto
  // Si es SUPER_ADMIN, permitimos ver todas las categorías para facilitar la configuración
  const availableCategories = await getCachedCategories({ 
    companyId: user.role === 'SUPER_ADMIN' ? undefined : data.budget.companyId 
  }) as any[]
  
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
             <MasterBudgetEditor budgetId={budget.id.toString()} currentLimit={stats.originalHardLimit} />
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

      <BudgetAllocationsTable initialAllocations={budget.allocations} />

      <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-zinc-400" /> Recientes Movimientos
            </h3>
            <AdjustmentLogModal adjustments={allAdjustments} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAdjustments.map((adj: any) => (
                  <div key={adj.id} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${Number(adj.amountUSD) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {Number(adj.amountUSD) > 0 ? 'Incremento' : 'Reducción'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold">{new Date(adj.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm font-bold text-foreground">
                          {Number(adj.amountUSD) > 0 ? '+' : ''}{Number(adj.amountUSD).toLocaleString()} USD
                      </div>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase truncate">{adj.categoryName}</div>
                      <div className="text-xs text-zinc-500 italic mt-1 border-t border-zinc-50 dark:border-zinc-800 pt-2">
                          "{adj.reason}"
                      </div>
                  </div>
              ))}
              {recentAdjustments.length === 0 && (
                  <div className="col-span-full py-10 text-center text-zinc-400 text-sm italic border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-3xl">
                      No hay ajustes registrados recientemente.
                  </div>
              )}
          </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value, color = "text-foreground" }: { label: string, value: number, color?: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
            <span className={`text-2xl font-black ${color}`}>
                ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        </div>
    )
}
