"use client"

import { useState, useEffect } from "react"
import { IncomeModal } from "@/components/incomes/IncomeModal"
import { Wallet, Plus, Search, Edit2, ExternalLink, Trash2, Loader2, Calendar, Layers } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { deleteIncome } from "@/features/incomes/server/actions"
import { toast } from "sonner"

type IncomesClientProps = {
    incomes: any[]
    companies: any[]
    categories: any[]
    businessGroups: any[]
    currentBcvRate: string | number
    userRole: string
    totalPages: number
    currentPage: number
    totalItems: number
    defaultCompanyId?: string
    searchParams?: any
}

export function IncomesClient({ 
    incomes, 
    companies, 
    categories, 
    businessGroups,
    currentBcvRate, 
    userRole,
    totalPages,
    currentPage,
    totalItems,
    defaultCompanyId,
    searchParams: propsSearchParams
}: IncomesClientProps) {
  const incomesList = Array.isArray(incomes) ? incomes : (incomes as any).items || []
  const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
  const businessGroupsList = Array.isArray(businessGroups) ? businessGroups : (businessGroups as any).items || []

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null)
  const [selectedIncome, setSelectedIncome] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [localIncomes, setLocalIncomes] = useState(incomesList)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentGroupId = searchParams.get('groupId')
  const currentCompanyId = searchParams.get('companyId')

  useEffect(() => {
    setLocalIncomes(Array.isArray(incomes) ? incomes : (incomes as any).items || [])
  }, [incomes])

  const handleOpenCreate = () => {
    setModalMode("create")
    setSelectedIncome(null)
  }

  const handleOpenEdit = (inc: any) => {
    setSelectedIncome(inc)
    setModalMode("edit")
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este registro de ingreso?")) return
    
    // Optimistic Update
    const previousIncomes = [...localIncomes]
    setLocalIncomes((prev: any[]) => prev.filter((inc: any) => inc.id !== id))
    
    setIsDeleting(id)
    try {
        await deleteIncome(id)
        toast.success("Ingreso eliminado correctamente", {
            description: "El flujo de caja ha sido actualizado."
        })
    } catch (e: any) {
        setLocalIncomes(previousIncomes) // Rollback
        toast.error(e.message || "Error al eliminar", {
            description: "No se pudo completar la operación en el servidor."
        })
    } finally {
        setIsDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-500" /> Registro de Ingresos
           </h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">Control de entradas de capital y facturación emitida.</p>
         </div>
         <button 
            onClick={handleOpenCreate}
            className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
         >
            <Plus className="w-4 h-4" /> Nuevo Ingreso
         </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
         <div className="w-full md:w-80 shrink-0">
            <SearchInput placeholder="Buscar por #Documento o Cliente..." />
         </div>
         {userRole === 'SUPER_ADMIN' && (
             <div className="flex items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/50 shadow-inner">
                 {/* Filtro Matriz */}
                 {businessGroupsList.length > 0 && (
                     <>
                         <div className="relative">
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
                                 className={`h-8 px-3 pr-7 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[150px] appearance-none cursor-pointer transition-all ${currentGroupId ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                             >
                                 <option value="">🏢 Todas Matrices</option>
                                 {businessGroupsList.filter((g: any) => g.isActive).map((g: any) => (
                                     <option key={g.id} value={g.id.toString()}>{g.name}</option>
                                 ))}
                             </select>
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                 <Layers className="w-3 h-3 text-indigo-500" />
                             </div>
                         </div>
                         <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                     </>
                 )}

                 {/* Filtro Empresa */}
                 <div className="relative">
                     <select
                         value={currentCompanyId || ''}
                         onChange={e => {
                             const params = new URLSearchParams(searchParams.toString())
                             if (e.target.value) params.set('companyId', e.target.value)
                             else params.delete('companyId')
                             params.delete('page')
                             router.push(`${pathname}?${params.toString()}`)
                         }}
                         className={`h-8 px-3 pr-7 rounded-lg font-bold border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-[11px] w-[160px] appearance-none cursor-pointer transition-all ${currentCompanyId ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                     >
                         <option value="">🏢 Todas Empresas</option>
                         {companiesList
                             .filter((c: any) => !currentGroupId || Number(c.groupId) === Number(currentGroupId))
                             .map((c: any) => (
                                 <option key={c.id} value={String(c.id)}>{c.name}</option>
                             ))}
                     </select>
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                         <Layers className="w-3 h-3 text-zinc-400" />
                     </div>
                 </div>
             </div>
         )}
      </div>


      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Identificador</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Categoría / Sucursal</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Monto (USD)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {localIncomes.map((inc: any) => (
                  <tr key={inc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <span className="font-black text-foreground tracking-tight">#{inc.number}</span>
                          <span className="text-[10px] text-zinc-400 font-bold">{new Date(inc.date).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="font-bold text-zinc-700 dark:text-zinc-300">{inc.clientName}</span>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">{inc.category.name}</span>
                            <span className="text-[10px] text-zinc-400 font-black uppercase tracking-tighter">{inc.branch?.name || 'GLOBAL'}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                ${Number(inc.amountUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold">VES {Number(inc.amountVES).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => handleOpenEdit(inc)}
                                className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-500 transition-all active:scale-90 border border-transparent hover:border-amber-100"
                                title="Editar Ingreso"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <Link 
                                href={`/dashboard/ingresos/${inc.id}`}
                                className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-indigo-500 transition-all active:scale-90 border border-transparent hover:border-indigo-100"
                                title="Ver Detalles"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </Link>
                             <button 
                                onClick={() => handleDelete(inc.id)}
                                disabled={isDeleting === inc.id}
                                className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-100 disabled:opacity-50"
                                title="Eliminar Ingreso"
                             >
                                {isDeleting === inc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {localIncomes.length === 0 && (
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
                <Pagination page={currentPage} pageCount={totalPages} total={totalItems} searchParams={propsSearchParams} />
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
            defaultCompanyId={defaultCompanyId}
            onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
