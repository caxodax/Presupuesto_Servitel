import { requireAuth } from "@/lib/permissions"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Un único requireAuth() para todo el layout — se deduplica via React.cache()
  // pero aún así lo centralizamos aquí para pasar datos a Sidebar y Topbar sin llamadas extra.
  const user = await requireAuth()

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* Sidebar de anclaje */}
      <Sidebar userRole={user.role} />
      
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* Topbar Fijo Superior */}
        <Topbar user={user} />
        
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
