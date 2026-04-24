import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

/**
 * Trae empresas puras. Cerrado por seguridad absoluta al Super Admin.
 * Si se pasa 'page', devuelve un objeto con metadata de paginación.
 * Si NO se pasa 'page', devuelve un array directo (mantiene compatibilidad).
 */
export async function getCompanies(query?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  const whereClause: any = user.role === 'SUPER_ADMIN' ? {} : { id: user.companyId as string };
  
  if (query) {
    whereClause.name = { contains: query, mode: 'insensitive' }
  }

  if (page === undefined) {
    return prisma.company.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.company.count({ where: whereClause })
  ]);
  
  return {
    items,
    total,
    pageCount: Math.ceil(total / limit)
  }
}

/**
 * Trae todas las empresas sin paginación (ideal para selectores).
 */
export async function getAllCompanies() {
  const user = await requireAuth()
  const whereClause = user.role === 'SUPER_ADMIN' ? {} : { id: user.companyId as string };
  
  return prisma.company.findMany({
    where: whereClause,
    orderBy: { name: 'asc' }
  })
}

/**
 * Trae sucursales. Respeta la partición de datos:
 * Super Admin ve todo (o filtra por compañía), Empresa Admin o Auditor ve solo las de su corporación.
 */
export async function getBranches(companyId?: string, query?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  
  const whereClause: any = {}
  
  // Seguridad: Los no-SuperAdmin NUNCA pueden ver otras empresas
  if (user.role !== 'SUPER_ADMIN') {
    whereClause.companyId = user.companyId as string
  } else if (companyId) {
    whereClause.companyId = companyId
  }

  if (query) {
    whereClause.name = { contains: query, mode: 'insensitive' }
  }

  if (page === undefined) {
    return prisma.branch.findMany({
      where: whereClause,
      include: { company: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.branch.findMany({
      where: whereClause,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.branch.count({ where: whereClause })
  ]);
  
  return {
    items,
    total,
    pageCount: Math.ceil(total / limit)
  }
}
