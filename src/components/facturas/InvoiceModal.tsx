"use client"

import { useState, useTransition, useEffect } from "react"
import { createInvoice, updateInvoice, getRateByDate } from "@/features/invoices/server/actions"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"
import { CheckCircle2, Loader2, X, FileText, Calendar, Building2, Receipt, DollarSign, Wallet } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Importación dinámica para evitar errores de Webpack con librerías de cliente
const NumericFormat = dynamic(
  () => import("react-number-format").then((mod) => mod.NumericFormat),
  { ssr: false }
)

type InvoiceModalProps = {
    mode: "create" | "edit"
    invoice?: any
    availableAllocations: any[]
    currentBcvRate?: string | number
    onClose: () => void
}

export function InvoiceModal({ 
    mode, 
    invoice, 
    availableAllocations, 
    currentBcvRate, 
    onClose 
}: InvoiceModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // Estados para manejar los valores numéricos "limpios" (puntos para decimales) para el servidor
  const [valAmountUSD, setValAmountUSD] = useState(invoice?.amountUSD ? String(invoice.amountUSD) : "")
  const [valExchangeRate, setValExchangeRate] = useState(invoice?.exchangeRate ? String(invoice.exchangeRate) : (currentBcvRate ? String(currentBcvRate) : ""))
  const [valDate, setValDate] = useState(invoice?.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

  // Efecto para buscar la tasa histórica si cambia la fecha
  useEffect(() => {
    const fetchHistoricalRate = async () => {
        if (!valDate || mode === 'edit') return 
        const rate = await getRateByDate(valDate)
        if (rate) {
            setValExchangeRate(rate)
            toast.info(`Tasa sugerida para el día ${valDate} cargada automáticamente.`)
        }
    }
    fetchHistoricalRate()
  }, [valDate, mode])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Inyectamos los valores numéricos limpios (sin formato visual) al FormData
    formData.set("amountUSD", valAmountUSD.toString())
    formData.set("exchangeRate", valExchangeRate.toString())

    startTransition(async () => {
      try {
         if (mode === "create") {
            await createInvoice(formData)
            toast.success("Factura registrada y presupuesto impactado")
         } else {
            await updateInvoice(formData)
            toast.success("Factura actualizada y recálculo completado")
         }
         onClose()
      } catch (err: any) {
         toast.error(err.message || "Fallo en la operación")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${mode === 'create' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                    {mode === 'create' ? <PlusIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                        {mode === 'create' ? 'Nueva Factura' : 'Editar Factura'}
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium">
                        {mode === 'create' ? 'Registre un nuevo egreso operativo' : `Modificando registro #${invoice.number}`}
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {mode === 'edit' && <input type="hidden" name="invoiceId" value={invoice.id} />}
            
            {/* Destino del Gasto */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Impacto Estratégico (Destino)
                </label>
                <select 
                    name="allocationId" 
                    required 
                    defaultValue={invoice?.allocationId || ""}
                    disabled={isPending} 
                    className="w-full h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                    <option value="" disabled>Seleccione Categoría / Presupuesto...</option>
                    {availableAllocations.map(alloc => (
                        <option key={alloc.id} value={alloc.id}>{alloc.label}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Receipt className="w-3 h-3" /> Proveedor / Emisor
                    </label>
                    <input 
                        type="text" 
                        name="supplierName" 
                        required 
                        defaultValue={invoice?.supplierName || ""}
                        disabled={isPending} 
                        placeholder="Ej. Servitel C.A." 
                        className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 text-sm font-medium outline-none focus:border-indigo-500" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Número de Factura
                    </label>
                    <input 
                        type="text" 
                        name="number" 
                        required 
                        defaultValue={invoice?.number || ""}
                        disabled={isPending} 
                        placeholder="Ej. 123456" 
                        className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 text-sm font-medium outline-none focus:border-indigo-500" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Fecha
                    </label>
                    <input 
                        type="date" 
                        name="date" 
                        required 
                        value={valDate}
                        onChange={(e) => setValDate(e.target.value)}
                        disabled={isPending} 
                        className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 text-sm font-medium outline-none focus:border-indigo-500" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                        <DollarSign className="w-3 h-3" /> Monto (USD)
                    </label>
                    <NumericFormat 
                        thousandSeparator="." 
                        decimalSeparator="," 
                        value={valAmountUSD}
                        onValueChange={(values) => setValAmountUSD(values.value)}
                        disabled={isPending} 
                        placeholder="0,00"
                        className="w-full h-11 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-500/5 px-4 text-sm font-black text-emerald-600 outline-none focus:border-emerald-500" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Tasa (BCV)
                    </label>
                    <NumericFormat 
                        thousandSeparator="." 
                        decimalSeparator="," 
                        value={valExchangeRate}
                        onValueChange={(values) => setValExchangeRate(values.value)}
                        disabled={isPending} 
                        decimalScale={4}
                        placeholder="0,0000"
                        className="w-full h-11 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-500/5 px-4 text-sm font-black text-amber-600 outline-none focus:border-amber-500" 
                    />
                </div>
            </div>

            <FileUploadInput name="attachment" currentFile={invoice?.attachmentName} />

            <div className="pt-4 flex gap-4">
                <button 
                    type="button" 
                    onClick={onClose} 
                    disabled={isPending}
                    className="flex-1 h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={isPending} 
                    className={`flex-[2] h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${mode === 'create' ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700' : 'bg-zinc-900 dark:bg-indigo-500 text-white shadow-zinc-900/20 hover:opacity-90'}`}
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isPending ? 'Procesando...' : mode === 'create' ? 'Consolidar Factura' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}

function PlusIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
}
