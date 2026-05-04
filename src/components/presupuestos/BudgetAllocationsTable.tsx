"use client"

import { useOptimistic, useTransition } from "react"
import { InlineAdjustmentForm } from "./AllocationForms"
import { registerAdjustment } from "@/features/budgets/server/actions"
import { toast } from "sonner"

type Allocation = {
    id: number
    amountUSD: number
    consumedUSD: number
    category: { name: string }
    subcategory: { name: string } | null
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
                    description: `${amount > 0 ? '+' : ''}${amount} USD aplicados a la categoría.`
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
                <h2 className="text-lg font-bold text-foreground">Distribución Categórica</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse table-auto">
                    <thead className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800/50">
                        <tr>
                            <th className="px-6 py-4 min-w-[240px]">Área de Gasto (Categoría)</th>
                            <th className="px-6 py-4 text-right">Límite Aprobado</th>
                            <th className="px-6 py-4 text-right">Consumido</th>
                            <th className="px-6 py-4 text-right">Disponible</th>
                            <th className="px-6 py-4 text-right bg-rose-50/30 dark:bg-rose-950/20 border-l border-zinc-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 min-w-[360px]">Acción de Ajuste</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                        {optimisticAllocations.map((alloc) => (
                            <tr key={alloc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="font-bold text-foreground text-[14px] whitespace-normal">{alloc.category.name}</div>
                                    {alloc.subcategory && <div className="text-xs text-muted-foreground mt-0.5 font-medium italic">↳ {alloc.subcategory.name}</div>}
                                </td>
                                <td className="px-6 py-5 text-right font-black text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                    ${Number(alloc.amountUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-5 text-right tabular-nums text-zinc-500 font-bold whitespace-nowrap">
                                    ${Number(alloc.consumedUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`px-6 py-5 text-right tabular-nums font-black whitespace-nowrap ${(Number(alloc.amountUSD) - Number(alloc.consumedUSD)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    ${(Number(alloc.amountUSD) - Number(alloc.consumedUSD)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right border-l border-zinc-200 dark:border-zinc-800 bg-rose-50/5 dark:bg-rose-950/10">
                                    <InlineAdjustmentForm 
                                        allocationId={alloc.id.toString()} 
                                        onSubmit={handleApplyAdjustment} 
                                        isPending={isPending}
                                    />
                                </td>
                            </tr>
                        ))}
                        {optimisticAllocations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium italic">Sin fondos distribuidos en este ciclo.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
