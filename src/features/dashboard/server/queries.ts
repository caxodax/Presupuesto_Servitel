import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"

export async function getDashboardKpis(searchParams: { companyId?: number; branchId?: number; budgetId?: number }) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  let query = supabase
    .from('Budget')
    .select(`
      amountLimitUSD,
      allocations:BudgetAllocation(amountUSD, consumedUSD)
    `)

  if (filter.companyId) query = query.eq('companyId', filter.companyId)
  if (searchParams.companyId) query = query.eq('companyId', searchParams.companyId)
  
  if (branchScope.branchId) query = query.eq('branchId', branchScope.branchId)
  else if (searchParams.branchId) query = query.eq('branchId', searchParams.branchId)
  
  if (searchParams.budgetId) query = query.eq('id', searchParams.budgetId)

  const { data: budgets, error } = await query

  if (error) throw new Error(`Error KPIs: ${error.message}`)

  let totalLimit = 0
  let totalConsolidatedAllocations = 0
  let totalConsumed = 0

  budgets?.forEach((b: any) => {
    totalLimit += Number(b.amountLimitUSD)
    b.allocations?.forEach((a: any) => {
      totalConsolidatedAllocations += Number(a.amountUSD)
      totalConsumed += Number(a.consumedUSD)
    })
  })

  const overbudgetAmount = totalConsumed > totalLimit ? totalConsumed - totalLimit : 0
  const executionPercentage = totalLimit > 0 ? (totalConsumed / totalLimit) * 100 : 0

  return {
    totalLimit,
    totalAllocated: totalConsolidatedAllocations,
    totalConsumed,
    availableCapacity: totalLimit - totalConsumed,
    overbudgetAmount,
    executionPercentage,
  }
}

export async function getExecutiveAnalytics(searchParams: { companyId?: number; branchId?: number; budgetId?: number }) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)
  
  // 1. Ranking de Sucursales
  let branchQuery = supabase
    .from('Branch')
    .select(`
      id,
      name,
      budgets:Budget(
        id,
        allocations:BudgetAllocation(consumedUSD)
      )
    `)

  if (filter.companyId) branchQuery = branchQuery.eq('companyId', filter.companyId)
  if (searchParams.companyId) branchQuery = branchQuery.eq('companyId', searchParams.companyId)
  
  if (branchScope.branchId) branchQuery = branchQuery.eq('id', branchScope.branchId)
  else if (searchParams.branchId) branchQuery = branchQuery.eq('id', searchParams.branchId)

  const { data: branchesData, error: bError } = await branchQuery

  const branchRankings = (branchesData || [])
    .map((b: any) => {
      let consumed = 0
      b.budgets?.forEach((bud: any) => {
        // Si hay un filtro de presupuesto específico, solo sumamos ese
        if (searchParams.budgetId && bud.id !== Number(searchParams.budgetId)) return
        bud.allocations?.forEach((a: any) => (consumed += Number(a.consumedUSD)))
      })
      return { name: b.name, consumed }
    })
    .filter(b => b.consumed > 0 || searchParams.branchId)
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  // 2. Ranking de Categorías
  let allocQuery = supabase
    .from('BudgetAllocation')
    .select(`
      consumedUSD,
      category:Category(id, name),
      budget:Budget!inner(id, companyId, branchId)
    `)

  if (filter.companyId) allocQuery = allocQuery.eq('budget.companyId', filter.companyId)
  if (searchParams.companyId) allocQuery = allocQuery.eq('budget.companyId', searchParams.companyId)
  
  if (branchScope.branchId) allocQuery = allocQuery.eq('budget.branchId', branchScope.branchId)
  else if (searchParams.branchId) allocQuery = allocQuery.eq('budget.branchId', searchParams.branchId)
  
  if (searchParams.budgetId) allocQuery = allocQuery.eq('budget.id', searchParams.budgetId)

  const { data: allocations, error: aError } = await allocQuery

  const categoryMap = new Map<number, { name: string, consumed: number }>()
  allocations?.forEach((a: any) => {
    const catId = a.category.id
    const prev = categoryMap.get(catId) || { name: a.category.name, consumed: 0 }
    categoryMap.set(catId, { ...prev, consumed: prev.consumed + Number(a.consumedUSD) })
  })

  const categoryRankings = Array.from(categoryMap.values())
    .filter(c => c.consumed > 0)
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  return {
    branchRankings,
    categoryRankings
  }
}

export async function getRecentActivity(searchParams: { companyId?: number; branchId?: number; budgetId?: number }) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  let query = supabase
    .from('Invoice')
    .select(`
      *,
      company:Company(name),
      allocation:BudgetAllocation(
        id,
        category:Category(name),
        budget:Budget(
          id,
          branch:Branch(name)
        )
      )
    `)

  if (filter.companyId) query = query.eq('companyId', filter.companyId)
  if (searchParams.companyId) query = query.eq('companyId', searchParams.companyId)
  
  // Para filtros anidados profundos en Supabase usamos dot notation si la relación está cargada (inner join si es necesario)
  // Pero aquí Invoice tiene companyId directo. Para branchId necesitamos filtrar por la relación.
  // Usamos inner join para filtrar por campos de tablas relacionadas
  if (branchScope.branchId || searchParams.branchId || searchParams.budgetId) {
      // Re-estructuramos el select para asegurar inner joins si queremos filtrar por ellos
      // Supabase permite filtrar relaciones anidadas así: from('Table').select('..., Relation!inner(*)').eq('Relation.field', value)
  }

  const { data, error } = await query
    .order('createdAt', { ascending: false })
    .limit(6)

  // Filtrado post-query para casos complejos de relaciones anidadas si no queremos usar syntax de inner joins complejos
  let filteredData = data || []
  if (branchScope.branchId || searchParams.branchId) {
      const bid = branchScope.branchId || searchParams.branchId
      filteredData = filteredData.filter((inv: any) => inv.allocation?.budget?.branch?.id === bid)
  }
  if (searchParams.budgetId) {
      filteredData = filteredData.filter((inv: any) => inv.allocation?.budget?.id === Number(searchParams.budgetId))
  }

  return filteredData
}

export async function getFilterOptions() {
  const user = await requireAuth()
  const supabase = createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const [resComp, resBranch, resBudget] = await Promise.all([
    supabase.from('Company').select('id, name').order('name'),
    supabase.from('Branch').select('id, name, companyId').order('name'),
    supabase.from('Budget').select('id, name, branchId, companyId').order('initialDate', { ascending: false })
  ])

  let companies = resComp.data || []
  let branches = resBranch.data || []
  let budgets = resBudget.data || []

  if (filter.companyId) {
      companies = companies.filter(c => c.id === filter.companyId)
      branches = branches.filter(b => b.companyId === filter.companyId)
      budgets = budgets.filter(b => b.companyId === filter.companyId)
  }

  if (branchScope.branchId) {
      branches = branches.filter(b => b.id === branchScope.branchId)
      budgets = budgets.filter(b => b.branchId === branchScope.branchId)
  }

  return { companies, branches, budgets }
}
