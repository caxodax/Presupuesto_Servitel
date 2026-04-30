import { requireAuth } from "@/lib/permissions"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Aseguramos que el cascarón principal cierre el flujo si el Middleware lo dejara pasar
  await requireAuth()

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* Sidebar de anclaje */}
      <Sidebar />
      
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* Topbar Fijo Superior */}
        <Topbar />
        
        {/* Workspace Central (única zona escroleable del Layout, Patrón App Shell) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
