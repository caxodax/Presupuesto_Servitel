import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Devuelve el catálogo jerárquico segmentado exclusivamente 
 * al ámbito visible del usuario (RLS)
 */
export async function getCategories(companyId?: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase
    .from('Category')
    .select(`
      *,
      subcategories:Subcategory(*),
      Company(id, name)
    `)
    .order('name', { ascending: true })

  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('companyId', user.companyId)
  } else if (companyId) {
    query = query.eq('companyId', companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener categorías: ${error.message}`)
  }

  return data
}
