"use client"

import { useState, useTransition } from "react"
import { Plus, X, Layers, Loader2 } from "lucide-react"
import { createBusinessGroup } from "@/features/companies/server/actions"
import { toast } from "sonner"

export function CreateBusinessGroupModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await createBusinessGroup(formData)
        toast.success("Matriz registrada satisfactoriamente")
        setIsOpen(false)
      } catch (error: any) {
        toast.error(error.message || "Error al registrar la matriz")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
      >
        <Plus className="w-4 h-4" />
        Nueva Matriz / Sector
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden">
            <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Nueva Matriz</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Define un nuevo sector o grupo empresarial.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nombre del Sector</label>
                <input 
                  type="text" name="name" required autoFocus disabled={isPending}
                  placeholder="Ej: Minorista, Franquicias..." 
                  className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Descripción (Opcional)</label>
                <textarea 
                  name="description" disabled={isPending}
                  placeholder="Breve descripción del grupo..." 
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" 
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" onClick={() => setIsOpen(false)} disabled={isPending}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isPending}
                  className="flex-[2] h-12 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Matriz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
