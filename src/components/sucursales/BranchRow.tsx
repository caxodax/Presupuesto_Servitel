"use client"

import { useState, useTransition, useOptimistic } from "react"
import { Building2, Edit2, Check, X, ShieldAlert, CheckCircle2, Loader2, MapPin } from "lucide-react"
import { updateBranch, toggleBranchStatus } from "@/features/companies/server/actions"
import { toast } from "sonner"

export function BranchRow({ branch, showCompany = false }: { branch: any, showCompany?: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPendingToggle, startTransitionToggle] = useTransition()
  const [isPendingUpdate, startTransitionUpdate] = useTransition()

  const [optimisticBranch, setOptimisticBranch] = useOptimistic(
    branch,
    (state, newState: Partial<typeof branch>) => ({ ...state, ...newState })
  )
  
  const handleToggle = () => {
    if (!confirm(`¿Estás seguro de que deseas ${optimisticBranch.isActive ? 'DAR DE BAJA' : 'REACTIVAR'} la sucursal "${optimisticBranch.name}"?`)) return
    
    startTransitionToggle(async () => {
      setOptimisticBranch({ isActive: !optimisticBranch.isActive });
      try {
        await toggleBranchStatus(branch.id)
        toast.success(optimisticBranch.isActive ? 'Sucursal dada de baja' : 'Sucursal reactivada')
      } catch (e: any) {
        toast.error(e.message || "Error al cambiar el estado")
      }
    })
  }

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newName = formData.get("name") as string;
    
    startTransitionUpdate(async () => {
      setOptimisticBranch({ name: newName });
      try {
        await updateBranch(branch.id, formData)
        toast.success("Sucursal actualizada correctamente")
        setIsEditing(false)
      } catch (e: any) {
        toast.error(e.message || "Error al actualizar la sucursal")
      }
    })
  }

  return (
    <tr className={`group border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-300 ${!optimisticBranch.isActive ? 'bg-zinc-50/50 dark:bg-zinc-900/40' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}>
      <td className="px-8 py-5">
         <div className="flex items-center gap-4">
            <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 shadow-sm
               ${optimisticBranch.isActive 
                  ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-900 border-emerald-100 dark:border-emerald-500/20 shadow-emerald-500/5' 
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 opacity-60'}`}>
               <MapPin className={`w-6 h-6 ${optimisticBranch.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
               {optimisticBranch.isActive && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
               )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdate} className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                 <input 
                    type="text" 
                    name="name" 
                    defaultValue={optimisticBranch.name} 
                    autoFocus 
                    required 
                    disabled={isPendingUpdate}
                    className="h-10 w-full max-w-[280px] rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-950 px-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none shadow-sm disabled:opacity-50" 
                 />
                 <div className="flex gap-1">
                    <button type="submit" disabled={isPendingUpdate} className="h-10 w-10 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                       {isPendingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} disabled={isPendingUpdate} className="h-10 w-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
              </form>
            ) : (
               <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                     <span className={`text-base font-bold tracking-tight transition-colors ${optimisticBranch.isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                        {optimisticBranch.name}
                     </span>
                     <button 
                        onClick={() => setIsEditing(true)} 
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-emerald-600 transition-all active:scale-90"
                        title="Modificar Nombre"
                     >
                        <Edit2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border transition-all
                        ${optimisticBranch.isActive 
                           ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                           : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                        }`}>
                        {optimisticBranch.isActive ? 'Operativa' : 'De Baja'}
                     </div>
                     <span className="text-[10px] font-mono text-zinc-400">ID: {branch.id?.toString().slice(0, 8)}</span>
                  </div>
               </div>
            )}
         </div>
      </td>
      
      {showCompany && (
         <td className="px-8 py-5">
            <div className="flex flex-col">
               <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 opacity-50" />
                  {optimisticBranch.company?.name || "N/A"}
               </span>
            </div>
         </td>
      )}

      <td className="px-8 py-5 text-right">
         <div className="flex items-center justify-end gap-3">
            <button 
               onClick={handleToggle}
               disabled={isPendingToggle}
               className={`
                 relative flex items-center justify-center min-w-[150px] gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider
                 transition-all duration-300 transform active:scale-[0.97] border shadow-sm disabled:opacity-75 disabled:cursor-wait
                 ${optimisticBranch.isActive 
                   ? 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 dark:hover:bg-rose-950/20' 
                   : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-emerald-500/20 hover:opacity-90'
                 }
               `}
            >
               {isPendingToggle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 
                    Procesando...
                  </>
               ) : (
                  optimisticBranch.isActive ? (
                     <>
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        Cerrar Sucursal
                     </>
                  ) : (
                     <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reactivar Unidad
                     </>
                  )
               )}
            </button>
         </div>
      </td>
    </tr>
  )
}
