import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

/**
 * Trae empresas puras. Cerrado por seguridad absoluta al Super Admin.
 */
export async function getCompanies() {
  const user = await requireAuth()
  const whereClause = user.role === 'SUPER_ADMIN' ? {} : { id: user.companyId as string };
  
  return prisma.company.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Trae sucursales. Respeta la partición de datos:
 * Super Admin ve todo, Empresa Admin o Auditor ve solo las de su corporación.
 */
export async function getBranches() {
  const user = await requireAuth()
  const whereClause = user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId as string };
    
  return prisma.branch.findMany({
    where: whereClause,
    include: { company: true }, // Permite a la Vista leer a quién pertenecen
    orderBy: { createdAt: 'desc' }
  })
}
