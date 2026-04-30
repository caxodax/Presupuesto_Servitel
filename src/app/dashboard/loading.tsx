import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-5">
      <div className="relative flex items-center justify-center">
         <div className="absolute w-16 h-16 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full animate-ping" />
         <div className="w-12 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-[0_4px_40px_rgba(0,0,0,0.05)] flex items-center justify-center z-10">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
         </div>
      </div>
      <div className="flex flex-col items-center">
         <p className="text-sm font-bold tracking-widest uppercase text-foreground mb-1">Cargando Bóveda</p>
         <p className="text-[11px] font-medium text-zinc-500 animate-pulse">Sincronizando claves RLS y enclaves financieros...</p>
      </div>
    </div>
  )
}
