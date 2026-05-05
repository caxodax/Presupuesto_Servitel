import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches, getCachedBusinessGroups } from "@/lib/cache"

export async function getDashboardKpis(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  let query = supabase
    .from('Budget')
    .select(`
      amountLimitUSD,
      company:Company!inner(groupId),
      allocations:BudgetAllocation(amountUSD, consumedUSD)
    `)

  if (filter.companyId) query = query.eq('companyId', filter.companyId)
  if (searchParams.companyId) query = query.eq('companyId', searchParams.companyId)
  
  if (branchScope.branchId) query = query.eq('branchId', branchScope.branchId)
  else if (searchParams.branchId) query = query.eq('branchId', searchParams.branchId)
  
  if (searchParams.budgetId) query = query.eq('id', searchParams.budgetId)
  
  if (searchParams.groupId) {
      query = query.eq('company.groupId', searchParams.groupId)
  }

  const { data: budgets, error } = await query

  if (error) throw new Error(`Error KPIs: ${error.message}`)

  // 2. Obtener Ingresos
  let incomeQuery = supabase.from('Income').select('amountUSD, company:Company!inner(groupId)')
  if (filter.companyId) incomeQuery = incomeQuery.eq('companyId', filter.companyId)
  if (searchParams.companyId) incomeQuery = incomeQuery.eq('companyId', searchParams.companyId)
  
  if (branchScope.branchId) incomeQuery = incomeQuery.eq('branchId', branchScope.branchId)
  else if (searchParams.branchId) incomeQuery = incomeQuery.eq('branchId', searchParams.branchId)
  
  if (searchParams.groupId) {
      incomeQuery = incomeQuery.eq('company.groupId', searchParams.groupId)
  }
  
  const { data: incomesData } = await incomeQuery

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

  const totalIncome = incomesData?.reduce((acc, curr) => acc + Number(curr.amountUSD), 0) || 0
  const overbudgetAmount = totalConsumed > totalLimit ? totalConsumed - totalLimit : 0
  const executionPercentage = totalLimit > 0 ? (totalConsumed / totalLimit) * 100 : 0
  const netBalance = totalIncome - totalConsumed

  return {
    totalLimit,
    totalAllocated: totalConsolidatedAllocations,
    totalConsumed,
    totalIncome,
    netBalance,
    availableCapacity: totalLimit - totalConsumed,
    overbudgetAmount,
    executionPercentage,
  }
}

export async function getExecutiveAnalytics(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)
  
  // 1. Ranking de Sucursales
  let branchQuery = supabase.from('Branch').select(`
    id, 
    name, 
    companyId, 
    company:Company!inner(groupId),
    budgets:Budget(
      id,
      allocations:BudgetAllocation(consumedUSD)
    )
  `)
  if (filter.companyId) branchQuery = branchQuery.eq('companyId', filter.companyId)
  if (searchParams.companyId) branchQuery = branchQuery.eq('companyId', searchParams.companyId)

  if (branchScope.branchId) branchQuery = branchQuery.eq('id', branchScope.branchId)
  else if (searchParams.branchId) branchQuery = branchQuery.eq('id', searchParams.branchId)

  if (searchParams.groupId) {
      branchQuery = branchQuery.eq('company.groupId', searchParams.groupId)
  }

  const { data: branchesData } = await branchQuery

  const branchRankings = (branchesData || [])
    .map((b: any) => {
      let consumed = 0
      b.budgets?.forEach((bud: any) => {
        if (searchParams.budgetId && bud.id !== Number(searchParams.budgetId)) return
        bud.allocations?.forEach((a: any) => (consumed += Number(a.consumedUSD)))
      })
      return { name: b.name, consumed }
    })
    .filter(b => b.consumed > 0 || searchParams.branchId)
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  // 2. Rankings por Clasificación
  let allocQuery = supabase
    .from('BudgetAllocation')
    .select(`
      consumedUSD,
      category:Category(id, name),
      account:AccountingAccount(id, code, name),
      budget:Budget!inner(id, company:Company!inner(groupId))
    `)
  
  if (filter.companyId) allocQuery = allocQuery.eq('budget.companyId', filter.companyId)
  if (searchParams.companyId) allocQuery = allocQuery.eq('budget.companyId', searchParams.companyId)
  
  if (branchScope.branchId) allocQuery = allocQuery.eq('budget.branchId', branchScope.branchId)
  else if (searchParams.branchId) allocQuery = allocQuery.eq('budget.branchId', searchParams.branchId)
  
  if (searchParams.budgetId) allocQuery = allocQuery.eq('budget.id', searchParams.budgetId)

  if (searchParams.groupId) {
      allocQuery = allocQuery.eq('budget.company.groupId', searchParams.groupId)
  }

  const { data: allocations } = await allocQuery

  const categoryMap = new Map<number, { name: string, consumed: number }>()
  const accountMap = new Map<number, { name: string, code: string, consumed: number }>()

  allocations?.forEach((a: any) => {
    const consumed = Number(a.consumedUSD)
    
    if (a.category) {
      const catId = a.category.id
      const prev = categoryMap.get(catId) || { name: a.category.name, consumed: 0 }
      categoryMap.set(catId, { ...prev, consumed: prev.consumed + consumed })
    }

    if (a.account) {
      const accId = a.account.id
      const prev = accountMap.get(accId) || { name: a.account.name, code: a.account.code, consumed: 0 }
      accountMap.set(accId, { ...prev, consumed: prev.consumed + consumed })
    }
  })

  const categoryRankings = Array.from(categoryMap.values())
    .filter(c => c.consumed > 0)
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  const accountRankings = Array.from(accountMap.values())
    .filter(c => c.consumed > 0)
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  return {
    branchRankings,
    categoryRankings,
    accountRankings
  }
}

export async function getRecentActivity(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  let query = supabase
    .from('Invoice')
    .select(`
      id,
      number,
      supplierName,
      amountUSD,
      date,
      status,
      companyId,
      company:Company!inner(name, groupId),
      registeredBy:User(name),
      account:AccountingAccount(code, name),
      allocation:BudgetAllocation(
        category:Category(name),
        budget:Budget(
          id,
          branchId,
          branch:Branch(id, name)
        )
      )
    `)

  if (filter.companyId) query = query.eq('companyId', filter.companyId)
  if (searchParams.companyId) query = query.eq('companyId', searchParams.companyId)

  if (searchParams.groupId) {
    query = query.eq('company.groupId', searchParams.groupId)
  }

  const { data } = await query
    .order('createdAt', { ascending: false })
    .limit(6)

  return data || []
}

export async function getFilterOptions() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const [companiesResult, branchesResult, budgetsResult, groups] = await Promise.all([
    getCachedCompanies(),
    getCachedBranches(),
    supabase.from('Budget').select('id, name, branchId, companyId').order('initialDate', { ascending: false }).limit(200).then(res => res.data || []),
    getCachedBusinessGroups(true)
  ])

  let companies = companiesResult || []
  let branches = branchesResult?.items || []
  let budgets = budgetsResult || []

  if (filter.companyId) {
      companies = companies.filter(c => c.id === filter.companyId)
      branches = branches.filter(b => b.companyId === filter.companyId)
      budgets = budgets.filter(b => b.companyId === filter.companyId)
  }

  if (branchScope.branchId) {
      branches = branches.filter(b => b.id === branchScope.branchId)
      budgets = budgets.filter(b => b.branchId === branchScope.branchId)
  }

  return { companies, branches, budgets, groups }
}
