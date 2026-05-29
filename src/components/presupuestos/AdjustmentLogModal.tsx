"use client"

import { useState, useEffect } from "react"
import { Activity, X, List, Calendar } from "lucide-react"
import { fetchBudgetAdjustments } from "@/features/budgets/server/actions"

export function AdjustmentLogModal({ budgetId }: { budgetId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchBudgetAdjustments(budgetId)
        .then((data) => {
          setAdjustments(data)
        })
        .catch((err) => {
          console.error("Error fetching adjustments:", err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, budgetId])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        <List className="w-3.5 h-3.5" />
        Ver Todos
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
             {/* Header */}
             <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
                      <Activity className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground">Log de Ajustes</h2>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">Historial forense completo del periodo.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-6 right-6 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
             </div>

             <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/30 dark:bg-zinc-950/30">
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : (
                    <>
                      {adjustments.map((adj) => (
                        <div key={adj.id} className="text-sm bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                           <div className="flex justify-between items-start mb-2">
                               <div>
                                   <span className="font-bold text-foreground">{adj.accountName}</span>
                                   <p className="text-xs text-zinc-500 mt-0.5">{adj.reason}</p>
                               </div>
                               <span className={`font-black text-lg ${Number(adj.amountUSD) > 0 ? 'text-emerald-500' : 'text-rose-500'} bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-100 dark:border-zinc-700`}>
                                   {Number(adj.amountUSD) > 0 ? '+' : ''}{Number(adj.amountUSD)}
                               </span>
                           </div>
                           <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-end">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                   <Calendar className="w-3 h-3" />
                                   <span>{new Date(adj.createdAt).toLocaleDateString()} - {new Date(adj.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black">
                                      {adj.recordedBy?.name?.substring(0, 2).toUpperCase() || 'S'}
                                   </div>
                                   <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{adj.recordedBy?.name || 'Sistema'}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                 <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">Estado</span>
                                 <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 uppercase">Auditado</span>
                              </div>
                           </div>
                        </div>
                      ))}
                      {adjustments.length === 0 && (
                         <div className="text-center py-12 text-zinc-500 italic font-medium">Sin historial registrado</div>
                      )}
                    </>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  )
}

function SkeletonRow() {
  return (
    <div className="text-sm bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 animate-pulse flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 w-2/3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-850 rounded-lg w-3/4" />
          <div className="h-3 bg-zinc-100 dark:bg-zinc-850/50 rounded-lg w-1/2" />
        </div>
        <div className="h-8 bg-zinc-200 dark:bg-zinc-850 rounded-xl w-16" />
      </div>
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-end">
        <div className="flex flex-col gap-2 w-1/2">
          <div className="h-3 bg-zinc-200 dark:bg-zinc-850 rounded-lg w-3/4" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-850" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-850/50 rounded-lg w-16" />
          </div>
        </div>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-850 rounded-lg w-14" />
      </div>
    </div>
  )
}
