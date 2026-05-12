"use client"

import { useState, useTransition } from "react"
import { transferFunds } from "@/features/budgets/server/actions"
import { ArrowRightLeft, Send, Loader2, X, AlertCircle, TrendingDown, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { formatNumber } from "@/lib/utils"

type Allocation = {
    id: number
    category?: { name: string } | null
    account?: { code?: string, name: string } | null
    companyAccount?: { globalAccount: { code: string, name: string } } | null
    amountUSD: any
    consumedUSD: any
}

type FundTransferModalProps = {
    allocations: Allocation[]
    budgetId: number
}

export function FundTransferModal({ allocations, budgetId }: FundTransferModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [sourceId, setSourceId] = useState<string>("")
    const [targetId, setTargetId] = useState<string>("")
    const [amount, setAmount] = useState<string>("")

    const sourceAlloc = allocations.find(a => a.id.toString() === sourceId)
    const targetAlloc = allocations.find(a => a.id.toString() === targetId)

    const remainingSource = sourceAlloc ? Number(sourceAlloc.amountUSD) - Number(sourceAlloc.consumedUSD) : 0
    const amountNum = Number(amount) || 0
    const isOverLimit = amountNum > remainingSource

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        if (sourceId === targetId) {
            toast.error("El origen y destino no pueden ser el mismo")
            return
        }

        if (isOverLimit) {
            toast.error("El monto excede el saldo disponible en el origen")
            return
        }

        startTransition(async () => {
            try {
                await transferFunds(formData)
                toast.success("Transferencia ejecutada con éxito")
                setIsOpen(false)
                setAmount("")
                setSourceId("")
                setTargetId("")
            } catch (error: any) {
                toast.error(error.message || "Error al transferir fondos")
            }
        })
    }

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="h-10 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-indigo-200/50 dark:border-indigo-500/20"
            >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir Fondos
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-foreground">Transferencia</h2>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Movimiento de fondos interno</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                {/* Origen */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Origen (Sale)
                                    </label>
                                    <select 
                                        name="sourceAllocationId" 
                                        value={sourceId}
                                        onChange={(e) => setSourceId(e.target.value)}
                                        required 
                                        className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">Selecciona origen...</option>
                                        {allocations.map(a => {
                                            const name = a.companyAccount?.globalAccount?.name || a.account?.name || 'Sin nombre'
                                            const available = Number(a.amountUSD) - Number(a.consumedUSD)
                                            return (
                                                <option key={a.id} value={a.id.toString()}>
                                                    {name} (Disp: ${formatNumber(available)})
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>

                                {/* Destino */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Destino (Entra)
                                    </label>
                                    <select 
                                        name="targetAllocationId" 
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required 
                                        className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">Selecciona destino...</option>
                                        {allocations.filter(a => a.id.toString() !== sourceId).map(a => {
                                            const name = a.companyAccount?.globalAccount?.name || a.account?.name || 'Sin nombre'
                                            return (
                                                <option key={a.id} value={a.id.toString()}>{name}</option>
                                            )
                                        })}
                                    </select>
                                </div>

                                {/* Monto */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monto USD</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            name="amountUSD" 
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            step="0.01" 
                                            required 
                                            placeholder="0.00" 
                                            className={`w-full h-12 pl-10 pr-4 bg-zinc-50 dark:bg-zinc-950 border ${isOverLimit ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl text-sm font-black text-foreground outline-none transition-all`}
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">$</div>
                                    </div>
                                    {isOverLimit && (
                                        <p className="text-[10px] text-rose-500 font-bold uppercase flex items-center gap-1 mt-1">
                                            <AlertCircle className="w-3 h-3" /> El monto excede el disponible (${formatNumber(remainingSource)})
                                        </p>
                                    )}
                                </div>

                                {/* Motivo */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Motivo de transferencia</label>
                                    <input 
                                        name="reason"
                                        placeholder="Ej. Ajuste por redistribución..."
                                        className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium outline-none"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {sourceAlloc && targetAlloc && amountNum > 0 && (
                                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center gap-4">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-zinc-400 mb-1">Origen</p>
                                        <p className="text-xs font-bold truncate max-w-[80px]">{sourceAlloc.companyAccount?.globalAccount?.name || sourceAlloc.account?.name}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-zinc-400 mb-1">Monto</p>
                                        <p className="text-sm font-black text-indigo-600">${formatNumber(amountNum)}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-zinc-400 mb-1">Destino</p>
                                        <p className="text-xs font-bold truncate max-w-[80px]">{targetAlloc.companyAccount?.globalAccount?.name || targetAlloc.account?.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isPending || isOverLimit || !amount || !sourceId || !targetId}
                                    className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20 disabled:opacity-30 disabled:grayscale disabled:scale-100"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isPending ? 'Procesando...' : 'Ejecutar Movimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
