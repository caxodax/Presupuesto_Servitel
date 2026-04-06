import { auth } from "@/lib/auth"
import { Bell, Search, User, LogOut } from "lucide-react"
import { logout } from "@/app/actions/auth"

export async function Topbar() {
  const session = await auth()
  
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 px-6 shrink-0">
      <div className="flex items-center gap-4 text-sm text-muted-foreground w-1/3">
        {/* Simulación Breadcrumb dinámico por venir */}
        <span className="font-medium text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors">Workspace</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-foreground font-medium">Dashboard General</span>
      </div>
      
      <div className="flex flex-1 items-center justify-center max-w-md">
         <div className="relative w-full group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar factura o proveedor... (Cmd+K)" 
              className="h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-400"
            />
         </div>
      </div>

      <div className="flex items-center justify-end gap-5 w-1/3">
        <button className="relative text-zinc-400 hover:text-foreground transition-colors group p-2">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
        </button>
        <div className="flex items-center gap-3 pl-5 border-l border-zinc-200 dark:border-zinc-800/80">
           <div className="flex flex-col text-right">
             <span className="text-[13px] font-semibold text-foreground leading-none">{session?.user?.name || 'Invitado'}</span>
             <span className="text-[11px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">{session?.user?.role || 'Visitante'}</span>
           </div>
           <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <User className="h-4 w-4" />
           </div>
           
           {session?.user && (
             <form action={logout}>
               <button type="submit" className="ml-2 flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Cerrar sesión">
                 <LogOut className="h-[18px] w-[18px]" />
               </button>
             </form>
           )}
        </div>
      </div>
    </header>
  )
}
