"use client"
import { useState } from "react"
import { Edit3, Save, X, Loader2 } from "lucide-react"
import { updateBudgetMaster } from "@/features/budgets/server/actions"

export function MasterBudgetEditor({ 
    budgetId, 
    currentLimit 
}: { 
    budgetId: string, 
    currentLimit: number 
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [amount, setAmount] = useState(currentLimit.toString())
    const [isPending, setIsPending] = useState(false)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsPending(true)
        try {
            const formData = new FormData()
            formData.append("budgetId", budgetId)
            formData.append("amountLimitUSD", amount)
            await updateBudgetMaster(formData)
            setIsEditing(false)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsPending(false)
        }
    }

    if (isEditing) {
        return (
            <form onSubmit={handleSave} className="flex flex-col items-end gap-2 animate-in fadeIn duration-200">
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500">Nuevo Límite Maestro (USD)</h3>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-32 h-9 px-3 text-right font-bold text-lg bg-white dark:bg-zinc-950 border-2 border-indigo-500 rounded-xl outline-none shadow-lg shadow-indigo-500/10"
                        autoFocus
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={isPending}
                        className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setIsEditing(false); setAmount(currentLimit.toString()); }}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-all active:scale-95"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </form>
        )
    }

    return (
        <div className="text-right group">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1 flex items-center justify-end gap-2">
                Presupuesto Master (USD)
                <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-500 transition-all"
                    title="Editar Presupuesto Maestro"
                >
                    <Edit3 className="w-3 h-3" />
                </button>
            </h3>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${currentLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
        </div>
    )
}
