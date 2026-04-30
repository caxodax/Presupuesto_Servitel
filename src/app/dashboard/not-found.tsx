import { FileQuestion, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-6">
       <div className="relative flex items-center justify-center">
          <div className="text-[150px] font-black text-zinc-100 dark:text-zinc-900 leading-none select-none">404</div>
          <div className="absolute bg-white dark:bg-zinc-950 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800">
             <FileQuestion className="w-12 h-12 text-indigo-500" />
          </div>
       </div>
       <div className="text-center mt-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">Enclave No Identificado</h2>
          <p className="text-sm text-zinc-500 mb-8 max-w-[320px] mx-auto text-balance leading-relaxed">
             La sub-ruta a la que intentes acceder ha sido eliminada por otro auditor o se encuentra bloqueada en tu rol de sistema.
          </p>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 h-11 px-8 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-md">
             <ArrowLeft className="w-4 h-4" /> Retornar a Zona Segura
          </Link>
       </div>
    </div>
  )
}
