import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"

export async function getBudgets(companyId?: string) {
  const user = await requireAuth()
  
  // Si no es Super Admin, siempre forzamos su propia empresa
  if (user.role !== 'SUPER_ADMIN') {
    return prisma.budget.findMany({
      where: { companyId: user.companyId as string },
      include: {
        branch: {
          include: { company: true }
        },
        allocations: {
          include: {
            category: true,
            subcategory: true,
          },
        },
      },
      orderBy: { initialDate: "desc" },
    })
  }

  // Super Admin: Puede ver todo o filtrar por una empresa específica
  return prisma.budget.findMany({
    where: companyId ? { companyId } : {},
    include: {
      branch: {
        include: { company: true }
      },
      allocations: {
        include: {
          category: true,
          subcategory: true,
        },
      },
    },
    orderBy: { initialDate: "desc" },
  })
}

export async function getBudgetDetails(budgetId: string) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const budget = await prisma.budget.findFirst({
    where: { ...filter, ...branchScope, id: budgetId },
    include: {
      branch: true,
      allocations: {
        include: {
          category: true,
          subcategory: true,
          adjustments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  })

  if (!budget) throw new Error("Presupuesto no encontrado.")

  let totalAllocatedRaw = 0
  let totalConsumedUSD = 0
  let totalConsumedVES = 0

  budget.allocations.forEach((alloc) => {
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
