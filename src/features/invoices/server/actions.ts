"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, getBranchIsolation } from "@/lib/permissions"
import { invoiceSchema } from "../validations"
import { redirect } from "next/navigation"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"
import { writeFile } from "fs/promises"
import { join } from "path"
import { recordAuditLog } from "@/lib/audit"

export async function createInvoice(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

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

  const { data: allocation, error: aError } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(id, companyId, branchId)')
    .eq('id', validated.allocationId)
    .single()

  if (aError || !allocation) throw new Error("Asignación presupuestaria no encontrada.")

  enforceCompanyScope(user, (allocation as any).budget.companyId)
  const branchScope = getBranchIsolation(user)
  if (branchScope.branchId && branchScope.branchId !== (allocation as any).budget.branchId) {
     throw new Error("Error de Seguridad: Intentas registrar una factura sobre el fondo de una sucursal en la cual no estás asignado.")
  }

  // Creación de Factura
  const { data: inv, error: iError } = await supabase
    .from('Invoice')
    .insert({
      number: validated.number,
      supplierName: validated.supplierName,
      allocationId: validated.allocationId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      companyId: (allocation as any).budget.companyId,
      registeredById: user.profileId,
      attachmentKey,
      attachmentName,
    })
    .select()
    .single()

  if (iError || !inv) throw new Error(`Error crear factura: ${iError?.message}`)

  // Actualizar Consumo en Asignación
  // Incremento manual
  const newConsumedUSD = Number(allocation.consumedUSD) + validated.amountUSD
  const newConsumedVES = Number(allocation.consumedVES) + calculatedVES
  
  await supabase
    .from('BudgetAllocation')
    .update({
      consumedUSD: newConsumedUSD,
      consumedVES: newConsumedVES,
    })
    .eq('id', validated.allocationId)

  await recordAuditLog({
    action: "CREATE_INVOICE",
    entity: "Factura Operativa",
    entityId: inv.id,
    companyId: (allocation as any).budget.companyId,
    userId: user.profileId,
    details: {
      number: inv.number,
      supplier: inv.supplierName,
      deductedUSD: Number(inv.amountUSD),
    },
  })

  // Disparar motor de alertas
  await triggerBudgetAlerts(validated.allocationId)

  redirect(`/dashboard/facturas/${inv.id}`)
}
