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
    companyAccountId: formData.get("companyAccountId") || null,
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
  let finalCompanyAccountId = validated.companyAccountId

  if (!finalCompanyAccountId && !finalAccountId && (allocation as any).companyAccountId) {
    finalCompanyAccountId = (allocation as any).companyAccountId
  }
  if (!finalAccountId && !finalCompanyAccountId && allocation.accountId) {
    finalAccountId = allocation.accountId
  }

  // Validaciones de tipo COST/EXPENSE
  if (!finalCompanyAccountId) {
    throw new Error("Debe seleccionar una cuenta contable válida. El sistema ya no permite registros sin asignación contable.")
  }

  await validateAccountForExpense(finalCompanyAccountId, companyId)


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

  const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_register_invoice', {
    p_invoice_data: {
      number: validated.number,
      supplierName: validated.supplierName,
      allocationId: validated.allocationId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      companyAccountId: finalCompanyAccountId,
      attachmentKey,
      attachmentName,
    }
  })

  if (rpcError) throw new Error(`Error crear factura: ${rpcError.message}`)

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
    companyAccountId: formData.get("companyAccountId") || null,
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
  let finalCompanyAccountId = validated.companyAccountId

  if (!finalCompanyAccountId && !finalAccountId && (targetAlloc as any)?.companyAccountId) {
    finalCompanyAccountId = (targetAlloc as any).companyAccountId
  }
  if (!finalAccountId && !finalCompanyAccountId && targetAlloc?.accountId) {
    finalAccountId = targetAlloc.accountId
  }


  // Validaciones de tipo COST/EXPENSE
  if (!finalCompanyAccountId) {
    throw new Error("Debe seleccionar una cuenta contable válida. El sistema ya no permite registros sin asignación contable.")
  }

  await validateAccountForExpense(finalCompanyAccountId, targetCompanyId)

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

  const { error: rpcError } = await supabase.rpc('rpc_update_invoice', {
    p_invoice_id: invoiceId,
    p_invoice_data: {
      number: validated.number,
      supplierName: validated.supplierName,
      allocationId: validated.allocationId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      companyAccountId: finalCompanyAccountId,
      attachmentKey,
      attachmentName
    }
  })

  if (rpcError) throw new Error(`Error al actualizar factura: ${rpcError.message}`)

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

  const { error: rpcError } = await supabase.rpc('rpc_cancel_invoice', {
    p_invoice_id: id
  })

  if (rpcError) throw new Error(`Error al anular: ${rpcError.message}`)

  revalidatePath('/dashboard/facturas')
}
