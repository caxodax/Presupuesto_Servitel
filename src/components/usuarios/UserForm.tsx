"use client"

import { useState } from "react"
import { createUser } from "@/features/users/server/actions"
import { ShieldCheck } from "lucide-react"

export function UserForm({ companies, branches }: { companies: any[], branches: any[] }) {
   const [selectedCompany, setSelectedCompany] = useState("")
   const [selectedRole, setSelectedRole] = useState("OPERATOR")
   
   const filteredBranches = branches.filter(b => b.companyId === selectedCompany)

   return (
       <div className="lg:col-span-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-sm p-6 h-fit">
           <h2 className="text-lg font-semibold mb-5 text-foreground">Crear Usuario</h2>
           <form action={createUser} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase text-zinc-500">Nombre Completo</label>
                 <input type="text" name="name" required placeholder="Ej: Juan Pérez" className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 outline-none" />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase text-zinc-500">Correo Electrónico (Login)</label>
                 <input type="email" name="email" required placeholder="correo@empresa.com" className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 outline-none" />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase text-zinc-500">Contraseña Local</label>
                 <input type="password" name="password" minLength={6} required placeholder="Mínimo 6 caracteres" className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 outline-none" />
              </div>
              
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase text-indigo-500">Privilegio de Sistema (Rol)</label>
                 <select name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required className="w-full h-9 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-indigo-700 font-medium">
                    <option value="OPERATOR">Operador (Zonal / Facturas)</option>
                    <option value="COMPANY_ADMIN">Admin. Empresa (Control Parcial)</option>
                    <option value="AUDITOR">Auditor (Vista Solamente)</option>
                 </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase text-zinc-500">Asignar a Empresa corporativa</label>
                 <select name="companyId" value={selectedCompany} onChange={(e) => { setSelectedCompany(e.target.value) }} required className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 outline-none">
                    <option value="" disabled>-- Selecciona Empresa --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>

              {(selectedRole === 'OPERATOR' || selectedRole === 'AUDITOR') && (
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">Sucursal de Asignación</label>
                    <select name="branchId" defaultValue="" required={selectedRole === 'OPERATOR'} disabled={!selectedCompany} className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 outline-none disabled:opacity-50">
                       <option value="" disabled selected>-- Elige una Sucursal --</option>
                       {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {selectedCompany && filteredBranches.length === 0 && (
                       <p className="text-[10px] text-amber-500 mt-1">Esta empresa no tiene sucursales para asignar a este operador.</p>
                    )}
                 </div>
              )}

              <button type="submit" disabled={selectedRole === 'OPERATOR' && filteredBranches.length === 0} className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-md h-9 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all mt-3 flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                 <ShieldCheck className="w-4 h-4" /> Encriptar y Guardar Acceso
              </button>
           </form>
       </div>
   )
}
