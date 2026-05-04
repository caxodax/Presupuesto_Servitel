"use client"

import { useTransition } from "react"
import { registerAdjustment } from "@/features/budgets/server/actions"
import { toast } from "sonner"
import { Loader2, PlusCircle } from "lucide-react"

type InlineAdjustmentFormProps = {
    allocationId: string
    onSubmit?: (formData: FormData) => Promise<void>
    isPending?: boolean
}

export function InlineAdjustmentForm({ allocationId, onSubmit, isPending: externalPending }: InlineAdjustmentFormProps) {
  const [internalPending, startTransition] = useTransition()
  const isPending = externalPending || internalPending

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    if (onSubmit) {
        onSubmit(formData).then(() => form.reset())
        return
    }

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-end justify-center w-full animate-in fade-in duration-300">
      <input type="hidden" name="allocationId" value={allocationId} />
      <div className="flex gap-2 w-full max-w-[320px]">
        <input 
            type="number" 
            step="0.01" 
            name="amountUSD" 
            required 
            disabled={isPending} 
            placeholder="± $0.00" 
            className="w-24 h-9 text-xs font-black bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 disabled:opacity-50 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" 
        />
        <input 
            type="text" 
            name="reason" 
            required 
            disabled={isPending} 
            placeholder="Razón del ajuste..." 
            className="flex-1 h-9 text-xs font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 disabled:opacity-50 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" 
        />
      </div>
      <button 
        type="submit" 
        disabled={isPending} 
        className="text-[10px] items-center flex gap-2 font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2 rounded-xl disabled:opacity-50 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 active:scale-95"
      >
         {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
         Aplicar Ajuste
      </button>
    </form>
  )
}
