import { getInvoiceDetails } from "@/features/invoices/server/queries"
import { ArrowLeft, CheckCircle2, TrendingDown, AlertTriangle, User } from "lucide-react"
import Link from "next/link"

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { invoice, analytics } = await getInvoiceDetails(params.id)
  
  // Condición evaluadora si esta factura cayó en presupuesto sangrado (Excedente no bloqueante)
  const isOverBudget = analytics.overBudgetSpill > 0;
  
  return (
    <div className="max-w-4xl flex flex-col gap-8 pb-10">
      
      <div>
         <Link href="/dashboard/facturas" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit mb-4">
           <ArrowLeft className="w-4 h-4" /> Directorio Transaccional
         </Link>
         
         <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <h1 className="text-3xl font-bold tracking-tight text-foreground">Factura #{invoice.number}</h1>
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PROCESADA
                 </span>
             </div>
             
             {isOverBudget && (
                 <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                     <AlertTriangle className="w-4 h-4" />
                     <span className="text-xs font-bold uppercase tracking-wider">Sobregiro Detectado</span>
                 </div>
             )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Columna Data Dura */}
          <div className="md:col-span-2 flex flex-col gap-6">
             {/* Info de Proveedor y Fechas */}
             <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-2">Información Jurídica</h2>
                 <div className="grid grid-cols-2 gap-y-6">
                     <div>
                        <div className="text-xs text-muted-foreground mb-1">Proveedor (Razón Social)</div>
                        <div className="font-semibold text-foreground">{invoice.supplierName}</div>
                     </div>
                     <div>
                        <div className="text-xs text-muted-foreground mb-1">Impacto Trazado A:</div>
                        <div className="font-semibold text-foreground">{invoice.allocation.category.name}</div>
                        <div className="text-xs text-zinc-500">{invoice.allocation.budget.name} — {invoice.allocation.budget.branch.name}</div>
                     </div>
                     <div>
                        <div className="text-xs text-muted-foreground mb-1">Fecha Contable</div>
                        <div className="font-semibold text-foreground">{invoice.date.toLocaleDateString()}</div>
                     </div>
                     <div>
                        <div className="text-xs text-muted-foreground mb-1">Operador Procesante</div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                           <User className="w-4 h-4 text-zinc-400" /> {invoice.registeredBy.name}
                        </div>
                     </div>
                 </div>
             </div>

             {/* Financiero */}
             <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                   <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Volumen Procesado</h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="text-sm font-semibold text-foreground mb-2">Base en Moneda Fuerte (USD)</div>
                        <div className="text-4xl font-black tracking-tight text-foreground">${Number(invoice.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="border-l border-zinc-200 dark:border-zinc-800 pl-8">
                        <div className="text-sm font-medium text-muted-foreground mb-4 flex justify-between">
                            <span>Tasa Cambiaria B.C.V.</span>
                            <span className="font-mono text-zinc-500">x{Number(invoice.exchangeRate)}</span>
                        </div>
                        <div className="text-xs font-semibold text-foreground mb-1 uppercase tracking-widest">Equivalencia Operativa (VES)</div>
                        <div className="text-2xl font-bold tracking-tight text-zinc-500">Bs. {Number(invoice.amountVES).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>
             </div>
          </div>
          
          {/* Columna Feedback Impacto Presupuestal */}
          <div className="md:col-span-1 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden h-fit flex flex-col">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50">
                   <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                       <TrendingDown className="w-4 h-4" /> Exposición Financiera
                   </h2>
              </div>
              
              <div className="p-5 flex flex-col gap-6">
                 <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-500">Consumo Acumulado Actual</span>
                        <span className="font-bold text-foreground">
                            {(analytics.totalConsumedNow / analytics.hardLimit * 100).toFixed(1)}%
                        </span>
                    </div>
                    
                    {/* Barra de progreso visual con Feedback condicional de excedente */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-2.5 overflow-hidden flex">
                        <div 
                           className={`h-full ${isOverBudget ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                           style={{ width: `${Math.min((analytics.totalConsumedNow / analytics.hardLimit) * 100, 100)}%` }} 
                        />
                    </div>
                 </div>

                 <div className="space-y-3">
                     <div className="flex justify-between items-center text-sm">
                         <span className="text-muted-foreground">Límite Aprobado</span>
                         <span className="font-semibold">${analytics.hardLimit.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800 pt-3">
                         <span className="text-muted-foreground">Espacio Restante</span>
                         <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                             ${Math.max(analytics.currentCapacity, 0).toLocaleString()}
                         </span>
                     </div>
                     
                     {isOverBudget && (
                        <div className="flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800 pt-3 bg-rose-50/50 dark:bg-rose-950/10 -mx-5 px-5 pb-3">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Desangre Total</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                                -${analytics.overBudgetSpill.toLocaleString()}
                            </span>
                        </div>
                     )}
                 </div>
                 
                 <div className="text-[10px] text-zinc-400 text-center leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                     El impacto es acumulativo en tiempo real basado en el total de facturas atadas a este rubro ({invoice.allocation.category.name}).
                 </div>
              </div>
          </div>

      </div>
    </div>
  )
}
