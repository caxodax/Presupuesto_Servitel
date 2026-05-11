"use client"

import { useOptimistic, useTransition } from "react"
import { InlineAdjustmentForm } from "./AllocationForms"
import { registerAdjustment } from "@/features/budgets/server/actions"
import { toast } from "sonner"

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
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden w-full">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-lg font-bold text-foreground">Distribución Presupuestaria</h2>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <table className="w-full text-sm text-left border-collapse table-auto">
                    <thead className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800/50 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-3 min-w-[240px]">Cuenta Contable</th>
                            <th className="px-4 py-3 text-center">% Part.</th>
                            <th className="px-6 py-3 text-right">Límite Aprobado</th>
                            <th className="px-4 py-3 text-center">% Ejec.</th>
                            <th className="px-6 py-3 text-right">Consumido</th>
                            <th className="px-6 py-3 text-right">Disponible</th>
                            <th className="px-6 py-3 text-right bg-rose-50/80 dark:bg-rose-950/40 border-l border-zinc-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 min-w-[360px] sticky top-0">Acción de Ajuste</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                        {optimisticAllocations.map((alloc) => {
                            const weight = totalBudget > 0 ? (Number(alloc.amountUSD) / totalBudget) * 100 : 0
                            const execution = Number(alloc.amountUSD) > 0 ? (Number(alloc.consumedUSD) / Number(alloc.amountUSD)) * 100 : 0
                            
                            return (
                                <tr key={alloc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                                    <td className="px-6 py-2">
                                        {alloc.companyAccount || alloc.account ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5">
                                                    {alloc.companyAccount?.globalAccount?.code || alloc.account?.code}
                                                </span>
                                                <div className="font-bold text-foreground text-[14px] whitespace-normal leading-tight">
                                                    {alloc.companyAccount?.globalAccount?.name || alloc.account?.name}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="font-bold text-foreground text-[14px] whitespace-normal">Sin cuenta vinculada</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                            {weight.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-2 text-right font-black text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                        ${Number(alloc.amountUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                                            execution > 90 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 
                                            execution > 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 
                                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                        }`}>
                                            {execution.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-2 text-right tabular-nums text-zinc-500 font-bold whitespace-nowrap">
                                        ${Number(alloc.consumedUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className={`px-6 py-2 text-right tabular-nums font-black whitespace-nowrap ${(Number(alloc.amountUSD) - Number(alloc.consumedUSD)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        ${(Number(alloc.amountUSD) - Number(alloc.consumedUSD)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-2 text-right border-l border-zinc-200 dark:border-zinc-800 bg-rose-50/5 dark:bg-rose-950/10">
                                        <InlineAdjustmentForm 
                                            allocationId={alloc.id.toString()} 
                                            onSubmit={handleApplyAdjustment} 
                                            isPending={isPending}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                        {optimisticAllocations.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium italic">Sin fondos distribuidos en este ciclo.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
