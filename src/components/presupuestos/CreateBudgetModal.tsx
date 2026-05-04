"use client"

import { useEffect, useState, useTransition } from "react"
import { createBudget } from "@/features/budgets/server/actions"
import { toast } from "sonner"
import { Loader2, Plus, X, Layers } from "lucide-react"

export function CreateBudgetModal({ 
  companies, 
  branches,
  defaultCompanyId
}: { 
  companies: any[], 
  branches: any[],
  defaultCompanyId?: string
}) {
   const [isOpen, setIsOpen] = useState(false)
   const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
   const [selectedCompany, setSelectedCompany] = useState(defaultCompanyId || (companiesList.length === 1 ? companiesList[0].id : ""))
   
   useEffect(() => {
     if (defaultCompanyId) {
        setSelectedCompany(defaultCompanyId)
     }
   }, [defaultCompanyId])

   const branchesList = Array.isArray(branches) ? branches : (branches as any).items || []
   const filteredBranches = branchesList.filter((b: any) => {
      const compId = b.company_id || b.companyId;
      return compId && compId.toString() === selectedCompany.toString();
   })
   const [isPending, startTransition] = useTransition()

   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
       e.preventDefault()
       const formData = new FormData(e.currentTarget)
       const form = e.currentTarget
       
       startTransition(async () => {
           try {
               await createBudget(formData)
               toast.success("Ciclo presupuestario aperturado con éxito")
               form.reset()
               setIsOpen(false)
           } catch (error: any) {
               toast.error(error.message || "Error al aperturar el ciclo")
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
        Aperturar Ciclo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                    <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">Aperturar Ciclo</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Manejo de ciclos operativos y divisiones.</p>
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

            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Etiqueta de Ciclo</label>
                <input type="text" name="name" required disabled={isPending} placeholder="Q1 2026 - Central" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
              </div>

              {companiesList.length > 1 && (
                 <div className="space-y-1.5 md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Corporación / Empresa</label>
                   <select 
                     value={selectedCompany} 
                     onChange={(e) => setSelectedCompany(e.target.value)}
                     required 
                     disabled={isPending}
                     className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
                   >
                     <option value="" disabled>Selecciona la Empresa...</option>
                     {companiesList.map((company: any) => (
                        <option key={company.id} value={company.id.toString()}>{company.name}</option>
                     ))}
                   </select>
                 </div>
              )}

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Sucursal Anclada</label>
                <select name="branchId" defaultValue="" required disabled={isPending || (!selectedCompany && companiesList.length > 1)} className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50">
                  <option value="" disabled>Selecciona la Sucursal...</option>
                  {filteredBranches.map((branch: any) => (
                     <option key={branch.id} value={branch.id.toString()}>{branch.name}</option>
                  ))}
                </select>
                {selectedCompany && filteredBranches.length === 0 && (
                   <p className="text-[10px] text-amber-500 mt-1">Esta empresa no tiene sucursales registradas.</p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Inicio</label>
                <input type="date" name="initialDate" disabled={isPending} required className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Cierre</label>
                <input type="date" name="endDate" disabled={isPending} required className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Límite Base ($ USD)</label>
                <input type="number" step="0.01" name="amountLimitUSD" disabled={isPending} required placeholder="50000.00" className="w-full h-11 px-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-sm font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-50" />
              </div>

              <div className="md:col-span-2 pt-4">
                  <button type="submit" disabled={isPending || !selectedCompany || filteredBranches.length === 0} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                    {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isPending ? "Aprobando..." : "Aprobar Apertura"}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
   )
}
