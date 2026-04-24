import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

/**
 * Devuelve el catálogo jerárquico segmentado exclusivamente 
 * al ámbito visible del usuario (RLS)
 */
export async function getCategories(companyId?: string) {
  const user = await requireAuth()
  
  if (user.role !== 'SUPER_ADMIN') {
    return prisma.category.findMany({
      where: { companyId: user.companyId as string },
      include: { 
        subcategories: true,
        company: true
      },
      orderBy: { name: 'asc' }
    })
  }

  return prisma.category.findMany({
    where: companyId ? { companyId } : {},
    include: { 
      subcategories: true,
      company: true
    },
    orderBy: { name: 'asc' }
  })
}
