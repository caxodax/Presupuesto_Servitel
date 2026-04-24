import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function getUsers(companyId?: string, branchId?: string, page: number = 1, limit: number = 10) {
  const user = await requireAuth()
  
  if (user.role !== "SUPER_ADMIN") {
     throw new Error("ACCCESO BLOQUEADO: Se requiere alcance global.")
  }

  const whereClause: any = {}
  if (companyId) whereClause.companyId = companyId
  if (branchId) whereClause.branchId = branchId

  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: whereClause })
  ])

  return {
    items,
    total,
    pageCount: Math.ceil(total / limit)
  }
}
