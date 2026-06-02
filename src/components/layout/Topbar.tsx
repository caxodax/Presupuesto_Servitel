import { User, LogOut } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { AlertCenter } from "@/components/dashboard/AlertCenter"
import { getUnreadAlerts } from "@/features/alerts/server/queries"
import { Breadcrumbs } from "./Breadcrumbs"

type TopbarUser = {
  name?: string
  role?: string
  [key: string]: any
}

// Server Component puro — recibe user como prop desde el layout (sin llamada extra a auth())
export async function Topbar({ user }: { user: TopbarUser }) {
  const alerts = await getUnreadAlerts()
  
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 px-6 shrink-0">
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      <div className="flex items-center justify-end gap-5">
        <AlertCenter initialAlerts={alerts} />
        
        <div className="flex items-center gap-3 pl-5 border-l border-zinc-200 dark:border-zinc-800/80">
           <div className="flex flex-col text-right">
             <span className="text-[13px] font-semibold text-foreground leading-none">{user?.name || 'Invitado'}</span>
             <span className="text-[11px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">{user?.role || 'Visitante'}</span>
           </div>
           <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <User className="h-4 w-4" />
           </div>
           
           {user && (
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
