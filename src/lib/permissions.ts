import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  return session.user
}

export function hasRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole)
}

export function enforceCompanyScope(user: { role: string; companyId: string | null }, targetCompanyId?: string) {
  if (user.role === "SUPER_ADMIN") {
    return targetCompanyId ? { companyId: targetCompanyId } : {}
  }

  if (!user.companyId) {
    throw new Error("FORBIDDEN: El usuario no tiene empresa asignada.")
  }

  if (targetCompanyId && targetCompanyId !== user.companyId) {
    throw new Error("FORBIDDEN: Intento de acceso a otra empresa.")
  }

  return { companyId: user.companyId }
}

export function getBranchIsolation(user: { role: string; branchId: string | null }) {
  if (user.role === "OPERATOR") {
    if (!user.branchId) {
       throw new Error("FORBIDDEN: El operador no tiene una sucursal anclada y no puede visualizar datos.")
    }
    return { branchId: user.branchId }
  }
  return {} // Otros roles no tienen este aislamiento forzado.
}
