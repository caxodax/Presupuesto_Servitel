import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function getUsers() {
  const user = await requireAuth()
  
  if (user.role !== "SUPER_ADMIN") {
     throw new Error("ACCCESO BLOQUEADO: Se requiere alcance global.")
  }

  return prisma.user.findMany({
    include: {
        company: { select: { name: true } },
        branch: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}
