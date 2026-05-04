import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Outer Glow Effect */}
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        
        {/* Main Spinner Container */}
        <div className="relative bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-2xl flex flex-col items-center gap-6">
          <div className="relative">
             <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin stroke-[1.5px]" />
             {/* Subtle internal pulse */}
             <div className="absolute inset-0 bg-indigo-500/10 blur-xl animate-pulse rounded-full" />
          </div>
          
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white uppercase">
              Sincronizando
            </h3>
            <div className="flex items-center gap-2">
               <span className="h-1 w-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
               <span className="h-1 w-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
               <span className="h-1 w-1 rounded-full bg-indigo-500 animate-bounce" />
            </div>
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-2">
              Arquitectura Servitel
            </p>
          </div>
        </div>
      </div>
      
      {/* Background Decorative Element */}
      <div className="mt-12 text-[10px] font-black text-zinc-300 dark:text-zinc-800 uppercase tracking-widest select-none">
        Procesando transiciones de alta fidelidad
      </div>
    </div>
  )
}
