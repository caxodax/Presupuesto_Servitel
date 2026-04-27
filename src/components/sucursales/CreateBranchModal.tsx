"use client"

import { useState, useTransition } from "react"
import { Plus, X, MapPin, Loader2, Check, Building2 } from "lucide-react"
import { createBranch } from "@/features/companies/server/actions"
import { toast } from "sonner"

export function CreateBranchModal({ companies, userRole, filteredCompanyId }: { companies: any[], userRole: string, filteredCompanyId?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await createBranch(formData)
        toast.success("Sucursal creada correctamente")
        setIsOpen(false)
      } catch (error: any) {
        toast.error(error.message || "Error al crear la sucursal")
      }
    })
  }

  const selectedCompany = filteredCompanyId ? companies.find(c => c.id === filteredCompanyId) : null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
      >
        <Plus className="w-4 h-4" />
        Nueva Sucursal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-inner">
                  <MapPin className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Nueva Unidad</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Registra una nueva sede operativa.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="absolute top-8 right-8 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              {userRole === "SUPER_ADMIN" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Empresa Dueña</label>
                  {selectedCompany ? (
                    <div className="flex items-center gap-3 h-12 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600">
                      <input type="hidden" name="companyId" value={selectedCompany.id} />
                      <Building2 className="w-4 h-4 opacity-50" />
                      {selectedCompany.name}
                      <span className="ml-auto text-[9px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full uppercase tracking-tighter opacity-70">Fijada</span>
                    </div>
                  ) : (
                    <select name="companyId" required disabled={isPending} className="w-full h-12 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none transition-all shadow-sm disabled:opacity-50">
                      <option value="" disabled selected>-- Seleccione Empresa --</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nombre de Sucursal</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  autoFocus
                  disabled={isPending}
                  placeholder="Ej: Sede Principal Valencia" 
                  className="w-full h-12 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm disabled:opacity-50" 
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="flex-1 h-14 rounded-2xl text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] h-14 bg-emerald-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Check className="w-5 h-5" />
                      Registrar
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
