import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

/**
 * Escaner perimetral del sistema forense y auditoría.
 * Soporta paginacion pura y filtros relacionales integrados con RLS.
 */
export async function getAuditTrail(searchParams: { page?: string, actionFilter?: string, companyId?: string }) {
   const user = await requireAuth()
   
   const currentPage = Math.max(1, Number(searchParams.page) || 1)
   const pageSize = 12 
   const skipChunks = (currentPage - 1) * pageSize

   let whereClause: any = {}
   
   if (user.role !== 'SUPER_ADMIN') {
      whereClause = { ...enforceCompanyScope(user) }
   } else if (searchParams.companyId) {
      whereClause = { companyId: searchParams.companyId }
   }
   
   if (searchParams.actionFilter) {
       whereClause.action = searchParams.actionFilter
   }

   const [logs, totalRows] = await Promise.all([
      prisma.auditLog.findMany({
         where: whereClause,
         include: { 
             user: { select: { name: true, role: true, email: true } },
             company: { select: { name: true } }
         },
         orderBy: { createdAt: 'desc' },
         skip: skipChunks,
         take: pageSize
      }),
      prisma.auditLog.count({ where: whereClause })
   ])

   return { 
       logs, 
       metadata: { 
           totalRecords: totalRows, 
           totalPages: Math.ceil(totalRows / pageSize), 
           page: currentPage,
           hasNextPage: (skipChunks + pageSize) < totalRows,
           hasPreviousPage: currentPage > 1
       } 
   }
}
