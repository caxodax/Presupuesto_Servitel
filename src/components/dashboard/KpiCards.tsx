import { getDashboardKpis } from "@/features/dashboard/server/queries"
import { DollarSign, AlertCircle, TrendingUp, Layers, CheckCircle2 } from "lucide-react"

export async function KpiCards({ searchParams }: { searchParams: any }) {
    const kpis = await getDashboardKpis(searchParams)
    
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Card Financiero Limite Base */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-500 hover:shadow-[0_12px_44px_rgba(0,0,0,0.1)] hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-indigo-500/5 blur-3xl transition-colors group-hover:bg-indigo-500/10" />
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/80 dark:text-indigo-400">Presupuesto Total</h3>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Límite Aprobado Total</p>
                    </div>
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                       ${kpis.totalLimit.toLocaleString()}
                    </span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-800/50 w-fit px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                    <Layers className="w-3 h-3 text-indigo-500" /> Fondeo Consolidado
                </div>
            </div>

            {/* Card Ejecutado */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-500 hover:shadow-[0_12px_44px_rgba(0,0,0,0.1)] hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-zinc-500/5 blur-3xl" />
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Gasto Real</h3>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Ejecución en Tiempo Real</p>
                    </div>
                    <div className="h-10 w-10 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center text-white dark:text-black shadow-lg shadow-black/10 group-hover:-rotate-12 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
                <div className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                   ${kpis.totalConsumed.toLocaleString()}
                </div>
                <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                        <span className="text-zinc-400">EFICIENCIA DEL GIRO</span>
                        <span className={`px-2 py-0.5 rounded-full ${kpis.executionPercentage > 90 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {kpis.executionPercentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-[1px]">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-1000 bg-[length:200%_100%] animate-gradient-x" 
                            style={{ width: `${Math.min(kpis.executionPercentage, 100)}%` }} 
                        />
                    </div>
                </div>
            </div>

            {/* Card Salud (Capacidad Base) */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 bg-white/70 dark:bg-zinc-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-500 hover:shadow-[0_12px_44px_rgba(16,185,129,0.1)] hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-3xl" />
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Presupuesto Disponible</h3>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Disponibilidad de Giro</p>
                    </div>
                    <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="text-3xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                   ${Math.max(kpis.availableCapacity, 0).toLocaleString()}
                </div>
                <div className="mt-6 flex items-center gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.1em]">Reserva Operativa Activa</span>
                </div>
            </div>

            {/* Card Riesgo (Sobregiros Multiples) */}
            <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:-translate-y-1
                 ${kpis.overbudgetAmount > 0 
                     ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:shadow-[0_12px_44px_rgba(244,63,94,0.15)]' 
                     : 'border-white/20 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/40 hover:shadow-[0_12px_44px_rgba(0,0,0,0.1)]'}`
            }>
                <div className={`absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full blur-3xl transition-colors ${kpis.overbudgetAmount > 0 ? 'bg-rose-500/10' : 'bg-zinc-500/5'}`} />
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${kpis.overbudgetAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>
                           Monto Excedido
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium tracking-tight">Excedentes Activos</p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${kpis.overbudgetAmount > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 shadow-black/5'}`}>
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
                <div className={`text-3xl font-black tracking-tighter ${kpis.overbudgetAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                   ${kpis.overbudgetAmount.toLocaleString()}
                </div>
                <div className="mt-6">
                     {kpis.overbudgetAmount > 0 ? (
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900/50 w-fit animate-bounce-subtle">
                             Acción Requerida
                         </div>
                     ) : (
                         <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
                            Sin desbordamientos
                         </div>
                     )}
                </div>
            </div>
        </div>
    )
}

export function KpiCardsSkeleton() {
    return (
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
             <div key={i} className="h-44 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 animate-pulse" />
          ))}
       </div>
    )
}
