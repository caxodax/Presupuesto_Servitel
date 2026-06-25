import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/database"
import { redirect } from "next/navigation"
import { cache } from "react"
import { measureAsync } from "@/lib/perf"

/**
 * Obtiene la sesión actual y el perfil extendido del usuario desde la base de datos.
 * Reemplaza la antigua función 'auth()' de NextAuth.
 * Usamos `cache` de React para deduplicar llamadas dentro de un mismo ciclo de renderizado.
 */
export const getSession = cache(async () => {
  return measureAsync("requireAuth", async () => {
    const supabase = await createClient()
    
    // Usamos getSession en lugar de getUser para leer el token JWT directamente de la cookie.
    // Esto es instantáneo (0ms) y evita una petición de red al servidor de Auth de Supabase (que tomaba ~200ms).
    const { data: { session }, error } = await supabase.auth.getSession()
    const user = session?.user
    
    if (!user || error) {
      return null
    }

    const meta = user.app_metadata || {}

    // Si el JWT ya contiene los claims personalizados (gracias al Trigger SQL),
    // evitamos hacer la consulta a la base de datos (0ms de latencia).
    if (meta.role) {
      return {
        user: {
          ...user,
          id: meta.profileId ? meta.profileId.toString() : user.id,
          profileId: meta.profileId,
          name: meta.name || user.email,
          role: meta.role,
          companyId: meta.companyId,
          branchId: meta.branchId,
          profile: null // Ya no es necesario cargar el perfil completo
        }
      }
    }

    // FALLBACK: Si el usuario aún tiene un token viejo (no ha vuelto a iniciar sesión
    // después de la migración), consultamos la base de datos para no romper la app.
    const { data: profile, error: profileError } = await (supabase.from('User') as any)
      .select('*, Company(id, name), Branch(id, name)')
      .eq('authId', user.id)
      .single()

    if (profileError || !profile) {
      console.error("No se encontró perfil para el usuario autenticado:", user.id)
      return null
    }

    return {
      user: {
        ...user,
        id: (profile as any).id.toString(), // Mantenemos compatibilidad con IDs de Supabase Auth
        profileId: (profile as any).id, 
        name: (profile as any).name,
        role: (profile as any).role,
        companyId: (profile as any).companyId,
        branchId: (profile as any).branchId,
        profile: profile
      }
    }
  })
})
export async function requireAuth() {
  const session = await getSession()
  if (!session || !session.user) {
    redirect("/login")
    throw new Error("UNAUTHORIZED")
  }
  return session.user
}

export function hasRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole)
}

export function enforceCompanyScope(user: { role: string; companyId: number | null }, targetCompanyId?: number) {
  if (user.role === "SUPER_ADMIN") {
    return targetCompanyId ? { companyId: targetCompanyId } : {}
  }

  if (!user.companyId) {
    throw new Error("FORBIDDEN: El usuario no tiene empresa asignada.")
  }

  if (targetCompanyId && Number(targetCompanyId) !== Number(user.companyId)) {
    throw new Error("FORBIDDEN: Intento de acceso a otra empresa.")
  }

  return { companyId: user.companyId }
}

export function getBranchIsolation(user: { role: string; branchId: number | null }) {
  if (user.role === "OPERATOR") {
    if (!user.branchId) {
       throw new Error("FORBIDDEN: El operador no tiene una sucursal anclada y no puede visualizar datos.")
    }
    return { branchId: user.branchId }
  }
  return {}
}
