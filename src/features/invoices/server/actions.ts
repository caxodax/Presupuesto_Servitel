"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { invoiceSchema } from "../validations"
import { validateAccountForExpense } from "@/features/accounts/server/validations"
import { resolveAccountFromCategory } from "@/features/accounts/server/actions"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"
import { revalidatePath } from "next/cache"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function createInvoice(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const validated = invoiceSchema.parse({
    number: formData.get("number"),
    supplierName: formData.get("supplierName"),
    allocationId: Number(formData.get("allocationId")),
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
    accountId: formData.get("accountId") || null,
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
  
  // Resolución automática si no viene cuenta: heredar del rubro presupuestario
  let finalAccountId = validated.accountId
  if (!finalAccountId && allocation.accountId) {
    finalAccountId = allocation.accountId
  }

  if (finalAccountId) {
    await validateAccountForExpense(finalAccountId)
  }

  // Procesar Adjunto en Cloudflare R2
  const file = formData.get("attachment") as File
  let attachmentKey: string | null = null
  let attachmentName: string | null = null

  if (file && file.size > 0) {
    attachmentName = file.name
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
      accountId: finalAccountId,
      registeredById: user.profileId,
      attachmentKey,
      attachmentName,
    })
    .select()
    .single()

  if (iError || !inv) throw new Error(`Error crear factura: ${iError?.message}`)

  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: validated.allocationId,
    p_amount_usd: validated.amountUSD,
    p_amount_ves: calculatedVES
  })

  await triggerBudgetAlerts(validated.allocationId)
  revalidatePath('/dashboard/facturas')
}

export async function updateInvoice(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const invoiceId = Number(formData.get("invoiceId"))
  const validated = invoiceSchema.parse({
    number: formData.get("number"),
    supplierName: formData.get("supplierName"),
    allocationId: Number(formData.get("allocationId")),
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
    accountId: formData.get("accountId") || null,
  })

  const { data: oldInvoice, error: fError } = await supabase
    .from('Invoice')
    .select('*, allocation:BudgetAllocation(*, budget:Budget(branchId))')
    .eq('id', invoiceId)
    .single()

  if (fError || !oldInvoice) throw new Error("Factura original no encontrada.")

  enforceCompanyScope(user, oldInvoice.companyId)

  const { data: targetAlloc } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(companyId, branchId, branch:Branch(name, company:Company(name)))')
    .eq('id', validated.allocationId)
    .single()

  const budgetInfo = (targetAlloc as any)?.budget
  const targetCompanyId = budgetInfo?.companyId || oldInvoice.companyId
  
  // Resolución automática
  let finalAccountId = validated.accountId
  if (!finalAccountId && targetAlloc?.accountId) {
    finalAccountId = targetAlloc.accountId
  }

  if (finalAccountId) {
    await validateAccountForExpense(finalAccountId)
  }

  const targetBranchId = budgetInfo?.branchId || (oldInvoice.allocation as any)?.budget?.branchId
  const companyName = budgetInfo?.branch.company.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'desconocida'
  const branchName = budgetInfo?.branch.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'desconocida'

  const file = formData.get("attachment") as File
  let attachmentKey = oldInvoice.attachmentKey
  let attachmentName = oldInvoice.attachmentName

  if (file && file.size > 0) {
    attachmentName = file.name
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

  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: oldInvoice.allocationId,
    p_amount_usd: -Number(oldInvoice.amountUSD),
    p_amount_ves: -Number(oldInvoice.amountVES)
  })

  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: validated.allocationId,
    p_amount_usd: validated.amountUSD,
    p_amount_ves: calculatedVES
  })

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
      accountId: finalAccountId,
      attachmentKey,
      attachmentName
    })
    .eq('id', invoiceId)

  if (uError) throw new Error(`Error al actualizar factura: ${uError.message}`)

  revalidatePath('/dashboard/facturas')
  revalidatePath(`/dashboard/facturas/${invoiceId}`)
}

export async function getRateByDate(date: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('ExchangeRate')
      .select('usd')
      .eq('date', date)
      .maybeSingle()
  
    if (error || !data) return null
    return Number(data.usd)
}

export async function anulateInvoice(id: number) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: invoice, error: fError } = await supabase
    .from('Invoice')
    .select('*')
    .eq('id', id)
    .single()

  if (fError || !invoice) throw new Error("Factura no encontrada")
  if (invoice.status === 'CANCELLED') throw new Error("La factura ya está anulada")

  enforceCompanyScope(user, invoice.companyId)

  // Restaurar presupuesto
  await supabase.rpc('adjust_allocation_on_invoice', {
    p_allocation_id: invoice.allocationId,
    p_amount_usd: -Number(invoice.amountUSD),
    p_amount_ves: -Number(invoice.amountVES)
  })

  const { error: uError } = await supabase
    .from('Invoice')
    .update({ status: 'CANCELLED' })
    .eq('id', id)

  if (uError) throw new Error(`Error al anular: ${uError.message}`)

  revalidatePath('/dashboard/facturas')
}
