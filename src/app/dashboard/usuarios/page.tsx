import { getUsers } from "@/features/users/server/queries"
import { getCompanies, getBranches } from "@/features/companies/server/queries"
import { User as UserIcon } from "lucide-react"
import { UserForm } from "@/components/usuarios/UserForm"

export default async function UsuariosPage() {
  const [users, companies, branches] = await Promise.all([
     getUsers(), getCompanies(), getBranches()
  ])

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex w-full items-center justify-between">
         <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Accesos</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Control de cuentas, contraseñas y permisos del sistema.</p>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario */}
        <UserForm companies={companies} branches={branches} />

        {/* Tabla Lista de Usuarios */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden h-fit">
             <table className="w-full text-sm text-left">
               <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-medium">
                 <tr>
                   <th className="px-6 py-3.5">Identidad</th>
                   <th className="px-6 py-3.5">Rol de Sistema</th>
                   <th className="px-6 py-3.5">Empresa / Sucursal</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                     <td className="px-6 py-4 flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-zinc-400" /> {u.name}
                        </span>
                        <span className="text-[11px] text-zinc-500 pl-5">{u.email}</span>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                           u.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' : 
                           u.role === 'COMPANY_ADMIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                           {u.role.replace('_', ' ')}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-muted-foreground text-xs font-medium flex flex-col gap-0.5">
                        {u.company ? (
                           <>
                              <span>{u.company.name}</span>
                              {u.branch && <span className="text-[10px] text-zinc-500 font-normal">↳ {u.branch.name}</span>}
                           </>
                        ) : (
                           <span className="italic text-zinc-400">- Libre / Global -</span>
                        )}
                     </td>
                   </tr>
                 ))}
                 {users.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">Sin usuarios en base de datos.</td>
                   </tr>
                 )}
               </tbody>
             </table>
        </div>
      </div>
    </div>
  )
}
