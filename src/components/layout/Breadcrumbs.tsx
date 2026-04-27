"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

const routeMap: Record<string, string> = {
  "dashboard": "Dashboard",
  "presupuestos": "Presupuestos",
  "facturas": "Facturas",
  "usuarios": "Usuarios",
  "auditoria": "Auditoría",
  "empresas": "Empresas",
  "sucursales": "Sucursales",
  "nuevo": "Nuevo Registro",
  "categorias": "Categorías"
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const paths = pathname.split("/").filter(Boolean)

  return (
    <nav className="flex items-center gap-2 text-sm font-medium tracking-tight">
      <Link 
        href="/dashboard"
        className="text-zinc-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Workspace</span>
      </Link>

      {paths.length > 0 && <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />}

      {paths.map((path, index) => {
        // Ignoramos 'dashboard' en el loop si ya pusimos 'Workspace' como inicio
        if (path === "dashboard") return null

        const href = `/${paths.slice(0, index + 1).join("/")}`
        const isLast = index === paths.length - 1
        const label = routeMap[path] || (isNaN(Number(path)) ? path : `#${path}`)

        return (
          <div key={href} className="flex items-center gap-2">
            {isLast ? (
              <span className="text-foreground font-bold capitalize">
                {label.replace(/-/g, ' ')}
              </span>
            ) : (
              <>
                <Link 
                  href={href}
                  className="text-zinc-400 hover:text-indigo-500 transition-colors capitalize"
                >
                  {label.replace(/-/g, ' ')}
                </Link>
                {!isLast && <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />}
              </>
            )}
          </div>
        )
      })}
    </nav>
  )
}
