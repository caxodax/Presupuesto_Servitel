"use client"

import { useState } from "react"
import { Building2, Edit2, Check, X, Power, ShieldAlert, CheckCircle2 } from "lucide-react"
import { updateCompany, toggleCompanyStatus } from "@/features/companies/server/actions"

export function CompanyRow({ company }: { company: any }) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <tr className={`group border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 ${!company.isActive ? 'bg-zinc-50/50 dark:bg-zinc-900/40' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}>
      <td className="px-6 py-5">
         <div className="flex items-center gap-4">
            <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 shadow-sm
               ${company.isActive 
                  ? 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-100 dark:border-indigo-500/20 shadow-indigo-500/5' 
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 opacity-60'}`}>
               <Building2 className={`w-6 h-6 ${company.isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
               {company.isActive && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
               )}
            </div>

            {isEditing ? (
              <form action={async (fd) => {
                 await updateCompany(company.id, fd);
                 setIsEditing(false);
              }} className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                 <input 
                    type="text" 
                    name="name" 
                    defaultValue={company.name} 
                    autoFocus 
                    required 
                    className="h-9 w-full max-w-[280px] rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-950 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" 
                 />
                 <div className="flex gap-1">
                    <button type="submit" className="h-9 w-9 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg shadow-sm shadow-emerald-500/20 transition-all active:scale-95">
                       <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="h-9 w-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-all active:scale-95">
                       <X className="w-4 h-4" />
                    </button>
                 </div>
              </form>
            ) : (
               <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <span className={`text-sm font-black tracking-tight transition-colors ${company.isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                       {company.name}
                    </span>
                    <button 
                       onClick={() => setIsEditing(true)} 
                       className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-indigo-500 transition-all active:scale-90"
                       title="Editar Nombre"
                    >
                       <Edit2 className="w-3 h-3" />
                    </button>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border transition-all
                       ${company.isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase'
                       }`}>
                       {company.isActive ? 'Activo' : 'Suspendido'}
                    </div>
                 </div>
               </div>
            )}
         </div>
      </td>
      <td className="px-6 py-5 text-right">
         <div className="flex items-center justify-end gap-3">
            <form action={toggleCompanyStatus.bind(null, company.id)} className="inline-block">
               <button 
                 type="submit" 
                 className={`
                   relative flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider
                   transition-all duration-300 transform active:scale-[0.97] border shadow-sm
                   ${company.isActive 
                     ? 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 dark:hover:border-rose-900/50' 
                     : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-400 shadow-indigo-500/20 hover:opacity-90'
                   }
                 `}
                >
                   {company.isActive ? (
                      <>
                         <ShieldAlert className="w-3.5 h-3.5" />
                         Suspender Acceso
                      </>
                   ) : (
                      <>
                         <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                         Reactivar Entidad
                      </>
                   )}
                </button>
            </form>
         </div>
      </td>
    </tr>
  )
}
