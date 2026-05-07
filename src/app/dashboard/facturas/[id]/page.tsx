import { getInvoiceDetails } from "@/features/invoices/server/queries"
import { ArrowLeft, CheckCircle2, TrendingDown, AlertTriangle, User, Clock, FileCheck, Download, Building2, MapPin, Receipt, BookOpen } from "lucide-react"
import Link from "next/link"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const { invoice, analytics, auditLogs } = await getInvoiceDetails(Number(resolvedParams.id))
  
  const isOverBudget = analytics.overBudgetSpill > 0;
  
  return (
    <div className="max-w-5xl flex flex-col gap-8 pb-10 animate-in fade-in duration-500">
      
      <div>
         <Link href="/dashboard/facturas" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Directorio Transaccional
         </Link>
         
         <div className="flex items-center justify-between">
               <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-0.5 rounded-sm shadow-sm">
                           {invoice.company.name}
                       </span>
                       <h1 className="text-3xl font-bold tracking-tight text-foreground">Factura #{invoice.number}</h1>
                   </div>
                   <div className="flex items-center gap-2 mt-2">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider border ${
                         invoice.status === 'CANCELLED'
                         ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20'
                         : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20'
                     }`}>
                         <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {invoice.status === 'REGISTERED' ? 'REGISTRADA' : 'ANULADA'}
                     </span>
                   </div>
               </div>
               
               {isOverBudget && (
                   <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 animate-pulse">
                       <AlertTriangle className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-wider">Sobregiro Detectado</span>
                   </div>
               )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 flex flex-col gap-6">
             {/* Info de Proveedor y Fechas */}
             <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm p-8">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                    <FileCheck className="w-4 h-4" /> Información Jurídica
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <Building2 className="w-3 h-3" /> Empresa / Cliente Interno
                        </div>
                        <div className="font-bold text-foreground uppercase tracking-tight">{invoice.company.name}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <User className="w-3 h-3" /> Proveedor (Razón Social)
                        </div>
                        <div className="font-semibold text-foreground text-sm">{invoice.supplierName}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <Receipt className="w-3 h-3" /> Impacto Trazado A:
                        </div>
                        <div className="font-bold text-foreground text-sm">{invoice.allocation.category?.name || 'Categoría Contable'}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest font-bold">
                            {invoice.allocation.budget.name} <span className="mx-1 text-zinc-300">|</span> {invoice.allocation.budget.branch.name}
                        </div>
                     </div>
                     <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-2">
                             <BookOpen className="w-3 h-3" /> Cuenta Contable
                         </div>
                         <div className="font-bold text-foreground text-sm">
                            {invoice.companyAccount ? (
                                <>
                                    <span className="font-mono text-zinc-500 mr-2">{invoice.companyAccount.globalAccount.code}</span>
                                    {invoice.companyAccount.globalAccount.name}
                                </>
                            ) : (
                                <span className="text-zinc-400 italic">No vinculada</span>
                            )}
                         </div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Fecha Contable
                        </div>
                        <div className="font-semibold text-foreground text-sm">{new Date(invoice.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            Operador Procesante
                        </div>
                        <div className="font-semibold text-foreground flex items-center gap-2 text-sm">
                           <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-indigo-500" />
                           </div>
                           {invoice.registeredBy.name}
                        </div>
                     </div>
                 </div>
             </div>

             {/* Sección de Auditoría */}
             <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/40 p-8">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-8 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Trazabilidad Forense
                 </h2>
                 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    {auditLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className={`absolute left-[9px] top-1.5 h-2 w-2 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${log.action.includes('CANCEL') ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{log.action.replace('_', ' ')}</span>
                                    <span className="text-[10px] text-zinc-400 font-bold">{new Date(log.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500">Ejecutado por <span className="font-bold text-zinc-700 dark:text-zinc-300">{log.user.name}</span> <span className="text-[9px] text-zinc-400">({log.user.role})</span></div>
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
          </div>

          <div className="flex flex-col gap-6">
              {/* Card de Soporte Documental */}
              <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Soporte Documental</h3>
                  {invoice.attachmentUrl ? (
                      <div className="flex flex-col gap-4">
                          <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700 overflow-hidden group">
                              {invoice.attachmentName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <img src={invoice.attachmentUrl} alt="Soporte" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                  <div className="flex flex-col items-center gap-2">
                                      <FileCheck className="w-10 h-10 text-zinc-300" />
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Documento PDF</span>
                                  </div>
                              )}
                          </div>
                          <a 
                            href={invoice.attachmentUrl} 
                            target="_blank" 
                            className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                             <Download className="w-4 h-4" /> Descargar Soporte
                          </a>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 opacity-40">
                          <AlertTriangle className="w-10 h-10 text-zinc-400" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">No se ha cargado un soporte físico para esta transacción.</p>
                      </div>
                  )}
              </div>

              {/* Card de Ejecución de Fondos */}
              <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" /> Ejecución de Fondos
                      </div>
                      
                      <div className="flex flex-col gap-8">
                          <div>
                            <div className="flex justify-between text-[11px] mb-2 font-black uppercase tracking-tight">
                                <span className="text-zinc-500 uppercase tracking-widest">Ejecución Acumulada</span>
                                <span className={isOverBudget ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}>
                                    {((analytics.totalConsumedNow / (analytics.hardLimit || 1)) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden flex">
                                <div 
                                    className={`h-full ${isOverBudget ? 'bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} 
                                    style={{ width: `${Math.min((analytics.totalConsumedNow / (analytics.hardLimit || 1)) * 100, 100)}%` }} 
                                />
                            </div>
                          </div>

                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monto Facturado</span>
                                  <span className="text-lg font-black text-zinc-900 dark:text-white">${Number(invoice.amountUSD).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Capacidad Restante</span>
                                  <span className={`text-lg font-black ${analytics.currentCapacity < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      ${Math.max(analytics.currentCapacity, 0).toLocaleString()}
                                  </span>
                              </div>

                              {isOverBudget && (
                                <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-center mt-2">
                                    <span className="text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase">Sobrepresupuesto</span>
                                    <span className="font-black text-rose-600 dark:text-rose-400">
                                        -${analytics.overBudgetSpill.toLocaleString()}
                                    </span>
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}
