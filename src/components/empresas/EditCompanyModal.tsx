"use client"

import { useState, useTransition } from "react"
import { Edit2, X, Building2, Loader2, Check } from "lucide-react"
import { updateCompany } from "@/features/companies/server/actions"
import { toast } from "sonner"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"

export function EditCompanyModal({ company, businessGroups }: { company: any, businessGroups: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await updateCompany(company.id, formData)
        toast.success("Empresa actualizada satisfactoriamente")
        setIsOpen(false)
      } catch (error: any) {
        toast.error(error.message || "Error al actualizar la empresa")
      }
    })
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-indigo-500 transition-all active:scale-90"
        title="Editar Empresa"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Editar Entidad</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Actualiza la información de la empresa.</p>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Razón Social</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="name" 
                      defaultValue={company.name}
                      required 
                      disabled={isPending}
                      placeholder="Ej: Servitel C.A" 
                      className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" 
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                      {!isPending && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Matriz / Sector</label>
                  <select 
                      name="groupId"
                      defaultValue={company.groupId || ""}
                      disabled={isPending}
                      className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                  >
                      <option value="">Ninguna (Independiente)</option>
                      {businessGroups.filter(g => g.isActive || g.id === company.groupId).map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">RIF / Identificación Fiscal</label>
                  <input 
                    type="text" 
                    name="taxId" 
                    defaultValue={company.taxId || ""}
                    disabled={isPending}
                    placeholder="Ej: J-12345678-9" 
                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Moneda Base</label>
                  <select 
                      name="baseCurrency"
                      defaultValue={company.baseCurrency || "USD"}
                      disabled={isPending}
                      className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                  >
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs)</option>
                      <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Teléfono (Opcional)</label>
                  <input 
                    type="text" 
                    name="phone" 
                    defaultValue={company.phone || ""}
                    disabled={isPending}
                    placeholder="Ej: +58 412 1234567" 
                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Dirección (Opcional)</label>
                  <input 
                    type="text" 
                    name="address" 
                    defaultValue={company.address || ""}
                    disabled={isPending}
                    placeholder="Ej: Av. Principal, Edificio Torre X..." 
                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Logo de la Empresa (Opcional)</label>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <FileUploadInput name="logo" currentFile={company.logoUrl?.split('/').pop()} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Sube un nuevo archivo para reemplazar el logo actual.</p>
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
                      Guardar Cambios
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
