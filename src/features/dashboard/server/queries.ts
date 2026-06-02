import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches, getCachedBusinessGroups } from "@/lib/cache"
import { measureAsync } from "@/lib/perf"
import { unstable_cache } from "next/cache"

export async function getDashboardKpis(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const companyId = filter.companyId || searchParams.companyId || null
  const branchId = branchScope.branchId || searchParams.branchId || null
  const budgetId = searchParams.budgetId || null
  const groupId = searchParams.groupId || null

  const userCompanyId = user.companyId
  const userRole = user.role

  const cacheKey = [
    "dashboard-kpis",
    String(userCompanyId || "all"),
    userRole,
    String(companyId || ""),
    String(branchId || ""),
    String(budgetId || ""),
    String(groupId || "")
  ]

  return unstable_cache(
    async () => {
      return measureAsync("getDashboardKpis", async () => {
        const supabase = createServiceRoleClient()
        
        const { data, error } = await (supabase.rpc as any)('rpc_dashboard_kpis', {
          p_company_id: companyId,
          p_branch_id: branchId,
          p_budget_id: budgetId,
          p_group_id: groupId
        })

        if (error) throw new Error(`Error KPIs: ${error.message}`)

        const kpi = (data as any)?.[0] || {
          total_limit: 0,
          total_allocated: 0,
          total_consumed: 0,
          total_income: 0,
          net_balance: 0,
          available_capacity: 0,
          overbudget_amount: 0,
          execution_percentage: 0
        }

        return {
          totalLimit: Number(kpi.total_limit),
          totalAllocated: Number(kpi.total_allocated),
          totalConsumed: Number(kpi.total_consumed),
          totalIncome: Number(kpi.total_income),
          netBalance: Number(kpi.net_balance),
          availableCapacity: Number(kpi.available_capacity),
          overbudgetAmount: Number(kpi.overbudget_amount),
          executionPercentage: Number(kpi.execution_percentage),
        }
      })
    },
    cacheKey,
    { revalidate: 30, tags: ["dashboard"] }
  )()
}

export async function getExecutiveAnalytics(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)
  
  const companyId = filter.companyId || searchParams.companyId || null
  const branchId = branchScope.branchId || searchParams.branchId || null
  const budgetId = searchParams.budgetId || null
  const groupId = searchParams.groupId || null

  const userCompanyId = user.companyId
  const userRole = user.role

  const cacheKey = [
    "dashboard-executive-analytics",
    String(userCompanyId || "all"),
    userRole,
    String(companyId || ""),
    String(branchId || ""),
    String(budgetId || ""),
    String(groupId || "")
  ]

  return unstable_cache(
    async () => {
      return measureAsync("getExecutiveAnalytics", async () => {
        const supabase = createServiceRoleClient()
        
        let criticalQuery = (supabase.from('BudgetAllocation') as any)
          .select(`
            amountUSD,
            consumedUSD,
            companyAccount:CompanyAccount(
              globalAccount:GlobalAccount(
                code,
                name
              )
            ),
            budget:Budget!inner(
              id,
              companyId,
              branchId,
              company:Company!inner(
                groupId
              )
            )
          `)
          .gt('amountUSD', 0)

        if (companyId) {
          criticalQuery = criticalQuery.eq('budget.companyId', companyId)
        }
        if (branchId) {
          criticalQuery = criticalQuery.eq('budget.branchId', branchId)
        }
        if (budgetId) {
          criticalQuery = criticalQuery.eq('budget.id', budgetId)
        }
        if (groupId) {
          criticalQuery = criticalQuery.eq('budget.company.groupId', groupId)
        }

        const [branchesResult, accountsResult, criticalResult] = await Promise.all([
          (supabase.rpc as any)('rpc_dashboard_branch_ranking', {
            p_company_id: companyId,
            p_branch_id: branchId,
            p_budget_id: budgetId,
            p_group_id: groupId
          }),
          (supabase.rpc as any)('rpc_dashboard_account_ranking', {
            p_company_id: companyId,
            p_branch_id: branchId,
            p_budget_id: budgetId,
            p_group_id: groupId
          }),
          criticalQuery
        ])

        if (branchesResult.error) throw new Error(`Error Branch Rankings: ${branchesResult.error.message}`)
        if (accountsResult.error) throw new Error(`Error Account Rankings: ${accountsResult.error.message}`)
        if (criticalResult.error) throw new Error(`Error Critical Accounts: ${criticalResult.error.message}`)

        const branchRankings = (branchesResult.data || []).map((b: any) => ({
          name: b.name,
          consumed: Number(b.consumed)
        }))

        const accountRankings = (accountsResult.data || []).map((a: any) => ({
          code: a.code,
          name: a.name,
          consumed: Number(a.consumed)
        }))

        const criticalAccounts = (criticalResult.data || [])
          .map((row: any) => {
            const ga = row.companyAccount?.globalAccount
            const budget = Number(row.amountUSD || 0)
            const consumed = Number(row.consumedUSD || 0)
            const percent = budget > 0 ? (consumed / budget) * 100 : 0
            return {
              code: ga?.code || '',
              name: ga?.name || '',
              budget,
              consumed,
              percent
            }
          })
          .filter((item: any) => item.consumed > 0)
          .sort((a: any, b: any) => b.percent - a.percent || b.consumed - a.consumed)
          .slice(0, 5)

        return {
          branchRankings,
          accountRankings,
          criticalAccounts
        }
      })
    },
    cacheKey,
    { revalidate: 30, tags: ["dashboard"] }
  )()
}

export async function getRecentActivity(searchParams: { companyId?: number; branchId?: number; budgetId?: number; groupId?: number }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const finalCompanyId = filter.companyId || searchParams.companyId || null

  const userCompanyId = user.companyId
  const userRole = user.role

  const cacheKey = [
    "dashboard-recent-activity",
    String(userCompanyId || "all"),
    userRole,
    String(finalCompanyId || ""),
    String(searchParams.branchId || ""),
    String(searchParams.budgetId || ""),
    String(searchParams.groupId || "")
  ]

  return unstable_cache(
    async () => {
      return measureAsync("getRecentActivity", async () => {
        const supabase = createServiceRoleClient()
        
        let query = (supabase.from('recent_activity_view') as any)
          .select('*')

        if (finalCompanyId) query = query.eq('companyId', finalCompanyId)
        if (searchParams.branchId) query = query.eq('branchId', searchParams.branchId)
        if (searchParams.budgetId) query = query.eq('budgetId', searchParams.budgetId)
        if (searchParams.groupId) query = query.eq('companyGroupId', searchParams.groupId)

        const { data, error } = await query
          .order('createdAt', { ascending: false })
          .limit(6)

        if (error) throw error

        return (data || []).map((row: any) => ({
          id: row.id,
          number: row.number,
          supplierName: row.supplierName,
          amountUSD: row.amountUSD,
          date: row.date,
          status: row.status,
          companyId: row.companyId,
          company: {
            name: row.companyName,
            groupId: row.companyGroupId
          },
          registeredBy: row.registeredByName ? { name: row.registeredByName } : null,
          account: row.accountName ? { code: row.accountCode, name: row.accountName } : null,
          allocation: row.budgetId ? {
            category: null,
            budget: {
              id: row.budgetId,
              branchId: row.branchId,
              branch: row.branchName ? { id: row.branchId, name: row.branchName } : null
            }
          } : null
        })) as any[]
      })
    },
    cacheKey,
    { revalidate: 30, tags: ["dashboard"] }
  )()
}

export async function getFilterOptions() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const [companiesResult, branchesResult, budgetsResult, groups] = await Promise.all([
    getCachedCompanies(),
    getCachedBranches(),
    (supabase.from('Budget') as any).select('id, name, branchId, companyId').order('initialDate', { ascending: false }).limit(200).then((res: any) => res.data || []),
    getCachedBusinessGroups(true)
  ])

  let companies = companiesResult || []
  let branches = branchesResult?.items || []
  let budgets = budgetsResult || []

  if (filter.companyId) {
      companies = companies.filter((c: any) => c.id === filter.companyId)
      branches = branches.filter((b: any) => b.companyId === filter.companyId)
      budgets = budgets.filter((b: any) => b.companyId === filter.companyId)
  }

  if (branchScope.branchId) {
      branches = branches.filter((b: any) => b.id === branchScope.branchId)
      budgets = budgets.filter((b: any) => b.branchId === branchScope.branchId)
  }

  return { companies, branches, budgets, groups }
}
