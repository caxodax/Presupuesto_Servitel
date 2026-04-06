import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"

export async function getDashboardKpis(searchParams: { companyId?: string; branchId?: string; budgetId?: string }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const whereClause: any = { ...filter }
  if (searchParams.companyId) whereClause.companyId = searchParams.companyId
  if (searchParams.branchId) whereClause.branchId = searchParams.branchId
  if (searchParams.budgetId) whereClause.id = searchParams.budgetId

  // Security Override
  if (branchScope.branchId) whereClause.branchId = branchScope.branchId

  const budgets = await prisma.budget.findMany({
    where: whereClause,
    include: {
      allocations: {
        select: { amountUSD: true, consumedUSD: true },
      },
    },
  })

  let totalLimit = 0
  let totalConsolidatedAllocations = 0
  let totalConsumed = 0

  for (const b of budgets) {
    totalLimit += Number(b.amountLimitUSD)
    for (const a of b.allocations) {
      totalConsolidatedAllocations += Number(a.amountUSD)
      totalConsumed += Number(a.consumedUSD)
    }
  }

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

export async function getRecentActivity(searchParams: { companyId?: string; branchId?: string; budgetId?: string }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const whereClause: any = filter.companyId ? { companyId: filter.companyId } : {}
  if (searchParams.companyId) whereClause.companyId = searchParams.companyId

  if (searchParams.branchId || searchParams.budgetId || branchScope.branchId) {
    whereClause.allocation = { budget: {} as any }
    if (searchParams.branchId) whereClause.allocation.budget.branchId = searchParams.branchId
    if (searchParams.budgetId) whereClause.allocation.budget.id = searchParams.budgetId
    // Security Override
    if (branchScope.branchId) whereClause.allocation.budget.branchId = branchScope.branchId
  }

  return prisma.invoice.findMany({
    where: whereClause,
    include: {
      allocation: { include: { category: true, budget: { include: { branch: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  })
}

export async function getFilterOptions() {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const [companies, branches, budgets] = await Promise.all([
    prisma.company.findMany({ where: filter.companyId ? { id: filter.companyId } : {}, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { ...filter, ...(branchScope.branchId ? { id: branchScope.branchId } : {}) }, select: { id: true, name: true, companyId: true }, orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { ...filter, ...branchScope }, select: { id: true, name: true, branchId: true, companyId: true }, orderBy: { initialDate: "desc" } }),
  ])

  return { companies, branches, budgets }
}
