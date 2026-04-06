"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { invoiceSchema } from "../validations"
import { redirect } from "next/navigation"

export async function createInvoice(formData: FormData) {
  const user = await requireAuth()

  const validated = invoiceSchema.parse({
    number: formData.get("number"),
    supplierName: formData.get("supplierName"),
    allocationId: formData.get("allocationId"),
    amountUSD: formData.get("amountUSD"),
    exchangeRate: formData.get("exchangeRate"),
    date: formData.get("date"),
  })

  const calculatedVES = validated.amountUSD * validated.exchangeRate

  const allocation = await prisma.budgetAllocation.findUnique({
    where: { id: validated.allocationId },
    include: { budget: true },
  })
  if (!allocation) throw new Error("Asignación presupuestaria no encontrada.")

  enforceCompanyScope(user, allocation.budget.companyId)
  const branchScope = getBranchIsolation(user)
  if (branchScope.branchId && branchScope.branchId !== allocation.budget.branchId) {
     throw new Error("Error de Seguridad: Intentas registrar una factura sobre el fondo de una sucursal en la cual no estás asignado.")
  }

  const recordedInvoiceId = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        number: validated.number,
        supplierName: validated.supplierName,
        allocationId: validated.allocationId,
        amountUSD: validated.amountUSD,
        amountVES: calculatedVES,
        exchangeRate: validated.exchangeRate,
        date: new Date(validated.date),
        companyId: allocation.budget.companyId,
        registeredById: user.id,
      },
    })

    await tx.budgetAllocation.update({
      where: { id: validated.allocationId },
      data: {
        consumedUSD: { increment: validated.amountUSD },
        consumedVES: { increment: calculatedVES },
      },
    })

    await tx.auditLog.create({
      data: {
        action: "CREATE_INVOICE",
        entity: "Factura Operativa",
        entityId: inv.id,
        companyId: allocation.budget.companyId,
        userId: user.id,
        details: {
          number: inv.number,
          supplier: inv.supplierName,
          deductedUSD: Number(inv.amountUSD),
        },
      },
    })

    return inv.id
  })

  redirect(`/dashboard/facturas/${recordedInvoiceId}`)
}
