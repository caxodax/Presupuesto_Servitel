"use client"
import { AlertTriangle, RefreshCcw, ShieldAlert } from "lucide-react"
import { useEffect } from "react"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    // Aquí en producción viajaría a Sentry o DataDog
    console.error("Boundaries Caught Critical Panic:", error)
  }, [error])

  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-6">
      <div className="relative">
         <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 dark:border-rose-900/50">
             <ShieldAlert className="w-10 h-10" />
         </div>
         <div className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm">
             <div className="w-4 h-4 bg-rose-500 rounded-full animate-pulse" />
         </div>
      </div>
      
      <div className="text-center max-w-lg w-full">
         <h2 className="text-2xl font-black tracking-tight text-foreground mb-2">Interrupción de Seguridad o Dato Nulo</h2>
         <p className="text-sm text-zinc-500 mb-6 px-4">
            El sistema ha abortado o bloqueado la petición para proteger la integridad multitenant.
         </p>
         <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-left mb-6 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap">
            &gt; ERROR CAUSA: {error.message || "Excepción de comunicación fallida RLS."}
         </div>

         <div className="flex items-center justify-center gap-4">
             <button onClick={() => window.history.back()} className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg text-sm font-bold text-zinc-500 hover:text-foreground transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                Evacuar
             </button>
             <button onClick={() => reset()} className="flex items-center justify-center gap-2 bg-foreground text-background dark:bg-indigo-600 dark:text-white h-10 px-6 rounded-lg text-sm font-bold hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98] transition-all">
                <RefreshCcw className="w-4 h-4" /> Forzar Reintento Fuerte
             </button>
         </div>
      </div>
    </div>
  )
}
