import { getRecentActivity } from "@/features/dashboard/server/queries"
import { FileText, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"

type SearchParamsResolved = { companyId?: string; branchId?: string; budgetId?: string; groupId?: string }

export async function RecentActivity({ searchParams }: { searchParams: SearchParamsResolved }) {
    const invoices = await getRecentActivity({
        companyId: searchParams.companyId ? Number(searchParams.companyId) : undefined,
        branchId: searchParams.branchId ? Number(searchParams.branchId) : undefined,
        budgetId: searchParams.budgetId ? Number(searchParams.budgetId) : undefined,
        groupId: searchParams.groupId ? Number(searchParams.groupId) : undefined,
    })
    
    return (
       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden h-full flex flex-col">
           <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Últimos Flujos (Egresos)</h2>
              <Link href="/dashboard/facturas" className="text-[11px] font-bold uppercase hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
                  Ver Todo <ArrowRight className="w-3 h-3" />
              </Link>
           </div>
           
           <div className="p-1 flex flex-col flex-1 pb-3">
              {invoices.map(inv => (
                 <Link href={`/dashboard/facturas`} key={inv.id} className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                          <FileText className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500" />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-foreground flex items-center gap-2">
                             {inv.supplierName} 
                             <span className="text-zinc-400 font-medium tracking-tight">#{inv.number}</span>
                             {inv.company?.name && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                                   {inv.company.name}
                                </span>
                             )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                             {inv.account ? (
                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                   <BookOpen className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                   <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                      {inv.account.code}
                                   </span>
                                </div>
                             ) : (
                                <p className="text-xs text-zinc-500">
                                   {inv.allocation?.category?.name || 'Gasto'}
                                </p>
                             )}
                             <span className="text-zinc-300 dark:text-zinc-700 mx-1">•</span> 
                             <p className="text-xs text-zinc-500">
                                {inv.allocation?.budget?.branch?.name || '---'}
                             </p>
                          </div>
                       </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className="font-bold tracking-tight text-foreground text-sm">${Number(inv.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                       <span className="text-[10px] uppercase font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded mt-1">
                           {new Date(inv.date).toLocaleDateString()}
                       </span>
                    </div>
                 </Link>
              ))}
              {invoices.length === 0 && (
                 <div className="text-center py-10 text-sm text-zinc-400 flex-1 flex flex-col items-center justify-center gap-3">
                     <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-800" />
                     Sin recortes operativos recientes.
                 </div>
              )}
           </div>
       </div>
    )
}

export function ActivitySkeleton() {
    return (
       <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm h-full overflow-hidden">
           <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
               <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
           </div>
           <div className="p-5 flex flex-col gap-6">
              {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800/80 rounded-full" />
                       <div className="space-y-2">
                           <div className="h-3 w-36 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                           <div className="h-2 w-24 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                       </div>
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                       <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                       <div className="h-3 w-12 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                    </div>
                 </div>
              ))}
           </div>
       </div>
    )
}
