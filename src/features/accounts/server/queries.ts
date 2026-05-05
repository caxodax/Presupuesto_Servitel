"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

/**
 * Obtiene el Plan de Cuentas filtrado por empresa y criterios de búsqueda.
 */
export async function getAccounts(options: { 
  query?: string, 
  page?: number, 
  limit?: number, 
  type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'COST' | 'EXPENSE',
  isBudgetable?: boolean,
  isExecutable?: boolean,
  companyId?: number 
} = {}) {
  const { query: queryParam, page, limit = 50, type, isBudgetable, isExecutable, companyId } = options
  const user = await requireAuth()
  const supabase = await createClient()
  
  // Resolvemos el ID de la empresa si no se pasa explícitamente y no es SUPER_ADMIN
  const targetCompanyId = companyId || (user.role !== 'SUPER_ADMIN' ? user.companyId : null)

  let query = supabase
    .from('AccountingAccount')
    .select(`*`, { count: 'exact' })
    .order('code', { ascending: true })

  if (targetCompanyId) {
    query = query.eq('companyId', targetCompanyId)
  }

  if (queryParam) {
    query = query.or(`name.ilike.%${queryParam}%,code.ilike.%${queryParam}%`)
  }

  if (type) {
    query = query.eq('type', type)
  }

  if (isBudgetable !== undefined) {
    query = query.eq('isBudgetable', isBudgetable)
  }

  if (isExecutable !== undefined) {
    query = query.eq('isExecutable', isExecutable)
  }

  if (page === undefined) {
    const { data, error } = await query.limit(1000)
    if (error) throw new Error(`Error al obtener cuentas: ${error.message}`)
    return data || []
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener cuentas: ${error.message}`)
  }

  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}

/**
 * Obtiene una cuenta específica por ID.
 */
export async function getAccountById(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('AccountingAccount')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Error al obtener cuenta: ${error.message}`)
  return data
}
