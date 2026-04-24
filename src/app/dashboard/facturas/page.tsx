import { getInvoices } from "@/features/invoices/server/queries"
import { getCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { FileText, Plus } from "lucide-react"
import Link from "next/link"

export default async function InvoicesListPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId

  const [invoices, companies] = await Promise.all([
    getInvoices(companyId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
  ])
  
  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex w-full items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Depósito Operacional</h1>
           <p className="text-sm text-muted-foreground mt-1.5">Manejo central de facturas cargadas y ejecución presupuestaria.</p>
         </div>
         <div className="flex items-center gap-4">
            {user.role === "SUPER_ADMIN" && (
                <CompanyFilter companies={companies} />
            )}
            <Link 
                href="/dashboard/facturas/nuevo" 
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm active:scale-95 transition-all"
            >
                <Plus className="w-4 h-4" /> Registrar Factura
            </Link>
         </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden h-fit">
         <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-medium whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">ID Factura</th>
                  {!companyId && <th className="px-6 py-4">Empresa</th>}
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Centro Contable Asignado</th>
                  <th className="px-6 py-4 text-right">Monto Procesado (USD)</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors group cursor-pointer relative">
                    <td className="px-6 py-4">
                       <Link href={`/dashboard/facturas/${inv.id}`} className="absolute inset-0 z-10"><span className="sr-only">Ver Transaccion</span></Link>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                             <FileText className="w-4 h-4 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <span className="font-semibold text-foreground">#{inv.number}</span>
                       </div>
                    </td>
                    {!companyId && (
                        <td className="px-6 py-4">
                           <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight text-zinc-600 dark:text-zinc-400">
                              {inv.company?.name || 'N/A'}
                           </span>
                        </td>
                    )}
                    <td className="px-6 py-4 font-medium text-foreground">{inv.supplierName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-muted-foreground">{(inv.allocation as any).category.name} <span className="text-zinc-600 dark:text-zinc-400">·</span> {(inv.allocation as any).budget.branch.name}</span>
                        <div className="text-[11px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">{(inv.allocation as any).budget.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <span className="font-bold text-foreground">${Number(inv.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <div className="text-[10px] text-zinc-500 font-medium mt-0.5">VES {Number(inv.amountVES).toLocaleString('es-VE')}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold tracking-wider ${
                            inv.status === 'CANCELLED' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}>
                            {inv.status === 'REGISTERED' ? 'REGISTRADA' : 'ANULADA'}
                        </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={companyId ? 5 : 6} className="px-6 py-12 text-center text-zinc-500">
                       <div className="flex flex-col items-center justify-center gap-4">
                           <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                           </div>
                           <p>Sin facturación operacional en sistema.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
