"use client"

import { useState, useEffect } from "react"
import { InvoiceModal } from "@/components/facturas/InvoiceModal"
import { 
    Receipt, 
    Plus, 
    Search, 
    Edit2, 
    ExternalLink, 
    Ban,
    Loader2,
    Calendar,
    UserCircle,
    Layers
} from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { anulateInvoice } from "@/features/invoices/server/actions"
import { toast } from "sonner"

type InvoicesClientProps = {
    invoices: any[]
    companies: any[]
    businessGroups: any[]
    initialAllocations: any[]
    currentBcvRate: string | number
    userRole: string
    totalPages: number
    currentPage: number
    totalItems: number
}

export function InvoicesClient({ 
    invoices, 
    companies, 
    businessGroups,
    initialAllocations,
    currentBcvRate, 
    userRole,
    totalPages,
    currentPage,
    totalItems
}: InvoicesClientProps) {
  const invoicesList = Array.isArray(invoices) ? invoices : (invoices as any).items || []
  const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
  const businessGroupsList = Array.isArray(businessGroups) ? businessGroups : (businessGroups as any).items || []

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isAnulating, setIsAnulating] = useState<number | null>(null)
  const [localInvoices, setLocalIncomes] = useState(invoicesList)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentGroupId = searchParams.get('groupId')
  const currentCompanyId = searchParams.get('companyId')

  useEffect(() => {
    setLocalIncomes(Array.isArray(invoices) ? invoices : (invoices as any).items || [])
  }, [invoices])

  const handleOpenCreate = () => {
    setModalMode("create")
    setSelectedInvoice(null)
  }

  const handleOpenEdit = (inv: any) => {
    setSelectedInvoice(inv)
    setModalMode("edit")
  }

  const handleAnulate = async (id: number) => {
    if (!confirm("¿Desea anular esta factura? Esta acción restaurará los fondos al presupuesto.")) return
    
    // Optimistic Update
    const previousInvoices = [...localInvoices]
    setLocalIncomes((prev: any[]) => prev.map((inv: any) => inv.id === id ? { ...inv, status: 'CANCELLED' } : inv))
    
    setIsAnulating(id)
    try {
        await anulateInvoice(id)
        toast.success("Factura anulada con éxito", {
            description: "Los fondos han sido reintegrados a la categoría correspondiente."
        })
    } catch (e: any) {
        setLocalIncomes(previousInvoices) // Rollback
        toast.error(e.message || "Error al anular", {
            description: "No se pudo procesar la anulación en el servidor."
        })
    } finally {
        setIsAnulating(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Receipt className="w-8 h-8 text-indigo-500" /> Registro de Facturas
           </h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">Gestión y control de egresos contra presupuesto operativo.</p>
         </div>
         <button 
            onClick={handleOpenCreate}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
         >
            <Plus className="w-4 h-4" /> Nueva Factura
         </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
         <div className="w-full md:w-80">
            <SearchInput placeholder="Buscar por nro. o proveedor..." />
         </div>
         {userRole === 'SUPER_ADMIN' && (
             <div className="flex flex-wrap gap-4 items-center bg-zinc-50 dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                 <div className="flex items-center gap-2 px-3 border-r border-zinc-200 dark:border-zinc-800">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <select 
                        value={currentGroupId || ''}
                        onChange={e => {
                            const params = new URLSearchParams(searchParams.toString())
                            if (e.target.value) params.set('groupId', e.target.value)
                            else params.delete('groupId')
                            params.delete('companyId')
                            params.delete('page')
                            router.push(`${pathname}?${params.toString()}`)
                        }}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-zinc-500 cursor-pointer"
                    >
                        <option value="">Matriz: Todas</option>
                        {businessGroupsList.filter((g: any) => g.isActive).map((g: any) => (
                            <option key={g.id} value={g.id.toString()}>{g.name}</option>
                        ))}
                    </select>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/facturas" className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!currentCompanyId ? 'bg-white dark:bg-zinc-700 shadow-sm text-foreground border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500'}`}>
                        Global
                    </Link>
                    {companiesList
                        .filter((c: any) => !currentGroupId || Number(c.groupId) === Number(currentGroupId))
                        .map((company: any) => (
                            <Link 
                                key={company.id} 
                                href={`/dashboard/facturas?companyId=${company.id}${currentGroupId ? `&groupId=${currentGroupId}` : ''}`} 
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentCompanyId === String(company.id) ? 'bg-white dark:bg-zinc-700 shadow-sm text-foreground border border-zinc-200 dark:border-zinc-600' : 'text-zinc-500 hover:text-foreground'}`}
                            >
                                {company.name}
                            </Link>
                        ))}
                 </div>
             </div>
         )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Detalles del Documento</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Monto USD</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Monto VES</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Estado</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {localInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${inv.status === 'CANCELLED' ? 'bg-rose-50 border-rose-100 text-rose-400 dark:bg-rose-500/5 dark:border-rose-900/30' : 'bg-indigo-50 border-indigo-100 text-indigo-500 dark:bg-indigo-500/5 dark:border-indigo-900/30'}`}>
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-foreground tracking-tight">#{inv.number}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{inv.supplierName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-3 h-3 text-zinc-300" />
                                    <span className="text-[10px] text-zinc-400 font-medium">{new Date(inv.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className={`font-black text-sm ${inv.status === 'CANCELLED' ? 'text-zinc-400 line-through' : 'text-foreground'}`}>
                                ${Number(inv.amountUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">USD</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className={`font-bold text-xs ${inv.status === 'CANCELLED' ? 'text-zinc-400 line-through' : 'text-zinc-500'}`}>
                                {Number(inv.amountVES).toLocaleString(undefined, { minimumFractionDigits: 2 })} Bs
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Rate: {Number(inv.exchangeRate).toFixed(4)}</span>
                        </div>
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
                                disabled={inv.status === 'CANCELLED'}
                                className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-500 transition-all active:scale-90 border border-transparent hover:border-amber-100 disabled:opacity-30"
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
                             <button 
                                onClick={() => handleAnulate(inv.id)}
                                disabled={inv.status === 'CANCELLED' || isAnulating === inv.id}
                                className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-100 disabled:opacity-30"
                                title="Anular Factura"
                             >
                                {isAnulating === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {localInvoices.length === 0 && (
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
                <Pagination page={currentPage} pageCount={totalPages} total={totalItems} />
            </div>
         )}
      </div>

      {modalMode && (
        <InvoiceModal 
            mode={modalMode}
            invoice={selectedInvoice}
            companies={companies}
            initialAllocations={initialAllocations}
            currentBcvRate={currentBcvRate}
            userRole={userRole}
            onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
