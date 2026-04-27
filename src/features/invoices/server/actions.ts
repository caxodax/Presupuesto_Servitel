"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { invoiceSchema } from "../validations"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function createInvoice(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

  const validated = invoiceSchema.parse({
    number: formData.get("number"),
    supplierName: formData.get("supplierName"),
    allocationId: Number(formData.get("allocationId")),
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
  })

  const { data: allocation, error: aError } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(id, companyId, branchId, branch:Branch(name, company:Company(name)))')
    .eq('id', validated.allocationId)
    .single()

  if (aError || !allocation) throw new Error("Asignación presupuestaria no encontrada.")

  const budgetInfo = (allocation as any).budget
  const companyId = budgetInfo.companyId
  const branchId = budgetInfo.branchId
  const companyName = budgetInfo.branch.company.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const branchName = budgetInfo.branch.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  
  enforceCompanyScope(user, companyId)

  // Procesar Adjunto en Cloudflare R2 con estructura de carpetas legibles
  const file = formData.get("attachment") as File
  let attachmentKey: string | null = null
  let attachmentName: string | null = null

  if (file && file.size > 0) {
    attachmentName = file.name
    // Estructura: empresa_1_servitel/sucursal_5_centro/archivo
    attachmentKey = `empresa_${companyId}_${companyName}/sucursal_${branchId}_${branchName}/${Date.now()}-${attachmentName.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: attachmentKey,
      Body: buffer,
      ContentType: file.type,
    }))
  }

  const calculatedVES = validated.amountUSD * validated.exchangeRate

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
      companyId: companyId,
      registeredById: user.profileId,
      attachmentKey,
      attachmentName,
    })
    .select()
    .single()

  if (iError || !inv) throw new Error(`Error crear factura: ${iError?.message}`)

  // Actualizar Consumo
  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: validated.allocationId,
    p_amount_usd: validated.amountUSD,
    p_amount_ves: calculatedVES
  })

  await recordAuditLog({
    action: "CREATE_INVOICE",
    entity: "Factura Operativa",
    entityId: inv.id,
    companyId: (allocation as any).budget.companyId,
    userId: user.profileId,
    details: { number: inv.number, amount: validated.amountUSD }
  })

  await triggerBudgetAlerts(validated.allocationId)
  revalidatePath('/dashboard/facturas')
}

export async function updateInvoice(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

  const invoiceId = Number(formData.get("invoiceId"))
  const validated = invoiceSchema.parse({
    number: formData.get("number"),
    supplierName: formData.get("supplierName"),
    allocationId: Number(formData.get("allocationId")),
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
  })

  const { data: oldInvoice, error: fError } = await supabase
    .from('Invoice')
    .select('*, allocation:BudgetAllocation(*)')
    .eq('id', invoiceId)
    .single()

  if (fError || !oldInvoice) throw new Error("Factura original no encontrada.")

  enforceCompanyScope(user, oldInvoice.companyId)

  // Obtener info de la asignación seleccionada para la carpeta correcta con nombres
  const { data: targetAlloc } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(companyId, branchId, branch:Branch(name, company:Company(name)))')
    .eq('id', validated.allocationId)
    .single()

  const budgetInfo = (targetAlloc as any)?.budget
  const targetCompanyId = budgetInfo?.companyId || oldInvoice.companyId
  const targetBranchId = budgetInfo?.branchId || oldInvoice.branchId
  const companyName = budgetInfo?.branch.company.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'desconocida'
  const branchName = budgetInfo?.branch.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'desconocida'

  // 1. Manejo de archivo (Cloudflare R2 con carpetas legibles)
  const file = formData.get("attachment") as File
  let attachmentKey = oldInvoice.attachmentKey
  let attachmentName = oldInvoice.attachmentName

  if (file && file.size > 0) {
    attachmentName = file.name
    // Nueva estructura organizada y legible
    attachmentKey = `empresa_${targetCompanyId}_${companyName}/sucursal_${targetBranchId}_${branchName}/${Date.now()}-${attachmentName.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: attachmentKey,
        Body: buffer,
        ContentType: file.type,
    }))
  }

  const calculatedVES = validated.amountUSD * validated.exchangeRate

  // 2. Revertir impacto presupuestario anterior y aplicar nuevo
  // Revertimos oldAmount y sumamos newAmount
  // Lo Ideal es un RPC o Transacción para evitar inconsistencias
  
  // Revertir OLD
  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: oldInvoice.allocationId,
    p_amount_usd: -Number(oldInvoice.amountUSD),
    p_amount_ves: -Number(oldInvoice.amountVES)
  })

  // Aplicar NEW
  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: validated.allocationId,
    p_amount_usd: validated.amountUSD,
    p_amount_ves: calculatedVES
  })

  // 3. Actualizar Factura
  const { error: uError } = await supabase
    .from('Invoice')
    .update({
      number: validated.number,
      supplierName: validated.supplierName,
      allocationId: validated.allocationId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      attachmentKey,
      attachmentName
    })
    .eq('id', invoiceId)

  if (uError) throw new Error(`Error al actualizar factura: ${uError.message}`)

  await recordAuditLog({
     action: "UPDATE_INVOICE",
     entity: "Factura Operativa",
     entityId: invoiceId,
     companyId: oldInvoice.companyId,
     userId: user.profileId,
     details: { oldAmount: oldInvoice.amountUSD, newAmount: validated.amountUSD }
  })

  revalidatePath('/dashboard/facturas')
  revalidatePath(`/dashboard/facturas/${invoiceId}`)
}
export async function getRateByDate(date: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ExchangeRate')
      .select('usd')
      .eq('date', date)
      .single()
  
    if (error || !data) return null
    return Number(data.usd)
}
