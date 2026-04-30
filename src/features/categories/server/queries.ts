import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Devuelve el catálogo jerárquico segmentado exclusivamente 
 * al ámbito visible del usuario (RLS)
 */
export async function getCategories(companyId?: string, queryParam?: string, page?: number, limit: number = 10, type?: 'EXPENSE' | 'INCOME') {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase
    .from('Category')
    .select(`
      *,
      subcategories:Subcategory(*),
      Company(id, name)
    `, { count: 'exact' })
    .order('isActive', { ascending: false })
    .order('name', { ascending: true })

  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('companyId', user.companyId)
  } else if (companyId) {
    query = query.eq('companyId', companyId)
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (type) {
    query = query.eq('type', type)
  }

  if (page === undefined) {
    const { data } = await query
    return data || []
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener categorías: ${error.message}`)
  }

  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}
