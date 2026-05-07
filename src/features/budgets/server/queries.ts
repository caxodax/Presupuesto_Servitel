import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"

export async function getBudgets(companyId?: string, branchId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  let query = supabase
    .from('Budget')
    .select(`
      *,
      branch:Branch(*, company:Company(*)),
      allocations:BudgetAllocation(
        *,
        category:Category(name),
        subcategory:Subcategory(name),
        account:AccountingAccount(name),
        companyAccount:CompanyAccount(globalAccount:GlobalAccount(name, code, type))
      ),
      company:Company!inner(groupId)
    `, { count: 'exact' })
    .order('initialDate', { ascending: false })

  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
    query = query.eq('companyId', user.companyId)
  } else if (companyId) {
    query = query.eq('companyId', Number(companyId))
  }

  if (branchId) {
    query = query.eq('branchId', Number(branchId))
  }

  if (groupId) {
    query = query.eq('company.groupId', Number(groupId))
  }

  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  if (page === undefined) {
    const { data } = await query
    return {
        items: data || [],
        total: data?.length || 0,
        pageCount: 1
    }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener presupuestos: ${error.message}`)
  }

  const total = count || 0

  return {
    items: items || [],
    total: total,
    pageCount: Math.ceil(total / limit)
  }
}

export async function getBudgetDetails(budgetId: number) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  let query = supabase
    .from('Budget')
    .select(`
      *,
      branch:Branch(*),
      allocations:BudgetAllocation(
        *,
        category:Category(name),
        subcategory:Subcategory(name),
        account:AccountingAccount(name),
        companyAccount:CompanyAccount(globalAccount:GlobalAccount(name, code, type)),
        adjustments:BudgetAdjustment(*)
      )
    `)
    .eq('id', budgetId)

  if (filter.companyId) query = query.eq('companyId', filter.companyId)
  if (branchScope.branchId) query = query.eq('branchId', branchScope.branchId)

  const { data: budget, error } = await query.single()

  if (error || !budget) throw new Error("Presupuesto no encontrado o error de acceso.")

  // Ordenamos los ajustes manualmente
  budget.allocations.forEach((alloc: any) => {
    if (alloc.adjustments) {
      alloc.adjustments.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  })

  let totalAllocatedRaw = 0
  let totalConsumedUSD = 0
  let totalConsumedVES = 0

  budget.allocations.forEach((alloc: any) => {
    totalAllocatedRaw += Number(alloc.amountUSD)
    totalConsumedUSD += Number(alloc.consumedUSD)
    totalConsumedVES += Number(alloc.consumedVES)
  })

  return {
    budget,
    stats: {
      originalHardLimit: Number(budget.amountLimitUSD),
      netAllocated: totalAllocatedRaw,
      totalConsumedUSD,
      totalConsumedVES,
      remainingAllocated: totalAllocatedRaw - totalConsumedUSD,
      availableToAllocate: Number(budget.amountLimitUSD) - totalAllocatedRaw,
    },
  }
}

