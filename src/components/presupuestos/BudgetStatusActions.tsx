"use client"

import { useTransition } from "react"
import { closeBudgetMaster, reactivateBudgetMaster } from "@/features/budgets/server/actions"
import { Power, Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

type Props = {
  budgetId: number
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT'
  periodLabel: string
}

export function BudgetStatusActions({ budgetId, status, periodLabel }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleClose = () => {
    if (!confirm(`¿Está seguro de cerrar este periodo (${periodLabel})? Una vez cerrado, no se podrán registrar más facturas ni realizar ajustes.`)) return

    startTransition(async () => {
      try {
        await closeBudgetMaster(budgetId)
        toast.success("Periodo cerrado exitosamente")
      } catch (err: any) {
        toast.error("Error al cerrar periodo", {
          description: err.message
        })
      }
    })
  }

  const handleReactivate = () => {
    if (!confirm(`¿Está seguro de volver a reactivar este presupuesto para el periodo ${periodLabel}?`)) return

    startTransition(async () => {
      try {
        await reactivateBudgetMaster(budgetId)
        toast.success("Presupuesto reactivado exitosamente")
      } catch (err: any) {
        toast.error("Error al reactivar presupuesto", {
          description: err.message
        })
      }
    })
  }

  if (status === 'ACTIVE') {
    return (
      <button
        onClick={handleClose}
        disabled={isPending}
        className="h-10 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-rose-200/50 dark:border-rose-500/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
        Cerrar Periodo
      </button>
    )
  }

  if (status === 'CLOSED') {
    return (
      <button
        onClick={handleReactivate}
        disabled={isPending}
        className="h-10 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-emerald-200/50 dark:border-emerald-500/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        Reactivar Periodo
      </button>
    )
  }

  return null
}
