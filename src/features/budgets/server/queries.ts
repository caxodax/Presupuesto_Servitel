import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { measureAsync } from "@/lib/perf"

export async function getBudgets(companyId?: string, branchId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  return measureAsync("getBudgets", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const targetCompanyId = user.role !== 'SUPER_ADMIN' && user.companyId ? user.companyId : (companyId ? Number(companyId) : null)
    const targetGroupId = groupId ? Number(groupId) : null
    const targetBranchId = branchId ? Number(branchId) : null

    const actualPage = page === undefined ? 1 : page
    const actualLimit = page === undefined ? 1000 : limit
    const from = (actualPage - 1) * actualLimit

    const { data: items, error } = await (supabase.rpc as any)('rpc_get_budget_list', {
      p_company_id: targetCompanyId,
      p_group_id: targetGroupId,
      p_search: queryParam || null,
      p_limit: actualLimit,
      p_offset: from,
      p_branch_id: targetBranchId
    })

    const mapBudget = (b: any) => ({
      ...b,
      branch: {
        name: b.branchName,
        company: {
          name: b.companyName
        }
      }
    })

    if (error) {
      throw new Error(`Error al obtener presupuestos: ${error.message}`)
    }

    const formattedItems = (items || []).map(mapBudget)
    const count = items && items.length > 0 ? Number(items[0].total_count) : 0

    if (page === undefined) {
      return {
          items: formattedItems,
          total: formattedItems.length,
          pageCount: 1
      }
    }

    return {
      items: formattedItems,
      total: count,
      pageCount: Math.ceil(count / limit)
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
