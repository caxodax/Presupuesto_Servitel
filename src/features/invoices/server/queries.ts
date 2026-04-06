import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"

export async function getInvoices() {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const whereClause: any = { ...filter }
  if (branchScope.branchId) {
    whereClause.allocation = { budget: { branchId: branchScope.branchId } }
  }

  return prisma.invoice.findMany({
    where: whereClause,
    include: {
      allocation: {
        include: {
          category: true,
          subcategory: true,
          budget: { include: { branch: true } },
        },
      },
      registeredBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
}

export async function getInvoiceDetails(invoiceId: string) {
  const user = await requireAuth()
  const filter = enforceCompanyScope(user)
  const branchScope = getBranchIsolation(user)

  const whereClause: any = { ...filter, id: invoiceId }
  if (branchScope.branchId) {
    whereClause.allocation = { budget: { branchId: branchScope.branchId } }
  }

  const invoice = await prisma.invoice.findFirst({
    where: whereClause,
    include: {
      allocation: {
        include: {
          category: true,
          subcategory: true,
          budget: { include: { branch: true } },
        },
      },
      registeredBy: { select: { name: true, role: true, email: true } },
    },
  })

  if (!invoice) throw new Error("Factura no encontrada.")

  const allocLimit = Number(invoice.allocation.amountUSD)
  const currentConsumedAll = Number(invoice.allocation.consumedUSD)
  const negativeOverBudgetLimit = currentConsumedAll > allocLimit ? currentConsumedAll - allocLimit : 0
  const availableCapacity = allocLimit - currentConsumedAll

  return {
    invoice,
    analytics: {
      hardLimit: allocLimit,
      totalConsumedNow: currentConsumedAll,
      overBudgetSpill: negativeOverBudgetLimit,
      currentCapacity: availableCapacity,
    },
  }
}
