"use client"

import { useTransition } from "react"
import { registerAdjustment } from "@/features/budgets/server/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function InlineAdjustmentForm({ allocationId }: { allocationId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    startTransition(async () => {
      try {
        await registerAdjustment(formData)
        toast.success("Ajuste aplicado sobre la categoría")
        form.reset()
      } catch (err: any) {
        toast.error(err.message || "Error al aplicar ajuste")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-end justify-center w-full">
      <input type="hidden" name="allocationId" value={allocationId} />
      <div className="flex gap-2 w-full max-w-[320px]">
        <input type="number" step="0.01" name="amountUSD" required disabled={isPending} placeholder="± $0.00" className="opacity-80 hover:opacity-100 transition-opacity w-24 h-8 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 disabled:opacity-50 outline-none focus:ring-1 focus:ring-rose-500/50" />
        <input type="text" name="reason" required disabled={isPending} placeholder="Razón del ajuste..." className="opacity-80 hover:opacity-100 transition-opacity flex-1 h-8 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 disabled:opacity-50 outline-none focus:ring-1 focus:ring-rose-500/50" />
      </div>
      <button type="submit" disabled={isPending} className="text-[10px] items-center flex gap-1 font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30">
         {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
         Aplicar Ajuste
      </button>
    </form>
  )
}
