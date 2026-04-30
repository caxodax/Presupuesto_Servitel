"use client"

import { useState, useTransition } from "react"
import { Plus, X, Building2, Loader2, Check } from "lucide-react"
import { createCompany } from "@/features/companies/server/actions"
import { toast } from "sonner"

export function CreateCompanyModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await createCompany(formData)
        toast.success("Empresa registrada satisfactoriamente")
        setIsOpen(false)
      } catch (error: any) {
        toast.error(error.message || "Error al registrar la empresa")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-zinc-200/50 dark:shadow-none"
      >
        <Plus className="w-4 h-4" />
        Registrar Empresa
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Nueva Entidad</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Define una nueva cuenta de facturación madre.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Razón Social</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    autoFocus
                    disabled={isPending}
                    placeholder="Ej: Servitel C.A" 
                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                    {/* Solo muestra el check si no esta pending */}
                    {!isPending && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] h-12 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Inscribir Empresa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
