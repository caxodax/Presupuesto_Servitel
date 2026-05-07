import { Loader2 } from "lucide-react"

export default function IngresosLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-2xl flex flex-col items-center gap-6">
          <div className="relative">
             <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin stroke-[1.5px]" />
             <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full" />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white uppercase">
              Cargando Ingresos
            </h3>
            <div className="flex items-center gap-2">
               <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
               <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
               <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
            </div>
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-2">
              Flujo de Caja
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
