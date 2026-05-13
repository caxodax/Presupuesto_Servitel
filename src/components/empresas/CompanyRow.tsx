"use client"

import { useState, useTransition, useOptimistic } from "react"
import { Building2, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import { toggleCompanyStatus } from "@/features/companies/server/actions"
import { toast } from "sonner"
import { EditCompanyModal } from "./EditCompanyModal"

export function CompanyRow({ company, businessGroups }: { company: any, businessGroups: any[] }) {
  const businessGroupsList = Array.isArray(businessGroups) ? businessGroups : (businessGroups as any).items || []
  const [isPendingToggle, startTransitionToggle] = useTransition();

  const [optimisticCompany, setOptimisticCompany] = useOptimistic(
    company,
    (state, newState: Partial<typeof company>) => ({ ...state, ...newState })
  )

  const handleToggleStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    startTransitionToggle(async () => {
      setOptimisticCompany({ isActive: !optimisticCompany.isActive });
      try {
        await toggleCompanyStatus(company.id);
        toast.success(optimisticCompany.isActive ? "Empresa suspendida" : "Empresa reactivada correctamente");
      } catch (error: any) {
        toast.error(error.message || "Error al cambiar estado");
      }
    });
  }
  
  return (
    <tr className={`group border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 ${!optimisticCompany.isActive ? 'bg-zinc-50/50 dark:bg-zinc-900/40' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}>
      <td className="px-8 py-5">
         <div className="flex items-center gap-4">
            <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 shadow-sm
               ${optimisticCompany.isActive 
                  ? 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-100 dark:border-indigo-500/20 shadow-indigo-500/5' 
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 opacity-60'}`}>
               <Building2 className={`w-6 h-6 ${optimisticCompany.isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
               {optimisticCompany.isActive && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
               )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black tracking-tight transition-colors ${optimisticCompany.isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                   {optimisticCompany.name}
                </span>
                <EditCompanyModal company={company} businessGroups={businessGroupsList} />
              </div>
              <div className="flex items-center gap-2">
                 <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border transition-all
                    ${optimisticCompany.isActive 
                       ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                       : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase'
                    }`}>
                    {optimisticCompany.isActive ? 'Activo' : 'Suspendido'}
                 </div>
                 {optimisticCompany.taxId && (
                   <span className="text-[10px] text-zinc-500 font-bold uppercase">{optimisticCompany.taxId}</span>
                 )}
              </div>
            </div>
         </div>
      </td>
      <td className="px-8 py-5">
         <div className="flex flex-col">
             <span className={`text-xs font-bold ${optimisticCompany.businessGroup?.name ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 italic'}`}>
                 {optimisticCompany.businessGroup?.name || 'Independiente'}
             </span>
             {optimisticCompany.businessGroup?.name && (
                 <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Matriz / Sector</span>
             )}
         </div>
      </td>
      <td className="px-8 py-5 text-right">
         <div className="flex items-center justify-end gap-3">
            <form onSubmit={handleToggleStatus} className="inline-block">
                <button 
                    type="submit" 
                    disabled={isPendingToggle}
                    className={`
                        relative flex items-center justify-center min-w-[150px] gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider
                        transition-all duration-300 transform active:scale-[0.97] border shadow-sm disabled:opacity-75 disabled:cursor-wait
                        ${optimisticCompany.isActive 
                            ? 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 dark:hover:border-rose-900/50' 
                            : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-400 shadow-indigo-500/20 hover:opacity-90'
                        }
                    `}
                >
                    {isPendingToggle ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Procesando...
                        </>
                    ) : optimisticCompany.isActive ? (
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
