"use client"

import { useOptimistic, useTransition } from "react"
import { InlineAdjustmentForm } from "./AllocationForms"
import { registerAdjustment } from "@/features/budgets/server/actions"
import { toast } from "sonner"
import { formatNumber } from "@/lib/utils"
import { Activity } from "lucide-react"

type Allocation = {
    id: number
    amountUSD: number
    consumedUSD: number
    category?: { name: string } | null
    subcategory?: { name: string } | null
    account?: { code?: string, name: string } | null
    companyAccount?: { globalAccount: { code: string, name: string } } | null
}

export function BudgetAllocationsTable({ initialAllocations }: { initialAllocations: Allocation[] }) {
    const [optimisticAllocations, addOptimisticAdjustment] = useOptimistic(
        initialAllocations,
        (state, newAdjustment: { allocationId: number, amount: number }) => {
            return state.map(alloc => 
                alloc.id === newAdjustment.allocationId 
                ? { ...alloc, amountUSD: Number(alloc.amountUSD) + newAdjustment.amount }
                : alloc
            )
        }
    )

    const [isPending, startTransition] = useTransition()

    const totalBudget = optimisticAllocations.reduce((sum, alloc) => sum + Number(alloc.amountUSD), 0)

    const handleApplyAdjustment = async (formData: FormData) => {
        const allocationId = Number(formData.get("allocationId"))
        const amount = Number(formData.get("amountUSD"))
        const reason = formData.get("reason") as string

        if (isNaN(amount) || amount === 0) return

        startTransition(async () => {
            addOptimisticAdjustment({ allocationId, amount })
            try {
                await registerAdjustment(formData)
                toast.success("Presupuesto ajustado", {
                    description: `${amount > 0 ? '+' : ''}${amount} USD aplicados.`
                })
            } catch (e: any) {
                toast.error("Error al ajustar presupuesto", {
                    description: e.message
                })
            }
        })
    }

    return (
        <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden w-full">
            <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-900/30 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">Distribución Presupuestaria</h2>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Control de ejecución por cuenta contable</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5 text-emerald-500">
                        <div className="w-2 h-2 rounded-full bg-current" /> Saludable
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-500">
                        <div className="w-2 h-2 rounded-full bg-current" /> Advertencia
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-500">
                        <div className="w-2 h-2 rounded-full bg-current" /> Crítico
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                    <thead className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-black bg-white dark:bg-zinc-900 sticky top-0 z-10">
                        <tr>
                            <th className="px-8 py-3">Cuenta Contable</th>
                            <th className="px-6 py-3 text-center">Peso</th>
                            <th className="px-6 py-3 text-right">Límite Aprobado</th>
                            <th className="px-6 py-3">Ejecución</th>
                            <th className="px-6 py-3 text-right">Consumido</th>
                            <th className="px-6 py-3 text-right">Disponible</th>
                            <th className="px-8 py-3 text-right min-w-[320px]">Ajuste de Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {optimisticAllocations.map((alloc, idx) => {
                            const weight = totalBudget > 0 ? (Number(alloc.amountUSD) / totalBudget) * 100 : 0
                            const execution = Number(alloc.amountUSD) > 0 ? (Number(alloc.consumedUSD) / Number(alloc.amountUSD)) * 100 : 0
                            const available = Number(alloc.amountUSD) - Number(alloc.consumedUSD)
                            
                            const statusColor = execution >= 100 ? 'bg-rose-500' : execution >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            const statusBg = execution >= 100 ? 'bg-rose-100 dark:bg-rose-950/30' : execution >= 70 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-emerald-100 dark:bg-emerald-950/30'
                            const statusText = execution >= 100 ? 'text-rose-600' : execution >= 70 ? 'text-amber-600' : 'text-emerald-600'

                            return (
                                <tr key={alloc.id} className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-50/30 dark:bg-zinc-800/10'} hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group`}>
                                    <td className="px-8 py-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-indigo-500/70 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 w-fit px-1.5 py-0.5 rounded">
                                                {alloc.companyAccount?.globalAccount?.code || alloc.account?.code || 'S/C'}
                                            </span>
                                            <span className="font-bold text-foreground text-[13px] leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {alloc.companyAccount?.globalAccount?.name || alloc.account?.name || 'Sin nombre'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[10px] font-black text-zinc-400">
                                            {weight.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-2 text-right">
                                        <span className="font-black text-foreground tabular-nums">
                                            ${formatNumber(alloc.amountUSD)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2">
                                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                                            <div className="flex items-baseline gap-1">
                                                <span className={`${statusText} text-lg font-black tracking-tighter`}>{execution.toFixed(0)}%</span>
                                                <span className="text-zinc-400 text-[10px] font-bold uppercase">Ejecutado</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                                <div 
                                                    className={`h-full ${statusColor} transition-all duration-500 ease-out`}
                                                    style={{ width: `${Math.min(execution, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-2 text-right tabular-nums text-zinc-500 font-bold text-xs">
                                        ${formatNumber(alloc.consumedUSD)}
                                    </td>
                                    <td className="px-6 py-2 text-right">
                                        <div className={`inline-flex flex-col items-end px-3 py-1 rounded-xl ${statusBg} ${statusText}`}>
                                            <span className="text-xs font-black tabular-nums">${formatNumber(available)}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Saldo</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-2">
                                        <InlineAdjustmentForm 
                                            allocationId={alloc.id.toString()} 
                                            onSubmit={handleApplyAdjustment} 
                                            isPending={isPending}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            
            {optimisticAllocations.length === 0 && (
                <div className="px-8 py-20 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                        <Activity className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-zinc-500 font-medium italic">Sin fondos distribuidos en este ciclo.</p>
                </div>
            )}
        </div>
    )
}
