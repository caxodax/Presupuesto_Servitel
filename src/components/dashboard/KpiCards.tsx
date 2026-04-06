import { getDashboardKpis } from "@/features/dashboard/server/queries"
import { DollarSign, AlertCircle, TrendingUp, Layers, CheckCircle2 } from "lucide-react"

export async function KpiCards({ searchParams }: { searchParams: any }) {
    // Al ser un Server Component y estar envuelto en un Suspense de React 18, 
    // su carga async no paralizará el render principal del template ni el menu lateral.
    const kpis = await getDashboardKpis(searchParams)
    
    return (
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
           {/* Card Financiero Limite Base */}
           <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_4px_40px_rgba(0,0,0,0.02)] relative overflow-hidden group">
               <div className="flex justify-between items-start mb-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Masa Aprobada</h3>
                   <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-500">
                       <DollarSign className="w-4 h-4" />
                   </div>
               </div>
               <div className="text-3xl font-black tracking-tight text-foreground">
                  ${kpis.totalLimit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-foreground pointer-events-none group-hover:scale-110 transition-transform">
                   <DollarSign className="w-32 h-32" />
               </div>
           </div>

           {/* Card Ejecutado */}
           <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_4px_40px_rgba(0,0,0,0.02)] relative overflow-hidden group">
               <div className="flex justify-between items-start mb-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Consumo Efectivo</h3>
                   <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800/80 rounded-full flex items-center justify-center text-zinc-500">
                       <TrendingUp className="w-4 h-4" />
                   </div>
               </div>
               <div className="text-3xl font-black tracking-tight text-foreground">
                  ${kpis.totalConsumed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
               </div>
               <div className="mt-1 flex items-center gap-2">
                   <div className="h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500" style={{ width: `${Math.min(kpis.executionPercentage, 100)}%` }} />
                   </div>
                   <span className="text-[10px] font-bold text-zinc-400">{kpis.executionPercentage.toFixed(1)}% uso</span>
               </div>
           </div>

           {/* Card Salud (Capacidad Base) */}
           <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_4px_40px_rgba(0,0,0,0.02)] relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Capacidad Sana</h3>
                   <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                       <CheckCircle2 className="w-4 h-4" />
                   </div>
               </div>
               <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  ${Math.max(kpis.availableCapacity, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
               </div>
           </div>

           {/* Card Riesgo (Sobregiros Multiples) */}
           <div className={`rounded-xl border p-6 shadow-[0_4px_40px_rgba(0,0,0,0.02)] relative overflow-hidden transition-colors duration-500
                ${kpis.overbudgetAmount > 0 
                    ? 'border-rose-200/60 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20' 
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'}`
           }>
               <div className="flex justify-between items-start mb-4">
                   <h3 className={`text-xs font-bold uppercase tracking-wider ${kpis.overbudgetAmount > 0 ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-zinc-500'}`}>
                      Sobregiro Absoluto
                   </h3>
                   <div className={`h-8 w-8 rounded-full flex items-center justify-center ${kpis.overbudgetAmount > 0 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                       <AlertCircle className="w-4 h-4" />
                   </div>
               </div>
               <div className={`text-3xl font-black tracking-tight ${kpis.overbudgetAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                  ${kpis.overbudgetAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
               </div>
           </div>

       </div>
    )
}

export function KpiCardsSkeleton() {
    return (
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
             <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 overflow-hidden relative">
                <div className="flex justify-between items-start mb-4">
                   <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                   <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800/80 rounded-full" />
                </div>
                <div className="h-8 w-32 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
             </div>
          ))}
       </div>
    )
}
