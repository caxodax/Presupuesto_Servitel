import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

export async function getInvoices() {
  const user = await requireAuth()
  
  const whereClause = enforceCompanyScope(user)

  return prisma.invoice.findMany({
    where: whereClause,
    include: {
      company: { select: { name: true } },
      registeredBy: { select: { name: true } },
      allocation: {
        include: {
          category: { select: { name: true } },
          budget: {
            include: {
              branch: { select: { name: true } }
            }
          },
        },
      },
    },
    orderBy: { date: "desc" },
  })
}

export async function getInvoiceDetails(invoiceId: string) {
  const user = await requireAuth()

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      company: { select: { name: true } },
      registeredBy: { select: { name: true } },
      allocation: {
        include: {
          category: { select: { name: true } },
          budget: { 
             include: {
                branch: { select: { name: true } }
             }
          },
        },
      },
    },
  })

  if (!invoice) throw new Error("Factura no encontrada")
  enforceCompanyScope(user, invoice.companyId)

  const allocLimit = Number(invoice.allocation.amountUSD)
  const currentConsumedAll = Number(invoice.allocation.consumedUSD)
  
  const negativeOverBudgetLimit = currentConsumedAll > allocLimit ? currentConsumedAll - allocLimit : 0
  const availableCapacity = allocLimit - currentConsumedAll

  // Recuperar Auditoría Específica de esta Factura (Rastro Forense)
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entity: "Factura Operativa",
      entityId: invoiceId
    },
    include: {
      user: { select: { name: true, role: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    invoice,
    analytics: {
      hardLimit: allocLimit,
      totalConsumedNow: currentConsumedAll,
      overBudgetSpill: negativeOverBudgetLimit,
      currentCapacity: availableCapacity,
    },
    auditLogs
  }
}
