import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Devuelve el catálogo jerárquico segmentado exclusivamente 
 * al ámbito visible del usuario (RLS)
 */
export async function getCategories(options: { 
  query?: string, 
  page?: number, 
  limit?: number, 
  type?: 'EXPENSE' | 'INCOME', 
  companyId?: number 
} = {}) {
  const { query: queryParam, page, limit = 10, type, companyId } = options
  const user = await requireAuth()
  const supabase = await createClient()
  
  let query = supabase
    .from('Category')
    .select(`
      *,
      subcategories:Subcategory(*)
    `, { count: 'exact' })
    .order('isActive', { ascending: false })
    .order('name', { ascending: true })

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (type) {
    query = query.eq('type', type)
  }

  if (companyId) {
    query = query.or(`companyId.eq.${companyId},companyId.is.null`)
  }

  if (page === undefined) {
    const { data } = await query.limit(500)
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

