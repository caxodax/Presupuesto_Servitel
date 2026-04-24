"use client"

import { useState } from "react"
import { Plus, X, UserPlus, ShieldCheck, Loader2 } from "lucide-react"
import { createUser } from "@/features/users/server/actions"

export function CreateUserModal({ companies, branches }: { companies: any[], branches: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedRole, setSelectedRole] = useState("OPERATOR")

  const filteredBranches = branches.filter(b => b.companyId === selectedCompany)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    try {
      await createUser(formData)
      setIsOpen(false)
      setSelectedCompany("")
      setSelectedRole("OPERATOR")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
      >
        <Plus className="w-4 h-4" />
        Nuevo Usuario
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <UserPlus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Crear Acceso</h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Configura las credenciales y permisos del nuevo usuario.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form action={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nombre Completo</label>
                <input type="text" name="name" required placeholder="Ej: Juan Pérez" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Correo Electrónico</label>
                <input type="email" name="email" required placeholder="juan@ejemplo.com" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Contraseña Temporal</label>
                <input type="password" name="password" minLength={6} required placeholder="Mínimo 6 caracteres" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Rol de Sistema</label>
                <select name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required className="w-full h-11 px-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none">
                  <option value="OPERATOR">Operador</option>
                  <option value="COMPANY_ADMIN">Administrador Empresa</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="SUPER_ADMIN">Super Administrador</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Empresa</label>
                <select 
                  name="companyId" 
                  value={selectedCompany} 
                  onChange={(e) => setSelectedCompany(e.target.value)} 
                  required 
                  className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>Selecciona Empresa</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Sucursal</label>
                <select 
                  name="branchId" 
                  defaultValue="" 
                  required={selectedRole === 'OPERATOR'} 
                  disabled={!selectedCompany || (selectedRole !== 'OPERATOR' && selectedRole !== 'AUDITOR')} 
                  className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">-- Sin Sucursal --</option>
                  {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPending || (selectedRole === 'OPERATOR' && filteredBranches.length === 0)}
                  className="flex-[2] h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Guardar Acceso
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
