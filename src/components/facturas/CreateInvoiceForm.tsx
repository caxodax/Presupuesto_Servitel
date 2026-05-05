"use client"

import { useTransition } from "react"
import { createInvoice } from "@/features/invoices/server/actions"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CreateInvoiceForm({ 
    availableAllocations, 
    currentBcvRate 
}: { 
    availableAllocations: any[], 
    currentBcvRate: string | number 
}) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    
    startTransition(async () => {
      try {
         await createInvoice(formData)
         toast.success("Factura consolidada y procesada")
         form.reset()
      } catch (err: any) {
         toast.error(err.message || "Fallo al registrar factura")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="flex flex-col gap-6">
        <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 uppercase">Impacto Estratégico (Destino del Gasto)</label>
            <select name="allocationId" defaultValue="" required disabled={isPending} className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50">
            <option value="" disabled>Identificador Viga / Categoría / Presupuesto Maestro...</option>
            {availableAllocations.map(alloc => (
                <option key={alloc.id} value={alloc.id}>{alloc.label}</option>
            ))}
            </select>
            <p className="text-xs text-zinc-500 font-medium italic mt-1">Este gasto restará capacidad operativa exclusivamente de la rama seleccionada.</p>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-zinc-500">Proveedor / Emisor</label>
            <input type="text" name="supplierName" required disabled={isPending} placeholder="Consultores Lógica C.A." className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-zinc-500">Número de Factura</label>
            <input type="text" name="number" required disabled={isPending} placeholder="001-0004523" className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500 disabled:opacity-50" />
            </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-zinc-500">Fecha Operativa</label>
            <input type="date" name="date" required disabled={isPending} className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-emerald-600">Base Imponible (USD)</label>
            <input type="number" step="0.01" name="amountUSD" required disabled={isPending} placeholder="$0.00" className="w-full h-9 rounded-md border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-amber-600">Referencia BCV (Tasa)</label>
            <input type="number" step="0.0001" name="exchangeRate" required disabled={isPending} defaultValue={currentBcvRate} placeholder="Ej. 36.5021" className="w-full h-9 rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold text-foreground outline-none focus:border-amber-500 disabled:opacity-50" />
            {currentBcvRate && <p className="text-[10px] text-amber-600/80 font-medium">Auto-obtenido de DolarApi Oficial</p>}
            </div>
        </div>

        <FileUploadInput name="attachment" />

        <button type="submit" disabled={isPending} className="w-full h-11 bg-indigo-600 text-white rounded-md flex items-center justify-center gap-2 mt-4 hover:bg-indigo-700 active:scale-[0.98] transition-all font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isPending ? 'Validando e inyectando...' : 'Consolidar Factura y Procesar Resta'}
        </button>
    </form>
  )
}
