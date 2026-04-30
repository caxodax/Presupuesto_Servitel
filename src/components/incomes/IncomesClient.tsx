"use client"

import { useState } from "react"
import { IncomeModal } from "@/components/incomes/IncomeModal"
import { Wallet, Plus, Search, Edit2, ExternalLink, Trash2 } from "lucide-react"
import Link from "next/link"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { deleteIncome } from "@/features/incomes/server/actions"
import { toast } from "sonner"

type IncomesClientProps = {
    incomes: any[]
    companies: any[]
    categories: any[]
    currentBcvRate: string | number
    userRole: string
    totalPages: number
}

export function IncomesClient({ 
    incomes, 
    companies, 
    categories, 
    currentBcvRate, 
    userRole,
    totalPages
}: IncomesClientProps) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null)
  const [selectedIncome, setSelectedIncome] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleOpenCreate = () => {
    setModalMode("create")
    setSelectedIncome(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este registro de ingreso?")) return
    
    setIsDeleting(id)
    try {
        await deleteIncome(id)
        toast.success("Ingreso eliminado correctamente")
    } catch (e: any) {
        toast.error(e.message || "Error al eliminar")
    } finally {
        setIsDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-500" /> Registro de Ingresos
           </h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">Control de entradas de capital y facturación emitida.</p>
         </div>
         <div className="flex items-center gap-3">
            <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 h-12 rounded-2xl text-sm font-black hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-widest"
            >
                <Plus className="w-5 h-5" /> Nuevo Ingreso
            </button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-full md:w-96">
            <SearchInput placeholder="Buscar por #Documento o Cliente..." />
          </div>
          <div className="flex-1" />
      </div>

      <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <tr>
                  <th className="px-8 py-5">Identificador</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Categoría / Sucursal</th>
                  <th className="px-8 py-5 text-right">Monto (USD)</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {incomes.map(inc => (
                  <tr key={inc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <span className="font-black text-foreground text-sm tracking-tight">#{inc.number}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(inc.date).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-zinc-700 dark:text-zinc-300">{inc.clientName}</td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{inc.category.name}</span>
                           <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{inc.branch?.name || 'GLOBAL'}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">${Number(inc.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-zinc-400 font-bold">VES {Number(inc.amountVES).toLocaleString('es-VE')}</div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => handleDelete(inc.id)}
                                disabled={isDeleting === inc.id}
                                className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-100 disabled:opacity-50"
                                title="Eliminar Ingreso"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {incomes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
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
        <IncomeModal 
            mode={modalMode}
            income={selectedIncome}
            companies={companies}
            categories={categories}
            currentBcvRate={currentBcvRate}
            userRole={userRole}
            onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
