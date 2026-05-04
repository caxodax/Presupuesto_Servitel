import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

/**
 * Escaner perimetral del sistema forense y auditoría.
 */
export async function getAuditTrail(searchParams: { page?: string, actionFilter?: string, companyId?: string }) {
   const user = await requireAuth()
   const supabase = createClient()
   
   const currentPage = Math.max(1, Number(searchParams.page) || 1)
   const pageSize = 12 
   const from = (currentPage - 1) * pageSize
   const to = from + pageSize - 1

   let query = supabase
     .from('AuditLog')
     .select(`
       *,
       user:User(name, role, email),
       company:Company(name)
     `, { count: 'exact' })

   if (user.role !== 'SUPER_ADMIN' && user.companyId) {
     query = query.eq('companyId', user.companyId)
   } else if (searchParams.companyId) {
     query = query.eq('companyId', Number(searchParams.companyId))
   }
   
   if (searchParams.actionFilter) {
     query = query.eq('action', searchParams.actionFilter)
   }

   const { data: logs, count: totalRows, error } = await query
     .order('createdAt', { ascending: false })
     .range(from, to)

   if (error) throw new Error(`Error auditoría: ${error.message}`)

   const totalCount = totalRows || 0

   return { 
       logs: logs || [], 
       metadata: { 
           totalRecords: totalCount, 
           totalPages: Math.ceil(totalCount / pageSize), 
           page: currentPage,
           hasNextPage: (from + pageSize) < totalCount,
           hasPreviousPage: currentPage > 1
       } 
   }
}
