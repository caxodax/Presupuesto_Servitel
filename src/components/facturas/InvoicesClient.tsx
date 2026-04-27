"use client"

import { useState } from "react"
import { InvoiceModal } from "@/components/facturas/InvoiceModal"
import { FileText, Plus, Search, Edit2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"

type InvoicesClientProps = {
    invoices: any[]
    companies: any[]
    availableAllocations: any[]
    currentBcvRate: string | number
    userRole: string
    totalPages: number
}

export function InvoicesClient({ 
    invoices, 
    companies, 
    availableAllocations, 
    currentBcvRate, 
    userRole,
    totalPages
}: InvoicesClientProps) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  const handleOpenCreate = () => {
    setModalMode("create")
    setSelectedInvoice(null)
  }

  const handleOpenEdit = (inv: any) => {
    setSelectedInvoice(inv)
    setModalMode("edit")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-500" /> Depósito Operacional
           </h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">Manejo central de facturas y auditoría de egresos.</p>
         </div>
         <div className="flex items-center gap-3">
            <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 h-12 rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest"
            >
                <Plus className="w-5 h-5" /> Nueva Factura
            </button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-full md:w-96">
            <SearchInput placeholder="Buscar por #Factura o Proveedor..." />
          </div>
          <div className="flex-1" />
          {/* Aquí podrías añadir un CompanyFilter si lo prefieres en el cliente */}
      </div>

      <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <tr>
                  <th className="px-8 py-5">Identificador</th>
                  <th className="px-8 py-5">Proveedor / Origen</th>
                  <th className="px-8 py-5">Centro de Impacto</th>
                  <th className="px-8 py-5 text-right">Monto (USD)</th>
                  <th className="px-8 py-5 text-center">Estado</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <span className="font-black text-foreground text-sm tracking-tight">#{inv.number}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(inv.date).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-zinc-700 dark:text-zinc-300">{inv.supplierName}</td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{(inv.allocation as any).category.name}</span>
                           <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{(inv.allocation as any).budget.branch.name}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="font-black text-foreground text-sm">${Number(inv.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-zinc-400 font-bold">VES {Number(inv.amountVES).toLocaleString('es-VE')}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                            inv.status === 'CANCELLED' 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}>
                            {inv.status === 'REGISTERED' ? 'REGISTRADA' : 'ANULADA'}
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => handleOpenEdit(inv)}
                                className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-500 transition-all active:scale-90 border border-transparent hover:border-amber-100"
                                title="Editar Factura"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <Link 
                                href={`/dashboard/facturas/${inv.id}`}
                                className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-indigo-500 transition-all active:scale-90 border border-transparent hover:border-indigo-100"
                                title="Ver Detalles"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </Link>
                        </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                       <div className="flex flex-col items-center gap-3">
                           <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-[24px] flex items-center justify-center">
                              <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                           </div>
                           <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Sin resultados encontrados</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
         {totalPages > 1 && (
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
                <Pagination totalPages={totalPages} />
            </div>
         )}
      </div>

      {modalMode && (
        <InvoiceModal 
            mode={modalMode}
            invoice={selectedInvoice}
            availableAllocations={availableAllocations}
            currentBcvRate={currentBcvRate}
            onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
