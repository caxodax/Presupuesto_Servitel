"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { incomeSchema } from "../validations"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function createIncome(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

  const validated = incomeSchema.parse({
    number: formData.get("number"),
    clientName: formData.get("clientName"),
    categoryId: Number(formData.get("categoryId")),
    subcategoryId: formData.get("subcategoryId") ? Number(formData.get("subcategoryId")) : null,
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

  const { data: inc, error: iError } = await supabase
    .from('Income')
    .insert({
      number: validated.number,
      clientName: validated.clientName,
      categoryId: validated.categoryId,
      subcategoryId: validated.subcategoryId,
      branchId: validated.branchId,
      amountUSD: validated.amountUSD,
      amountVES: calculatedVES,
      exchangeRate: validated.exchangeRate,
      date: new Date(validated.date).toISOString(),
      companyId: companyId,
      registeredById: user.profileId,
      notes: validated.notes,
      attachmentKey,
      attachmentName,
    })
    .select()
    .single()

  if (iError || !inc) throw new Error(`Error crear ingreso: ${iError?.message}`)

  await recordAuditLog({
    action: "CREATE_INCOME",
    entity: "Ingreso",
    entityId: inc.id,
    companyId: companyId,
    userId: user.profileId,
    details: { number: inc.number, amount: validated.amountUSD }
  })

  revalidatePath('/dashboard/ingresos')
  revalidatePath('/dashboard')
}

export async function deleteIncome(incomeId: number) {
    const user = await requireAuth()
    const supabase = createClient()

    const { data: income, error: fError } = await supabase
        .from('Income')
        .select('companyId, number')
        .eq('id', incomeId)
        .single()

    if (fError || !income) throw new Error("Ingreso no encontrado.")

    enforceCompanyScope(user, income.companyId)

    const { error: dError } = await supabase
        .from('Income')
        .delete()
        .eq('id', incomeId)

    if (dError) throw new Error(`Error al eliminar ingreso: ${dError.message}`)

    await recordAuditLog({
        action: "DELETE_INCOME",
        entity: "Ingreso",
        entityId: incomeId,
        companyId: income.companyId,
        userId: user.profileId,
        details: { number: income.number }
    })

    revalidatePath('/dashboard/ingresos')
    revalidatePath('/dashboard')
}

export async function getIncomeCategories(companyId?: number) {
    const supabase = createClient()
    let query = supabase
        .from('Category')
        .select('*, subcategories:Subcategory(*)')
        .eq('type', 'INCOME')
        .eq('isActive', true)
        .order('name')
    
    if (companyId) {
        query = query.eq('companyId', companyId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Error al obtener categorías de ingresos: ${error.message}`)
    return data
}
