"use client"

import { useState } from "react"
import { createBudget } from "@/features/budgets/server/actions"

export function BudgetForm({ companies, branches }: { companies: any[], branches: any[] }) {
   const [selectedCompany, setSelectedCompany] = useState(companies.length === 1 ? companies[0].id : "")
   
   const filteredBranches = branches.filter(b => b.companyId === selectedCompany)

   return (
       <div className="lg:col-span-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6 h-fit">
           <h2 className="text-lg font-semibold mb-5 text-foreground leading-none">Aperturar Ciclo</h2>
           <form action={createBudget} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Etiqueta de Ciclo</label>
                <input type="text" name="name" required placeholder="Q1 2026 - Central" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
              </div>

              {companies.length > 1 && (
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Corporación / Empresa</label>
                   <select 
                     value={selectedCompany} 
                     onChange={(e) => setSelectedCompany(e.target.value)}
                     required 
                     className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                   >
                     <option value="" disabled>Selecciona la Empresa...</option>
                     {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                     ))}
                   </select>
                 </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sucursal Anclada</label>
                <select name="branchId" defaultValue="" required disabled={!selectedCompany && companies.length > 1} className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50">
                  <option value="" disabled>Selecciona la Sucursal...</option>
                  {filteredBranches.map(branch => (
                     <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                {selectedCompany && filteredBranches.length === 0 && (
                   <p className="text-[10px] text-amber-500 mt-1">Esta empresa no tiene sucursales registradas.</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Inicio</label>
                    <input type="date" name="initialDate" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-2 text-sm outline-none" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cierre</label>
                    <input type="date" name="endDate" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-2 text-sm outline-none" />
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Límite Base ($ USD)</label>
                <input type="number" step="0.01" name="amountLimitUSD" required placeholder="50000.00" className="w-full h-9 rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none font-medium" />
              </div>

              <button type="submit" disabled={!selectedCompany || filteredBranches.length === 0} className="w-full bg-indigo-600 text-white rounded-md h-9 text-sm font-medium hover:bg-indigo-700 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:pointer-events-none">
                Aprobar Apertura
              </button>
           </form>
       </div>
   )
}
