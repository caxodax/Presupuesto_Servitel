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

export async function getExecutiveAnalytics(searchParams: { companyId?: string; branchId?: string; budgetId?: string }) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)
  
  const whereClause: any = { ...filter }
  if (searchParams.companyId) whereClause.companyId = searchParams.companyId
  if (searchParams.branchId) whereClause.id = searchParams.branchId // Filtrar sucursal por ID

  // Security Override
  if (branchScope.branchId) whereClause.id = branchScope.branchId

  // 1. Ranking de Sucursales por Consumo (Filtrado por presupuesto si aplica)
  const branchesData = await prisma.branch.findMany({
    where: whereClause,
    include: {
      budgets: {
        where: searchParams.budgetId ? { id: searchParams.budgetId } : {},
        include: {
          allocations: { select: { consumedUSD: true } }
        }
      }
    }
  })

  const branchRankings = branchesData
    .map(b => {
      let consumed = 0
      b.budgets.forEach(bud => {
        bud.allocations.forEach(a => (consumed += Number(a.consumedUSD)))
      })
      return { name: b.name, consumed }
    })
    .filter(b => b.consumed > 0 || searchParams.branchId) // Si se filtra por sucursal, mostrarla aunque sea 0. Si no, solo las que tienen datos si hay presupuesto seleccionado.
    .sort((a, b) => b.consumed - a.consumed)
    .slice(0, 5)

  // 2. Ranking de Categorías más pesadas (Filtrado por presupuesto y sucursal)
  const categoryWhereClause: any = { 
    budget: { 
      companyId: whereClause.companyId || filter.companyId 
    } 
  }
  
  if (searchParams.branchId || branchScope.branchId) {
    categoryWhereClause.budget.branchId = searchParams.branchId || branchScope.branchId
  }
  if (searchParams.budgetId) {
    categoryWhereClause.budget.id = searchParams.budgetId
  }

  const categoryGroup = await prisma.budgetAllocation.groupBy({
    by: ['categoryId'],
    where: categoryWhereClause,
    _sum: { consumedUSD: true },
    orderBy: { _sum: { consumedUSD: 'desc' } },
    take: 5
  })

  // Recuperamos los nombres de las categorías para el ranking
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryGroup.map(c => c.categoryId) } }
  })

  const categoryRankings = categoryGroup
    .map(cg => ({
      name: categories.find(c => c.id === cg.categoryId)?.name || "Sin Categoría",
      consumed: Number(cg._sum.consumedUSD || 0)
    }))
    .filter(c => c.consumed > 0) // Opciones de limpieza: solo categorías con gasto real

  return {
    branchRankings,
    categoryRankings
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
      company: { select: { name: true } }
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



