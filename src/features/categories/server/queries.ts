import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

/**
 * Devuelve el catálogo jerárquico segmentado exclusivamente 
 * al ámbito visible del usuario (RLS)
 */
export async function getCategories() {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user) // Bloquea todo intento de sobre-leer datos de vecinos
  
  return prisma.category.findMany({
    where: filter,
    include: { subcategories: true },
    orderBy: { name: 'asc' }
  })
}
