import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/database"
import { redirect } from "next/navigation"
import { cache } from "react"

/**
 * Obtiene la sesión actual y el perfil extendido del usuario desde la base de datos.
 * Reemplaza la antigua función 'auth()' de NextAuth.
 * Usamos \`cache\` de React para deduplicar llamadas dentro de un mismo ciclo de renderizado.
 */
export const getSession = cache(async () => {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    return null
  }

  // Buscamos el perfil en nuestra tabla 'User' usando el authId (UUID de Supabase Auth)
  const { data: profile, error: profileError } = await supabase
    .from('User')
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
      id: profile.id.toString(), // Mantenemos compatibilidad con IDs de Supabase Auth si es necesario, o usamos el numérico.
      profileId: profile.id, 
      name: profile.name,
      role: profile.role,
      companyId: profile.companyId,
      branchId: profile.branchId,
      profile: profile
    }
  }
})
export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
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
