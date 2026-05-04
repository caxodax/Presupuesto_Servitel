import { getCompanies } from "@/features/companies/server/queries"
import { getBusinessGroups } from "@/features/companies/server/actions"
import { CompanyRow } from "@/components/empresas/CompanyRow"
import { CreateCompanyModal } from "@/components/empresas/CreateCompanyModal"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { Layers } from "lucide-react"
import Link from "next/link"

export default async function CompaniesPage({ 
  searchParams 
}: { 
  searchParams: { q?: string; page?: string } 
}) {
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const limit = 10;

  const [{ items: companies, total, pageCount }, businessGroups] = await Promise.all([
    getCompanies(query, page, limit),
    getBusinessGroups()
  ]);
  
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="animate-in fade-in slide-in-from-left-4 duration-500">
           <h1 className="text-3xl font-black tracking-tight text-foreground">Directorio de Empresas</h1>
           <p className="text-sm text-muted-foreground mt-1.5 font-medium">Centros operativos o cuentas de facturación madre.</p>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto animate-in fade-in slide-in-from-right-4 duration-500">
           <Link 
               href="/dashboard/matrices" 
               className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
           >
               <Layers className="w-4 h-4 text-indigo-500" />
               Gestionar Matrices
           </Link>
           <SearchInput placeholder="Buscar por Razón Social..." />
           <CreateCompanyModal businessGroups={businessGroups} />
         </div>
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        {/* Tabla (Ancho Completo) */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left whitespace-nowrap">
               <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                 <tr>
                   <th className="px-8 py-5">Organización Creada</th>
                   <th className="px-8 py-5">Matriz / Sector</th>
                   <th className="px-8 py-5 text-right w-fit">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                 {companies.map(company => (
                    <CompanyRow key={company.id} company={company} businessGroups={businessGroups} />
                 ))}

                 {companies.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-8 py-12 text-center text-zinc-500 font-medium italic">
                        {query ? `No se encontraron resultados para "${query}"` : "Ninguna corporación registrada. Oprime \"Registrar Empresa\" para empezar."}
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
