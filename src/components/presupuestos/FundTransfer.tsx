"use client"

import { transferFunds } from "@/features/budgets/server/actions"
import { ArrowRightLeft, Send } from "lucide-react"
import { useState } from "react"

type Allocation = {
    id: string
    category: { name: string }
    amountUSD: any
}

export function FundTransfer({ allocations, budgetId }: { allocations: Allocation[], budgetId: string }) {
    const [isLoading, setIsLoading] = useState(false)

    return (
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500 rounded-lg text-white">
                    <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-wider">Transferencia de Fondos</h3>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">Movimiento Interno (Super Admin Only)</p>
                </div>
            </div>

            <form action={async (fd) => {
                setIsLoading(true)
                try {
                    await transferFunds(fd)
                } catch (e: any) {
                    alert(e.message)
                } finally {
                    setIsLoading(false)
                }
            }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Origen (Sale)</label>
                        <select 
                            name="sourceAllocationId" 
                            required 
                            className="w-full h-10 px-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Selecciona origen...</option>
                            {allocations.map(a => (
                                <option key={a.id} value={a.id}>{a.category.name} (${Number(a.amountUSD).toLocaleString()})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Destino (Entra)</label>
                        <select 
                            name="targetAllocationId" 
                            required 
                            className="w-full h-10 px-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Selecciona destino...</option>
                            {allocations.map(a => (
                                <option key={a.id} value={a.id}>{a.category.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-rose-500 ml-1">Monto a Transferir (USD)</label>
                        <input 
                            type="number" 
                            name="amountUSD" 
                            step="0.01" 
                            required 
                            placeholder="0.00" 
                            className="w-full h-10 px-4 bg-white dark:bg-zinc-950 border border-rose-100 dark:border-rose-900/30 rounded-xl text-sm font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="h-10 px-6 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        {isLoading ? 'Procesando...' : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Transferir
                            </>
                        )}
                    </button>
                </div>
                
                <p className="text-[9px] text-zinc-400 italic text-center">
                    * Esta acción es irreversible y quedará registrada en la bitácora de auditoría forense.
                </p>
            </form>
        </div>
    )
}
