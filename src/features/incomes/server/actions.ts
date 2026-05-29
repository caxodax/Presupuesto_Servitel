"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { incomeSchema } from "../validations"
import { validateAccountForIncome } from "@/features/accounts/server/validations"
import { resolveAccountFromCategory, toggleCompanyAccount } from "@/features/accounts/server/actions"
import { revalidatePath, revalidateTag as nextRevalidateTag } from "next/cache"
const revalidateTag = nextRevalidateTag as any
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"

/**
 * Asegura que una cuenta global esté activada para una empresa.
 */
async function ensureCompanyAccount(companyId: number, globalAccountId: number) {
  const supabase = await createClient()
  const { data: existing } = await (supabase.from('CompanyAccount') as any)
    .select('id, isActive')
    .eq('companyId', companyId)
    .eq('globalAccountId', globalAccountId)
    .maybeSingle()

  if (existing) {
    if (!(existing as any).isActive) {
      await toggleCompanyAccount({ companyId, globalAccountId, isActive: true })
    }
    return (existing as any).id
  }

  const result = await toggleCompanyAccount({ companyId, globalAccountId, isActive: true })
  return result.id
}

export async function createIncome(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const validated = incomeSchema.parse({
    number: formData.get("number"),
    clientName: formData.get("clientName"),
    accountId: formData.get("accountId") ? Number(formData.get("accountId")) : null,
    companyAccountId: formData.get("companyAccountId") ? Number(formData.get("companyAccountId")) : null,
    globalAccountId: formData.get("globalAccountId") ? Number(formData.get("globalAccountId")) : null,
    branchId: formData.get("branchId") ? Number(formData.get("branchId")) : null,
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
    notes: formData.get("notes"),
  })

  // Determinar companyId (si no es SUPER_ADMIN, usamos el del perfil)
  let companyId = user.companyId
  if (user.role === "SUPER_ADMIN") {
      const companyIdStr = formData.get("companyId")
      if (!companyIdStr) throw new Error("ID de empresa requerido para Super Admin")
      companyId = Number(companyIdStr)
  }

  if (!companyId) throw new Error("No se pudo determinar la empresa.")

  enforceCompanyScope(user, companyId)

  // Resolución automática si no viene cuenta
  let finalAccountId = validated.accountId
  let finalCompanyAccountId = validated.companyAccountId

  if (!finalCompanyAccountId && validated.globalAccountId) {
    finalCompanyAccountId = await ensureCompanyAccount(companyId, validated.globalAccountId)
  }


  // Validaciones de tipo INCOME
  if (!finalCompanyAccountId) {
    throw new Error("Debe seleccionar una cuenta contable válida. El sistema ya no permite registros sin asignación contable.")
  }

  await validateAccountForIncome(finalCompanyAccountId, companyId)


  // Procesar Adjunto en Cloudflare R2
  const file = formData.get("attachment") as File
  let attachmentKey: string | null = null
  let attachmentName: string | null = null

  if (file && file.size > 0) {
    attachmentName = file.name
    attachmentKey = `empresa_${companyId}/ingresos/${Date.now()}-${attachmentName.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: attachmentKey,
      Body: buffer,
      ContentType: file.type,
    }))
  }

  const calculatedVES = validated.amountUSD * validated.exchangeRate

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('rpc_register_income', {
    p_income_data: {
      number: validated.number,
      clientName: validated.clientName,
      companyAccountId: finalCompanyAccountId,
      branchId: validated.branchId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      notes: validated.notes,
      companyId: companyId,
      attachmentKey,
      attachmentName,
    }
  })

  if (rpcError) throw new Error(`Error crear ingreso: ${rpcError.message}`)

  revalidatePath('/dashboard/ingresos')
  revalidateTag('dashboard')
  revalidatePath('/dashboard')
}

export async function deleteIncome(incomeId: number) {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: income, error: fError } = await (supabase.from('Income') as any)
        .select('companyId, number')
        .eq('id', incomeId)
        .single()

    if (fError || !income) throw new Error("Ingreso no encontrado.")

    enforceCompanyScope(user, (income as any).companyId)

    const { error: dError } = await (supabase.from('Income') as any)
        .delete()
        .eq('id', incomeId)

    if (dError) throw new Error(`Error al eliminar ingreso: ${dError.message}`)

    revalidatePath('/dashboard/ingresos')
    revalidateTag('dashboard')
    revalidatePath('/dashboard')
}

export async function updateIncome(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const incomeId = Number(formData.get("incomeId"))
  if (!incomeId) throw new Error("ID de ingreso requerido")

  const { data: oldIncome, error: fError } = await (supabase.from('Income') as any)
    .select('*')
    .eq('id', incomeId)
    .single()

  if (fError || !oldIncome) throw new Error("Ingreso original no encontrado.")
  enforceCompanyScope(user, (oldIncome as any).companyId)

  const validated = incomeSchema.parse({
    number: formData.get("number"),
    clientName: formData.get("clientName"),
    accountId: formData.get("accountId") ? Number(formData.get("accountId")) : null,
    companyAccountId: formData.get("companyAccountId") ? Number(formData.get("companyAccountId")) : null,
    branchId: formData.get("branchId") ? Number(formData.get("branchId")) : null,
    globalAccountId: formData.get("globalAccountId") ? Number(formData.get("globalAccountId")) : null,
    amountUSD: Number(formData.get("amountUSD")),
    exchangeRate: Number(formData.get("exchangeRate")),
    date: formData.get("date"),
    notes: formData.get("notes"),
  })

  // Resolución automática si no viene cuenta
  let finalAccountId = validated.accountId
  let finalCompanyAccountId = validated.companyAccountId

  if (!finalCompanyAccountId && validated.globalAccountId) {
    finalCompanyAccountId = await ensureCompanyAccount((oldIncome as any).companyId, validated.globalAccountId)
  }


  // Validaciones de tipo INCOME
  if (!finalCompanyAccountId) {
    throw new Error("Debe seleccionar una cuenta contable válida. El sistema ya no permite registros sin asignación contable.")
  }

  await validateAccountForIncome(finalCompanyAccountId, (oldIncome as any).companyId)


  // Procesar Adjunto si viene uno nuevo
  const file = formData.get("attachment") as File
  let attachmentKey = (oldIncome as any).attachmentKey
  let attachmentName = (oldIncome as any).attachmentName

  if (file && file.size > 0) {
    attachmentName = file.name
    attachmentKey = `empresa_${(oldIncome as any).companyId}/ingresos/${Date.now()}-${attachmentName.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: attachmentKey,
      Body: buffer,
      ContentType: file.type,
    }))
  }

  const calculatedVES = validated.amountUSD * validated.exchangeRate

  const { error: uError } = await (supabase.from('Income') as any)
    .update({
      number: validated.number,
      clientName: validated.clientName,
      accountId: finalAccountId,
      companyAccountId: finalCompanyAccountId,
      branchId: validated.branchId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      notes: validated.notes,
      attachmentKey,
      attachmentName,
    })
    .eq('id', incomeId)

  if (uError) throw new Error(`Error al actualizar ingreso: ${uError.message}`)

  revalidatePath('/dashboard/ingresos')
  revalidateTag('dashboard')
  revalidatePath('/dashboard')
}

export async function getCompanyDataForIncome(companyId: number) {
    const supabase = await createClient()
    
    const { data: branches } = await (supabase.from('Branch') as any).select('id, name').eq('companyId', companyId).eq('isActive', true)
    
    return {
        branches: branches || []
    }
}
