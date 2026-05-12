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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full animate-in fade-in duration-300">
      <input type="hidden" name="allocationId" value={allocationId} />
      <div className="flex-1 flex gap-1.5">
        <div className="relative group/input">
            <input 
                type="number" 
                step="0.01" 
                name="amountUSD" 
                required 
                disabled={isPending} 
                placeholder="0.00" 
                className="w-20 h-8 text-[11px] font-black bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-5 pr-1.5 disabled:opacity-50 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-rose-600" 
            />
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-rose-400 font-bold">$</div>
        </div>
        <input 
            type="text" 
            name="reason" 
            required 
            disabled={isPending} 
            placeholder="Motivo..." 
            className="flex-1 h-8 text-[11px] font-medium bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 disabled:opacity-50 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" 
        />
      </div>
      <button 
        type="submit" 
        disabled={isPending} 
        className="h-8 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-all border border-rose-200/50 dark:border-rose-500/20 active:scale-95 disabled:opacity-50"
      >
         {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
      </button>
    </form>
  )
}
