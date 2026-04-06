import { getCompanies } from "@/features/companies/server/queries"
import { createCompany } from "@/features/companies/server/actions"
import { CompanyRow } from "@/components/empresas/CompanyRow"

export default async function CompaniesPage() {
  const companies = await getCompanies();
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-full items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Directorio de Empresas</h1>
           <p className="text-sm text-muted-foreground mt-1.5">Centros operativos o cuentas de facturación madre.</p>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario (Columna Menor) */}
        <div className="lg:col-span-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6 h-fit">
           <h2 className="text-lg font-semibold mb-5 text-foreground leading-none">Nueva Entidad</h2>
           <form action={createCompany} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block text-zinc-700 dark:text-zinc-300">Razón Social</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="ACME Corp S.A." 
                  className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-foreground text-background dark:bg-indigo-600 dark:text-white rounded-md h-9 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all mt-1"
              >
                Inscribir Empresa
              </button>
           </form>
        </div>

        {/* Tabla (Columna Mayor) */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left whitespace-nowrap">
               <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-medium">
                 <tr>
                   <th className="px-6 py-3.5">Organización Creada</th>
                   <th className="px-6 py-3.5 text-right flex-1">Estatus</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                 {companies.map(company => (
                    <CompanyRow key={company.id} company={company} />
                 ))}

                 {companies.length === 0 && (
                   <tr>
                     <td colSpan={2} className="px-6 py-8 text-center text-zinc-500">Ninguna corporación registrada. Oprime Inscribir Empresa para empezar.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  )
}
