import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { measureAsync } from "@/lib/perf"

export async function getBudgets(companyId?: string, branchId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  return measureAsync("getBudgets", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    let query = supabase
      .from('budget_list_view')
      .select('*', { count: 'planned' })
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
      query = query.eq('companyGroupId', Number(groupId))
    }

    if (queryParam) {
      query = query.ilike('name', `%${queryParam}%`)
    }

    const mapBudget = (b: any) => ({
      ...b,
      branch: {
        name: b.branchName,
        company: {
          name: b.companyName
        }
      }
    })

    if (page === undefined) {
      const { data } = await query
      const formatted = (data || []).map(mapBudget)
      return {
          items: formatted,
          total: formatted.length,
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
    const formattedItems = (items || []).map(mapBudget)

    return {
      items: formattedItems,
      total: total,
      pageCount: Math.ceil(total / limit)
    }
  })
}

export async function getBudgetDetails(budgetId: number) {
  return measureAsync("getBudgetDetails", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const filter = enforceCompanyScope(user)
    const branchScope = getBranchIsolation(user)

    let query = (supabase
      .from('Budget')
      .select(`
        *,
        branch:Branch(*, company:Company(name)),
        allocations:BudgetAllocation(
          *,
          category:Category(name),
          subcategory:Subcategory(name),
          companyAccount:CompanyAccount(globalAccount:GlobalAccount(name, code, type))
        )
      `) as any)
      .eq('id', budgetId)

    if (filter.companyId) query = query.eq('companyId', filter.companyId)
    if (branchScope.branchId) query = query.eq('branchId', branchScope.branchId)

    const { data, error } = await query.single()

    if (error || !data) throw new Error("Presupuesto no encontrado o error de acceso.")
    const budget = data as any

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
  })
}

export async function getBudgetRecentAdjustments(budgetId: number) {
  return measureAsync("getBudgetRecentAdjustments", async () => {
    const user = await requireAuth()
    const supabase = await createClient()

    const filter = enforceCompanyScope(user)

    let query = (supabase
      .from('BudgetAdjustment')
      .select(`
        id,
        amountUSD,
        amountVES,
        reason,
        createdAt,
        recordedBy:User(name),
        allocation:BudgetAllocation!inner(
          budgetId,
          companyAccount:CompanyAccount!inner(
            companyId,
            globalAccount:GlobalAccount(name, code)
          )
        )
      `) as any)
      .eq('allocation.budgetId', budgetId)

    if (filter.companyId) {
      query = query.eq('allocation.companyAccount.companyId', filter.companyId)
    }

    const { data, error } = await query
      .order('createdAt', { ascending: false })
      .limit(5)

    if (error) {
      throw new Error(`Error al obtener ajustes recientes: ${error.message}`)
    }

    return (data || []).map((adj: any) => ({
      ...adj,
      accountName: adj.allocation?.companyAccount?.globalAccount?.name || 'S/A',
      categoryName: adj.allocation?.companyAccount?.globalAccount?.name || 'S/A'
    }))
  })
}

export async function getAvailableAllocationsForSelect(companyId?: string) {
  return measureAsync("getAvailableAllocationsForSelect", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    let query = supabase
      .from('Budget')
      .select(`
        id,
        name,
        branch:Branch(
          id,
          name,
          company:Company(id, name)
        ),
        allocations:BudgetAllocation(
          id,
          category:Category(id, name),
          subcategory:Subcategory(id, name),
          companyAccountId
        )
      `)
      .eq('status', 'ACTIVE')

    if (user.role !== 'SUPER_ADMIN' && user.companyId) {
      query = query.eq('companyId', user.companyId)
    } else if (companyId) {
      query = query.eq('companyId', Number(companyId))
    }

    const { data: budgetsList, error } = await query

    if (error) {
      throw new Error(`Error al obtener alocaciones: ${error.message}`)
    }

    return (budgetsList || []).flatMap((b: any) => 
        (b.allocations || []).map((a: any) => ({ 
            id: a.id, 
            companyId: b.branch?.company?.id,
            label: `${user.role === "SUPER_ADMIN" ? `[${b.branch?.company?.name}] ` : ''}${b.name} (${b.branch?.name}) - ${a.category?.name} ${a.subcategory ? `> ${a.subcategory?.name}` : ''}`,
            budgetId: b.id,
            companyAccountId: a.companyAccountId
        }))
    )
  })
}
