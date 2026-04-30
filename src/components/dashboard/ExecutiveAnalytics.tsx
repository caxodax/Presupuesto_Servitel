import { getExecutiveAnalytics } from "@/features/dashboard/server/queries"
import { BarChart3, PieChart, ShieldAlert, Award, Zap } from "lucide-react"

export async function ExecutiveAnalytics({ searchParams }: { searchParams: any }) {
    const { branchRankings, categoryRankings } = await getExecutiveAnalytics(searchParams)

    // Calculamos totales para porcentajes relativos
    const totalBranchConsumed = branchRankings.reduce((acc, curr) => acc + curr.consumed, 0)
    const totalCategoryConsumed = categoryRankings.reduce((acc, curr) => acc + curr.consumed, 0)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            {/* Ranking de Sucursales */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all duration-500 hover:shadow-[0_12px_44px_rgba(0,0,0,0.06)]">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Top Sucursales</h3>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em]">Ejecución vs Capacidad</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {branchRankings.map((branch, i) => (
                        <div key={branch.name} className="relative group/item">
                            <div className="flex justify-between items-end mb-2.5">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black border transition-colors ${i === 0 ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                        {branch.name}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                        ${branch.consumed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden p-[1px]">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 group-hover/item:opacity-80"
                                    style={{ width: `${totalBranchConsumed > 0 ? (branch.consumed / branchRankings[0].consumed) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {branchRankings.length === 0 && (
                        <EmptyState message="Sin datos de sucursales" />
                    )}
                </div>
            </div>

            {/* Ranking de Categorías */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all duration-500 hover:shadow-[0_12px_44px_rgba(0,0,0,0.06)]">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-500/20">
                            <PieChart className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Segmentación de Gastos</h3>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-[0.2em]">Rubros de mayor impacto</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {categoryRankings.map((cat, i) => (
                        <div key={cat.name} className="relative group/item">
                            <div className="flex justify-between items-end mb-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                        {cat.name}
                                    </span>
                                </div>
                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                    ${cat.consumed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden p-[1px]">
                                <div 
                                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-1000 group-hover/item:opacity-80"
                                    style={{ width: `${totalCategoryConsumed > 0 ? (cat.consumed / categoryRankings[0].consumed) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {categoryRankings.length === 0 && (
                        <EmptyState message="Sin datos de categorías" />
                    )}
                </div>
            </div>

        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-700/50 shadow-inner">
                <ShieldAlert className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">{message}</p>
        </div>
    )
}

export function ExecutiveAnalyticsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {[1, 2].map(i => (
                <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 animate-pulse">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                        <div className="space-y-3">
                            <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                            <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                        </div>
                    </div>
                    <div className="space-y-8">
                        {[1, 2, 3].map(j => (
                            <div key={j} className="space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-3 w-40 bg-zinc-100 dark:bg-zinc-800 rounded" />
                                    <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
