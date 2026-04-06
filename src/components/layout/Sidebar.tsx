import Link from "next/link"
import { auth } from "@/lib/auth"
import { LayoutDashboard, Building2, GitBranch, Layers, FolderTree, FileText, Activity, Users } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Empresas", href: "/dashboard/empresas", icon: Building2, roles: ["SUPER_ADMIN"] },
  { name: "Usuarios", href: "/dashboard/usuarios", icon: Users, roles: ["SUPER_ADMIN"] },
  { name: "Sucursales", href: "/dashboard/sucursales", icon: GitBranch, roles: ["SUPER_ADMIN"] },
  { name: "Categorías", href: "/dashboard/categorias", icon: FolderTree, roles: ["SUPER_ADMIN"] },
  { name: "Presupuestos", href: "/dashboard/presupuestos", icon: Layers, roles: ["SUPER_ADMIN"] },
  { name: "Facturas", href: "/dashboard/facturas", icon: FileText },
  { name: "Auditoría", href: "/dashboard/auditoria", icon: Activity, roles: ["SUPER_ADMIN"] },
]

export async function Sidebar() {
  const session = await auth()
  const userRole = session?.user?.role || "GUEST"

  return (
    <div className="flex h-full w-64 flex-col border-r bg-zinc-950 text-zinc-300">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800/80">
        <span className="text-[17px] font-semibold tracking-tight text-white">SaaS Presupuesto</span>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navigation.filter(item => !item.roles || item.roles.includes(userRole)).map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-zinc-900 hover:text-white"
            >
              <Icon className="h-4 w-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Empresa Activa</div>
        <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-zinc-100 truncate">Contexto actual</span>
        </div>
      </div>
    </div>
  )
}
