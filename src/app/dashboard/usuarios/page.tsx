import { getUsers } from "@/features/users/server/queries"
import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches } from "@/lib/cache"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { BranchFilter } from "@/components/ui/BranchFilter"
import { CreateUserModal } from "@/components/usuarios/CreateUserModal"
import { UserRow } from "@/components/usuarios/UserRow"
import { Pagination } from "@/components/ui/Pagination"

export default async function UsuariosPage(props: { 
  searchParams: Promise<{ companyId?: string; branchId?: string; page?: string }>
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const companyId = searchParams.companyId
  const branchId = searchParams.branchId
  const companyIdNum = companyId ? Number(companyId) : undefined
  const branchIdNum = branchId ? Number(branchId) : undefined
  const page = Number(searchParams.page) || 1
  const limit = 10

  const [usersResult, companiesResult, branchesResult] = await Promise.all([
     getUsers(companyIdNum, branchIdNum, page, limit), 
     user.role === 'SUPER_ADMIN' ? getCachedCompanies() : Promise.resolve([]),
     getCachedBranches()
  ])

  const { items: users, total, pageCount } = usersResult
  const companies = companiesResult as any[]
  const branches = (branchesResult as any).items || []

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">Control de cuentas, roles y alcances del personal.</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
            {user.role === 'SUPER_ADMIN' && (
              <>
                <CompanyFilter companies={companies} />
                <BranchFilter branches={branches} selectedCompanyId={companyId} />
              </>
            )}
            <CreateUserModal companies={companies} branches={branches} />
         </div>
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        {/* Tabla Lista de Usuarios */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                   <tr>
                     <th className="px-8 py-5">Identidad</th>
                     <th className="px-8 py-5">Rol de Sistema</th>
                     <th className="px-8 py-5">Empresa / Sucursal</th>
                     <th className="px-8 py-5 text-right">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                   {users.map(u => (
                      <UserRow key={u.id} user={u} companies={companies} branches={branches} />
                   ))}
                   {users.length === 0 && (
                     <tr>
                       <td colSpan={4} className="px-8 py-16 text-center text-zinc-500 font-medium italic">
                        No se encontraron usuarios con los filtros aplicados.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>

             <Pagination page={page} pageCount={pageCount} total={total} searchParams={searchParams} />
        </div>
      </div>
    </div>
  )
}
