 import { getBranches, getCompanies, getAllCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { CreateBranchModal } from "@/components/sucursales/CreateBranchModal"
import { BranchRow } from "@/components/sucursales/BranchRow"

export default async function BranchesPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string; q?: string; page?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId;
  const companyIdNum = companyId ? Number(companyId) : undefined;
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const limit = 10;

  const [branchesResult, companiesResult] = await Promise.all([
    getBranches(companyIdNum, query, page, limit),
    user.role === "SUPER_ADMIN" ? getAllCompanies() : Promise.resolve([]),
  ])

  const { items: branches, total, pageCount } = branchesResult as { items: any[]; total: number; pageCount: number }
  const companies = companiesResult as any[]

  // Encontrar el nombre de la empresa filtrada si existe
  const filteredCompany = companyId ? companies.find(c => c.id === companyId) : null;

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Sedes Operativas</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            {filteredCompany ? `Unidades de negocio de ${filteredCompany.name}` : 'Todas las unidades operativas registradas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
          {user.role === "SUPER_ADMIN" && (
            <CompanyFilter companies={companies} />
          )}
          <SearchInput placeholder="Buscar por Nombre..." />
          <CreateBranchModal 
            companies={companies} 
            userRole={user.role} 
            filteredCompanyId={companyId} 
          />
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-8 py-5">Nombre de Sucursal</th>
                  {!filteredCompany && <th className="px-8 py-5">Empresa Propietaria</th>}
                  <th className="px-8 py-5 text-right w-fit">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {branches.map((branch: any) => (
                  <BranchRow 
                    key={branch.id} 
                    branch={branch} 
                    showCompany={!filteredCompany && user.role === "SUPER_ADMIN"} 
                  />
                ))}
                {branches.length === 0 && (
                  <tr>
                    <td colSpan={filteredCompany ? 2 : 3} className="px-8 py-16 text-center text-zinc-500 font-medium italic">
                       {query ? `No se encontraron sucursales para "${query}"` : "Sin sedes registradas en este alcance."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <Pagination page={page} pageCount={pageCount} total={total} />
        </div>
      </div>
    </div>
  )
}
