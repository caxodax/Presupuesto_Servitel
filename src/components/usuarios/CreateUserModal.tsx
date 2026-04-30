"use client"

import { useState, useTransition } from "react"
import { Plus, X, UserPlus, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react"
import { createUser } from "@/features/users/server/actions"
import { toast } from "sonner"

export function CreateUserModal({ companies, branches }: { companies: any[], branches: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedRole, setSelectedRole] = useState("OPERATOR")
  const [showPassword, setShowPassword] = useState(false)

  const filteredBranches = branches.filter(b => {
    const compId = b.company_id || b.companyId;
    return compId && compId.toString() === selectedCompany.toString();
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await createUser(formData)
        toast.success("Usuario creado exitosamente")
        setIsOpen(false)
        setSelectedCompany("")
        setSelectedRole("OPERATOR")
      } catch (error: any) {
        toast.error(error.message || "Error al crear el usuario")
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
                disabled={isPending}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nombre Completo</label>
                <input type="text" name="name" required disabled={isPending} placeholder="Ej: Juan Pérez" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Correo Electrónico</label>
                <input type="email" name="email" required disabled={isPending} placeholder="juan@ejemplo.com" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Contraseña Temporal</label>
                <div className="relative">
                   <input type={showPassword ? "text" : "password"} name="password" minLength={6} required disabled={isPending} placeholder="Mínimo 6 caracteres" className="w-full h-11 pl-4 pr-12 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
                   <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-500 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                   </button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Rol de Sistema</label>
                <select name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required disabled={isPending} className="w-full h-11 px-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none disabled:opacity-50">
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
                  disabled={isPending}
                  className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
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
                  disabled={isPending || !selectedCompany || (selectedRole !== 'OPERATOR' && selectedRole !== 'AUDITOR')} 
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
                  disabled={isPending}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
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
