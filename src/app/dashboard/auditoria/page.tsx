import { getAuditTrail } from "@/features/audit/server/queries"
import { getCompanies, getAllCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { Activity, Search, ServerCog, User, Clock, Filter, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function AuditForensicPage(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const [{ logs, metadata }, companies] = await Promise.all([
    getAuditTrail(searchParams),
    user.role === 'SUPER_ADMIN' ? getAllCompanies() : Promise.resolve([])
  ])
  
  const actionFilter = searchParams.actionFilter || '';
  const companyId = searchParams.companyId || '';
  
  const basePaginationLink = `/dashboard/auditoria?${actionFilter ? `actionFilter=${actionFilter}&` : ''}${companyId ? `companyId=${companyId}&` : ''}`

  return (
    <div className="flex flex-col gap-6 pb-12 h-fit min-h-full">
      <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ServerCog className="w-8 h-8 text-zinc-400" /> Control de Auditoría
           </h1>
           <p className="text-sm text-muted-foreground mt-2">Bitácora inmutable de acciones corporativas y rastreabilidad forense.</p>
         </div>
         {user.role === 'SUPER_ADMIN' && (
           <CompanyFilter companies={companies} />
         )}
      </div>
      
      {/* Zona de Filtros */}
      <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 w-fit">
          <Link href={`/dashboard/auditoria?actionFilter=${companyId ? `&companyId=${companyId}` : ''}`} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${actionFilter === '' ? 'bg-white dark:bg-zinc-800 shadow-sm text-foreground' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              Todas Operaciones
          </Link>
          <Link href={`/dashboard/auditoria?actionFilter=CREATE_INVOICE${companyId ? `&companyId=${companyId}` : ''}`} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${actionFilter === 'CREATE_INVOICE' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              Registro Carga De Facturas (Egresos)
          </Link>
          <Link href={`/dashboard/auditoria?actionFilter=ADJUST_BUDGET${companyId ? `&companyId=${companyId}` : ''}`} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${actionFilter === 'ADJUST_BUDGET' ? 'bg-white dark:bg-zinc-800 shadow-sm text-rose-600 dark:text-rose-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              Impactos Manuales a Preupuesto
          </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden flex-1 flex flex-col">
         {/* Tabla Paginada de Bitácora */}
         <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-[200px]">Estampa Temporal</th>
                  <th className="px-6 py-4">Firma Auditada (Usuario)</th>
                  {!companyId && <th className="px-6 py-4">Empresa</th>}
                  <th className="px-6 py-4">Evento de Sistema</th>
                  <th className="px-6 py-4">Objeto (Contexto Json)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div className="text-[10px] text-muted-foreground ml-5 mt-0.5">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 font-medium text-foreground">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          {log.user.name}
                       </div>
                       <div className="text-xs text-zinc-500 ml-5 mt-0.5">{log.user.email}</div>
                    </td>
                    {!companyId && (
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                              {(log as any).company?.name || 'N/A'}
                           </span>
                        </td>
                    )}
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-wider
                           ${log.action === 'CREATE_INVOICE' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}
                        `}>
                           {log.action}
                        </span>
                        <div className="text-xs text-zinc-500 font-medium mt-1.5">{log.entity}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 max-w-sm truncate whitespace-pre-wrap">
                        {log.details ? JSON.stringify(log.details) : 'N/A'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={companyId ? 4 : 5} className="px-6 py-12 text-center text-zinc-500">
                        Sin entradas forenses bajo los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
         
         {/* Footer de Paginación */}
         {metadata.totalPages > 1 && (
             <div className="border-t border-zinc-200 dark:border-zinc-800/50 p-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                   Mostrando página <span className="font-semibold text-foreground">{metadata.page}</span> de <span className="font-semibold text-foreground">{metadata.totalPages}</span>
                </div>
                <div className="flex gap-2">
                   <Link 
                      href={`${basePaginationLink}page=${metadata.page - 1}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium transition-colors ${!metadata.hasPreviousPage ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
                   >
                      <ArrowLeft className="w-3 h-3" /> Previa
                   </Link>
                   <Link 
                      href={`${basePaginationLink}page=${metadata.page + 1}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium transition-colors ${!metadata.hasNextPage ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
                   >
                      Siguiente <ArrowRight className="w-3 h-3" />
                   </Link>
                </div>
             </div>
          )}
      </div>
    </div>
  )
}
