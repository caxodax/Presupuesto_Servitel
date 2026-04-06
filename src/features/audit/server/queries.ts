import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

/**
 * Escaner perimetral del sistema forense y auditoría.
 * Soporta paginacion pura y filtros relacionales integrados con RLS.
 */
export async function getAuditTrail(searchParams: { page?: string, actionFilter?: string }) {
   const user = await requireAuth()
   const filter = enforceCompanyScope(user)

   const currentPage = Math.max(1, Number(searchParams.page) || 1)
   const pageSize = 12 // Capacidad de filas requerida visualmente
   const skipChunks = (currentPage - 1) * pageSize

   const whereClause: any = { ...filter }
   
   if (searchParams.actionFilter) {
       whereClause.action = searchParams.actionFilter
   }

   const [logs, totalRows] = await Promise.all([
      prisma.auditLog.findMany({
         where: whereClause,
         include: { 
             user: { select: { name: true, role: true, email: true } }
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
