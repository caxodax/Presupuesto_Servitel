"use client"

import { useState } from "react"
import { Building2, Edit2, Check, X } from "lucide-react"
import { updateCompany, toggleCompanyStatus } from "@/features/companies/server/actions"

export function CompanyRow({ company }: { company: any }) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <tr className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group ${!company.isActive ? 'opacity-80 grayscale' : ''}`}>
      <td className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Building2 className={`w-4 h-4 ${company.isActive ? 'text-zinc-400 group-hover:text-indigo-400' : 'text-zinc-500'} transition-colors`} />
         </div>
         {isEditing ? (
           <form action={async (fd) => {
              await updateCompany(company.id, fd);
              setIsEditing(false);
           }} className="flex items-center gap-2 flex-1">
              <input type="text" name="name" defaultValue={company.name} autoFocus required className="h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none w-full max-w-[200px]" />
              <button type="submit" className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md transition-colors">
                 <Check className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 rounded-md transition-colors">
                 <X className="w-3.5 h-3.5" />
              </button>
           </form>
         ) : (
           <div className="flex items-center gap-3">
             <span className={`font-medium ${company.isActive ? 'text-foreground' : 'text-zinc-500 line-through decoration-zinc-400'}`}>{company.name}</span>
             <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-500 transition-all">
                <Edit2 className="w-3 h-3" />
             </button>
           </div>
         )}
      </td>
      <td className="px-6 py-4 space-x-3 text-right">
         <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold tracking-wider ${company.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
            {company.isActive ? 'ACTIVA' : 'INACTIVA'}
         </span>
         
         <form action={toggleCompanyStatus.bind(null, company.id)} className="inline-block">
            <button type="submit" className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${company.isActive ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-600 dark:bg-amber-500/10 dark:hover:bg-amber-500/20' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20'}`}>
               {company.isActive ? 'Desactivar' : 'Activar'}
            </button>
         </form>
      </td>
    </tr>
  )
}
