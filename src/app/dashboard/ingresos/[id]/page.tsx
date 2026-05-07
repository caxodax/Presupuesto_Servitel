import { getIncomeDetails } from "@/features/incomes/server/queries"
import { ArrowLeft, CheckCircle2, User, Clock, FileCheck, Download, Wallet, Building2, MapPin, BookOpen } from "lucide-react"
import Link from "next/link"

export default async function IncomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const { income, auditLogs } = await getIncomeDetails(Number(resolvedParams.id))
  
  return (
    <div className="max-w-5xl flex flex-col gap-8 pb-10 animate-in fade-in duration-500">
      
      <div>
         <Link href="/dashboard/ingresos" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Directorio de Ingresos
         </Link>
         
         <div className="flex items-center justify-between">
               <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-0.5 rounded-sm shadow-sm">
                           {income.company.name}
                       </span>
                       <h1 className="text-3xl font-bold tracking-tight text-foreground">Ingreso #{income.number}</h1>
                   </div>
                   <div className="flex items-center gap-2 mt-2">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> REGISTRADO
                     </span>
                   </div>
               </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 flex flex-col gap-6">
             {/* Info de Cliente y Fechas */}
             <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm p-8">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                    <FileCheck className="w-4 h-4" /> Información del Movimiento
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <Building2 className="w-3 h-3" /> Organización
                        </div>
                        <div className="font-bold text-foreground uppercase tracking-tight">{income.company.name}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <User className="w-3 h-3" /> Cliente / Origen
                        </div>
                        <div className="font-semibold text-foreground text-sm">{income.clientName}</div>
                     </div>
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                             <Wallet className="w-3 h-3" /> Categoría Legacy
                         </div>
                         <div className="font-bold text-foreground text-sm">{income.category.name}</div>
                         {income.subcategory && (
                             <div className="text-[10px] text-zinc-500 mt-0.5">↳ {income.subcategory.name}</div>
                         )}
                      </div>
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-2">
                             <BookOpen className="w-3 h-3" /> Cuenta Contable
                         </div>
                         <div className="font-bold text-foreground text-sm">
                            {income.companyAccount ? (
                                <>
                                    <span className="font-mono text-zinc-500 mr-2">{income.companyAccount.globalAccount.code}</span>
                                    {income.companyAccount.globalAccount.name}
                                </>
                            ) : (
                                <span className="text-zinc-400 italic">No vinculada</span>
                            )}
                         </div>
                      </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Sucursal Receptora
                        </div>
                        <div className="font-semibold text-foreground text-sm">{income.branch?.name || 'GLOBAL / CENTRAL'}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Fecha Contable
                        </div>
                        <div className="font-semibold text-foreground text-sm">{new Date(income.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                            Operador
                        </div>
                        <div className="font-semibold text-foreground flex items-center gap-2 text-sm">
                           <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-emerald-500" />
                           </div>
                           {income.registeredBy.name}
                        </div>
                     </div>
                 </div>

                 {income.notes && (
                     <div className="mt-10 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Observaciones</div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">"{income.notes}"</p>
                     </div>
                 )}
             </div>

             {/* Sección de Auditoría */}
             <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/40 p-8">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-8 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Trazabilidad Forense
                 </h2>
                 <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    {auditLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="absolute left-[9px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900 shadow-sm" />
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{log.action}</span>
                                    <span className="text-[10px] text-zinc-400 font-bold">{new Date(log.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500">Ejecutado por <span className="font-bold text-zinc-700 dark:text-zinc-300">{log.user.name}</span> <span className="text-[9px] text-zinc-400">({log.user.role})</span></div>
                            </div>
                        </div>
                    ))}
                    {auditLogs.length === 0 && (
                        <div className="text-xs text-zinc-400 italic pl-8">Sin registros de auditoría vinculados.</div>
                    )}
                 </div>
             </div>
          </div>

          <div className="flex flex-col gap-6">
              {/* Card de Montos */}
              <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="relative z-10">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Ejecución de Fondos</div>
                      
                      <div className="flex flex-col gap-8">
                          <div>
                              <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                 ${Number(income.amountUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">Monto Neto en Dólares</div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                 Bs. {Number(income.amountVES).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                                 Tasa Aplicada: {Number(income.exchangeRate).toFixed(4)}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Card de Soporte Documental */}
              <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Soporte Documental</h3>
                  {income.attachmentUrl ? (
                      <div className="flex flex-col gap-4">
                          <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700 overflow-hidden group">
                              {income.attachmentName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <img src={income.attachmentUrl} alt="Soporte" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                  <div className="flex flex-col items-center gap-2">
                                      <FileCheck className="w-10 h-10 text-zinc-300" />
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Documento PDF</span>
                                  </div>
                              )}
                          </div>
                          <a 
                            href={income.attachmentUrl} 
                            target="_blank" 
                            className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                             <Download className="w-4 h-4" /> Descargar Soporte
                          </a>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 opacity-40">
                          <AlertTriangle className="w-10 h-10 text-zinc-400" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Sin soporte físico para este movimiento.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  )
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
