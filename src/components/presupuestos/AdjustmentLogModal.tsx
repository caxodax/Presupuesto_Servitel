"use client"

import { useState } from "react"
import { Activity, X, List } from "lucide-react"

export function AdjustmentLogModal({ adjustments }: { adjustments: any[] }) {
  const [isOpen, setIsOpen] = useState(false)

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
                  {adjustments.map(adj => (
                    <div key={adj.id} className="text-sm bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                       <div className="flex justify-between items-start mb-2">
                           <div>
                               <span className="font-bold text-foreground">{adj.categoryName}</span>
                               <p className="text-xs text-zinc-500 mt-0.5">{adj.reason}</p>
                           </div>
                           <span className={`font-black text-lg ${Number(adj.amountUSD) > 0 ? 'text-emerald-500' : 'text-rose-500'} bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg border border-zinc-100 dark:border-zinc-700`}>
                               {Number(adj.amountUSD) > 0 ? '+' : ''}{Number(adj.amountUSD)}
                           </span>
                       </div>
                       <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                          <span>{new Date(adj.createdAt).toLocaleDateString()}</span>
                          <span>{new Date(adj.createdAt).toLocaleTimeString()}</span>
                       </div>
                    </div>
                  ))}
                  {adjustments.length === 0 && (
                     <div className="text-center py-12 text-zinc-500 italic font-medium">Sin historial registrado</div>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  )
}
