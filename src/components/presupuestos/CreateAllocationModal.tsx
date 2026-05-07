"use client"

import { useState, useTransition } from "react"
import { upsertAllocation } from "@/features/budgets/server/actions"
import { toast } from "sonner"
import { Loader2, Plus, X, PieChart, Info } from "lucide-react"
import { AccountSelector } from "@/components/accounts/AccountSelector"

export function CreateAllocationModal({ 
  budgetId, 
  availableCategories, 
  userRole,
  companyId
}: { 
  budgetId: string, 
  availableCategories: any[], 
  userRole: string,
  companyId?: number
}) {
  const categoriesList = Array.isArray(availableCategories) ? availableCategories : (availableCategories as any).items || []
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedCompanyAccountId, setSelectedCompanyAccountId] = useState<number | null>(null)
  const [selectedGlobalAccountId, setSelectedGlobalAccountId] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    if (selectedCompanyAccountId) {
      formData.set("companyAccountId", selectedCompanyAccountId.toString())
    }
    if (selectedGlobalAccountId) {
      formData.set("globalAccountId", selectedGlobalAccountId.toString())
    }

    startTransition(async () => {
      try {
        await upsertAllocation(formData)
        toast.success("Fondos distribuidos correctamente")
        setIsOpen(false)
        setSelectedCompanyAccountId(null)
        setSelectedGlobalAccountId(null)
      } catch (err: any) {
        toast.error(err.message || "Error al distribuir fondos")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Asignar Fondos
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
             {/* Header */}
             <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                      <PieChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground">Asignar Fondos</h2>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">Distribuye el presupuesto maestro.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="absolute top-6 right-6 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors disabled:opacity-50"
                >
                    <X className="w-4 h-4" />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                <input type="hidden" name="budgetId" value={budgetId} />
                
                <div className="space-y-4">
                    <AccountSelector 
                      label="Cuenta Contable (Prioridad)"
                      placeholder="Buscar cuenta presupuestable..."
                      onSelect={(id) => {
                        setSelectedCompanyAccountId(id)
                        setSelectedGlobalAccountId(null)
                      }}
                      isBudgetable={true}
                      companyId={companyId}
                    />

                    {userRole === 'SUPER_ADMIN' && (
                      <AccountSelector 
                        label="O buscar en Catálogo Global"
                        placeholder="Buscar en todo el catálogo..."
                        onSelect={(id) => {
                          setSelectedGlobalAccountId(id)
                          setSelectedCompanyAccountId(null)
                        }}
                        isBudgetable={true}
                        includeGlobal={true}
                        type={["ASSET", "LIABILITY", "EQUITY", "COST", "EXPENSE"]}
                      />
                    )}

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-100 dark:border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black">
                            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 tracking-widest">o bien usar</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Categoría Legacy</label>
                        <select 
                          name="categoryId" 
                          disabled={isPending || !!selectedCompanyAccountId || !!selectedGlobalAccountId} 
                          defaultValue="" 
                          className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 appearance-none"
                        >
                            <option value="" disabled>Selecciona categoría...</option>
                            {categoriesList.filter((c: any) => c.type === 'EXPENSE').map((c: any) => (
                                <option key={c.id} value={c.id.toString()}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-500/5 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/10 flex gap-3">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed">
                        Si seleccionas una cuenta contable, esta tendrá prioridad sobre la categoría legacy para reportes avanzados.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Fondos a Asignar ($ USD)</label>
                    <input type="number" step="0.01" name="amountUSD" required disabled={isPending} placeholder="0.00" className="w-full h-11 px-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-sm font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50" />
                </div>

                <button type="submit" disabled={isPending} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-2 mt-2 hover:opacity-90 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                    {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                    Confirmar Distribución
                </button>
             </form>
          </div>
        </div>
      )}
    </>
  )
}
