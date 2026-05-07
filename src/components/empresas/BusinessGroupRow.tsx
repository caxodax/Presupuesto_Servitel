"use client"

import { useState, useTransition, useOptimistic } from "react"
import { Layers, Edit2, Check, X, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react"
import { updateBusinessGroup, toggleBusinessGroupStatus } from "@/features/companies/server/actions"
import { toast } from "sonner"

export function BusinessGroupRow({ group }: { group: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPendingUpdate, startTransitionUpdate] = useTransition();
  const [isPendingToggle, startTransitionToggle] = useTransition();

  const [optimisticGroup, setOptimisticGroup] = useOptimistic(
    group,
    (state, newState: Partial<typeof group>) => ({ ...state, ...newState })
  )

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get("name") as string;
    const newDesc = formData.get("description") as string;
    
    startTransitionUpdate(async () => {
      setOptimisticGroup({ name: newName, description: newDesc });
      try {
        await updateBusinessGroup(group.id, formData);
        toast.success("Matriz actualizada satisfactoriamente");
        setIsEditing(false);
      } catch (error: any) {
        toast.error(error.message || "Error al actualizar la matriz");
      }
    });
  }

  const handleToggleStatus = () => {
    startTransitionToggle(async () => {
      setOptimisticGroup({ isActive: !optimisticGroup.isActive });
      try {
        await toggleBusinessGroupStatus(group.id, group.isActive);
        toast.success(optimisticGroup.isActive ? "Matriz desactivada" : "Matriz reactivada");
      } catch (error: any) {
        toast.error(error.message || "Error al cambiar estado");
      }
    });
  }
  
  return (
    <tr className={`group border-b border-zinc-100 dark:border-zinc-800/50 transition-all ${!optimisticGroup.isActive ? 'bg-zinc-50/50 dark:bg-zinc-900/40' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}>
      <td className="px-8 py-5">
         <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all
               ${optimisticGroup.isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 opacity-60'}`}>
               <Layers className="w-5 h-5" />
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdate} className="flex flex-col gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                 <input 
                    type="text" name="name" defaultValue={optimisticGroup.name} autoFocus required 
                    disabled={isPendingUpdate}
                    className="h-8 w-full max-w-[200px] rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-950 px-3 text-sm font-bold outline-none" 
                 />
                 <input 
                    type="text" name="description" defaultValue={optimisticGroup.description}
                    disabled={isPendingUpdate}
                    className="h-7 w-full max-w-[300px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-[10px] font-medium outline-none" 
                    placeholder="Descripción..."
                 />
              </form>
            ) : (
               <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                     <span className={`text-sm font-black tracking-tight ${optimisticGroup.isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                        {optimisticGroup.name}
                     </span>
                     <button 
                        onClick={() => setIsEditing(true)} 
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md text-indigo-500 transition-all"
                     >
                        <Edit2 className="w-3 h-3" />
                     </button>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[300px]">
                     {optimisticGroup.description || 'Sin descripción'}
                  </span>
               </div>
            )}
         </div>
      </td>
      <td className="px-8 py-5">
         <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border
            ${optimisticGroup.isActive 
               ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
               : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
            {optimisticGroup.isActive ? 'Operativa' : 'Inactiva'}
         </div>
      </td>
      <td className="px-8 py-5 text-right">
         <div className="flex items-center justify-end gap-2">
            {isEditing ? (
               <>
                  <button onClick={() => setIsEditing(false)} disabled={isPendingUpdate} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
                  <button type="submit" onClick={(e: any) => {
                      const form = e.currentTarget.closest('tr').querySelector('form');
                      if (form) form.requestSubmit();
                  }} disabled={isPendingUpdate} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all">
                     {isPendingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
               </>
            ) : (
               <button 
                  onClick={handleToggleStatus} 
                  disabled={isPendingToggle}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95
                     ${optimisticGroup.isActive 
                        ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 hover:border-rose-200' 
                        : 'bg-indigo-600 text-white border-indigo-500 hover:opacity-90'}`}
               >
                  {isPendingToggle ? <Loader2 className="w-4 h-4 animate-spin" /> : optimisticGroup.isActive ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
               </button>
            )}
         </div>
      </td>
    </tr>
  )
}
