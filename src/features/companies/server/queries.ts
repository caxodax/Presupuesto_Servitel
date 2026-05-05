import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Trae empresas puras.
 */
export async function getCompanies(queryParam?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  let query = supabase.from('Company').select('*, businessGroup:BusinessGroup(name)', { count: 'exact' })
  
  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
    query = query.eq('id', user.companyId)
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (page === undefined) {
    const { data } = await query.order('createdAt', { ascending: false }).limit(500)
    return {
      items: data || [],
      total: data?.length || 0,
      pageCount: 1
    }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count } = await query
    .order('createdAt', { ascending: false })
    .range(from, to)
  
  const total = count || 0

  return {
    items: items || [],
    total: total,
    pageCount: Math.ceil(total / limit)
  }
}

/**
 * Trae todas las empresas sin paginación.
 */
export async function getAllCompanies() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  let query = supabase.from('Company').select('*, businessGroup:BusinessGroup(name)')
  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
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
  const supabase = await createClient()
  
  let query = supabase.from('Branch').select('id, name, companyId, isActive, createdAt, company:Company(id, name, groupId)', { count: 'exact' })
  
  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
    query = query.eq('companyId', user.companyId)
  } else if (companyId) {
    query = query.eq('companyId', companyId)
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (page === undefined) {
    const { data } = await query.order('createdAt', { ascending: false }).limit(500)
    return {
      items: data || [],
      total: data?.length || 0,
      pageCount: 1
    }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count } = await query
    .order('createdAt', { ascending: false })
    .range(from, to)
  
  const total = count || 0

  return {
    items: items || [],
    total: total,
    pageCount: Math.ceil(total / limit)
  }
}

