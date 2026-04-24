import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Trae empresas puras.
 */
export async function getCompanies(queryParam?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase.from('Company').select('*', { count: 'exact' })
  
  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('id', user.companyId)
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (page === undefined) {
    const { data } = await query.order('createdAt', { ascending: false })
    return data || []
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count } = await query
    .order('createdAt', { ascending: false })
    .range(from, to)
  
  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}

/**
 * Trae todas las empresas sin paginación.
 */
export async function getAllCompanies() {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase.from('Company').select('*')
  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('id', user.companyId)
  }
  
  const { data } = await query.order('name', { ascending: true })
  return data || []
}

/**
 * Trae sucursales.
 */
export async function getBranches(companyId?: number, queryParam?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase.from('Branch').select('*, company:Company(*)', { count: 'exact' })
  
  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('companyId', user.companyId)
  } else if (companyId) {
    query = query.eq('companyId', companyId)
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (page === undefined) {
    const { data } = await query.order('createdAt', { ascending: false })
    return data || []
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count } = await query
    .order('createdAt', { ascending: false })
    .range(from, to)
  
  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}
