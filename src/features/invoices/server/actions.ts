"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { invoiceSchema } from "../validations"
import { redirect } from "next/navigation"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"


import { writeFile } from "fs/promises"
import { join } from "path"
import { crypto } from "crypto"

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

  // Procesar Adjunto
  const file = formData.get("attachment") as File
  let attachmentKey: string | null = null
  let attachmentName: string | null = null

  if (file && file.size > 0) {
    attachmentName = file.name
    attachmentKey = `${Date.now()}-${attachmentName.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const path = join(process.cwd(), "uploads", attachmentKey)
    await writeFile(path, buffer)
  }

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
        attachmentKey,
        attachmentName,
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

    // Disparar motor de alertas
    await triggerBudgetAlerts(validated.allocationId, tx)

    return inv.id
  })


  redirect(`/dashboard/facturas/${recordedInvoiceId}`)
}
