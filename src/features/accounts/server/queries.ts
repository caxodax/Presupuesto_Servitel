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
  onSelect?: (accountId: number | null) => void,
  type?: string | string[],
  isBudgetable?: boolean,
  isExecutable?: boolean,
  companyId?: number,
  includeGlobal?: boolean
} = {}) {
  const { query: queryParam, page, limit = 50, type, isBudgetable, isExecutable, companyId, includeGlobal } = options
  const user = await requireAuth()
  const supabase = await createClient()
  
  // Resolvemos el ID de la empresa si no se pasa explícitamente y no es SUPER_ADMIN
  const targetCompanyId = companyId || (user.role !== 'SUPER_ADMIN' ? user.companyId : null)

  // Si se pide el catálogo global (Super Admin), consultamos GlobalAccount directamente
  if (includeGlobal && user.role === 'SUPER_ADMIN') {
    let qGlobal = supabase.from('GlobalAccount').select('*', { count: 'exact' })
    if (queryParam) qGlobal = qGlobal.or(`name.ilike.%${queryParam}%,code.ilike.%${queryParam}%`)
    if (type) {
        if (Array.isArray(type)) {
            qGlobal = qGlobal.in('type', type)
        } else {
            qGlobal = qGlobal.eq('type', type)
        }
    }
    if (isBudgetable !== undefined) qGlobal = qGlobal.eq('isBudgetable', isBudgetable)
    if (isExecutable !== undefined) qGlobal = qGlobal.eq('isExecutable', isExecutable)
    
    const { data: gData, error: gError } = await qGlobal.limit(limit)
    if (gError) throw gError
    return (gData || []).map(g => ({ ...g, isGlobal: true }))
  }

  if (!targetCompanyId) return []

  let queryBuilder = supabase
    .from('CompanyAccount')
    .select(`
        id,
        isActive,
        globalAccountId,
        globalAccount:GlobalAccount!inner(*)
    `, { count: 'exact' })
    .eq('companyId', targetCompanyId)
    .eq('isActive', true)

  if (queryParam) {
    queryBuilder = queryBuilder.or(`name.ilike.%${queryParam}%,code.ilike.%${queryParam}%`, { foreignTable: 'GlobalAccount' })
  }

  if (type) {
    if (Array.isArray(type)) {
        queryBuilder = queryBuilder.in('globalAccount.type', type)
    } else {
        queryBuilder = queryBuilder.eq('globalAccount.type', type)
    }
  }

  if (isBudgetable !== undefined) {
    // Aquí podrías considerar overrides, pero por ahora usamos el global
    queryBuilder = queryBuilder.eq('globalAccount.isBudgetable', isBudgetable)
  }

  if (isExecutable !== undefined) {
    queryBuilder = queryBuilder.eq('globalAccount.isExecutable', isExecutable)
  }

  if (page === undefined) {
    const { data, error } = await queryBuilder.limit(1000)
    if (error) throw new Error(`Error al obtener cuentas: ${error.message}`)
    
    // Mapear al formato plano que espera el UI antiguo si es posible
    return (data || []).map((ca: any) => ({
        id: ca.id,
        code: ca.globalAccount.code,
        name: ca.globalAccount.name,
        type: ca.globalAccount.type,
        isBudgetable: ca.globalAccount.isBudgetable,
        isExecutable: ca.globalAccount.isExecutable
    }))
  }


  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await queryBuilder.range(from, to)

  if (error) {
    throw new Error(`Error al obtener cuentas: ${error.message}`)
  }

  const mappedItems = (items || []).map((ca: any) => ({
    id: ca.id,
    code: ca.globalAccount.code,
    name: ca.globalAccount.name,
    type: ca.globalAccount.type,
    isBudgetable: ca.globalAccount.isBudgetable,
    isExecutable: ca.globalAccount.isExecutable
  }))

  return {
    items: mappedItems,
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
    .from('CompanyAccount')
    .select(`
        *,
        globalAccount:GlobalAccount(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Error al obtener cuenta: ${error.message}`)
  
  return {
    ...data,
    code: (data as any).globalAccount.code,
    name: (data as any).globalAccount.name,
    type: (data as any).globalAccount.type
  }
}

