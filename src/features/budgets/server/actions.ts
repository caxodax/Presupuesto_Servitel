"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, hasRole } from "@/lib/permissions"
import { budgetSchema, allocationSchema, adjustmentSchema } from "../validations"
import { validateAccountForBudget } from "@/features/accounts/server/validations"
import { resolveAccountFromCategory } from "@/features/accounts/server/actions"
import { revalidatePath } from "next/cache"

import { triggerBudgetAlerts } from "@/features/alerts/server/actions"

export async function createBudget(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const validated = budgetSchema.parse({
    name: formData.get("name"),
    branchId: formData.get("branchId"),
    initialDate: formData.get("initialDate") as string,
    endDate: formData.get("endDate") as string,
    amountLimitUSD: formData.get("amountLimitUSD"),
  })

  // Obtener sucursal para validar scope
  const { data: branch, error: bError } = await supabase
    .from('Branch')
    .select('companyId')
    .eq('id', validated.branchId)
    .single()

  if (bError || !branch) throw new Error("Sucursal inválida")

  enforceCompanyScope(user, branch.companyId)

  const { data: budget, error } = await supabase
    .from('Budget')
    .insert({
      name: validated.name,
      companyId: branch.companyId,
      branchId: validated.branchId,
      type: 'MONTHLY',
      initialDate: new Date(validated.initialDate).toISOString(),
      endDate: new Date(validated.endDate).toISOString(),
      amountLimitUSD: validated.amountLimitUSD,
    })
    .select()
    .single()

  if (error || !budget) throw new Error(`Error crear presupuesto: ${error?.message}`)

  revalidatePath("/dashboard/presupuestos")
}

export async function upsertAllocation(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const validated = allocationSchema.parse({
    budgetId: formData.get("budgetId"),
    categoryId: formData.get("categoryId") || null,
    subcategoryId: formData.get("subcategoryId") || null,
    accountId: formData.get("accountId") || null,
    amountUSD: formData.get("amountUSD"),
  })

  const { data: budget, error: bError } = await supabase
    .from('Budget')
    .select('id, name, companyId')
    .eq('id', validated.budgetId)
    .single()

  if (bError || !budget) throw new Error("Presupuesto no encontrado")
  enforceCompanyScope(user, budget.companyId)

  // Resolución automática si no viene cuenta pero sí categoría
  let finalAccountId = validated.accountId
  if (!finalAccountId && validated.categoryId) {
    finalAccountId = await resolveAccountFromCategory({
        companyId: budget.companyId,
        categoryId: validated.categoryId
    })
  }

  if (finalAccountId) {
    await validateAccountForBudget(finalAccountId)
  }

  // Verificamos si ya existe por cuenta o categoría
  let q = supabase
    .from('BudgetAllocation')
    .select('id')
    .eq('budgetId', validated.budgetId)
  
  if (finalAccountId) {
    q = q.eq('accountId', finalAccountId)
  } else {
    q = q.eq('categoryId', validated.categoryId)
    if (validated.subcategoryId) q = q.eq('subcategoryId', validated.subcategoryId)
    else q = q.is('subcategoryId', null)
  }

  const { data: existingAllocation } = await q.maybeSingle()

  let allocationId: number

  if (existingAllocation) {
    const { data: updated, error: uError } = await supabase
      .from('BudgetAllocation')
      .update({ amountUSD: validated.amountUSD })
      .eq('id', existingAllocation.id)
      .select()
      .single()
    
    if (uError || !updated) throw uError
    allocationId = updated.id
  } else {
    const { data: fresh, error: iError } = await supabase
      .from('BudgetAllocation')
      .insert({
        budgetId: validated.budgetId,
        categoryId: validated.categoryId,
        subcategoryId: validated.subcategoryId,
        accountId: finalAccountId,
        amountUSD: validated.amountUSD,
        amountVES: 0,
      })
      .select()
      .single()
    
    if (iError || !fresh) throw iError
    allocationId = fresh.id
  }

  revalidatePath(`/dashboard/presupuestos/${validated.budgetId}`)
}

export async function registerAdjustment(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const validated = adjustmentSchema.parse({
    allocationId: formData.get("allocationId"),
    amountUSD: formData.get("amountUSD"),
    reason: formData.get("reason"),
  })

  const { data: allocation, error: aError } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(id, companyId)')
    .eq('id', validated.allocationId)
    .single()

  if (aError || !allocation) throw new Error("Asignación no encontrada")
  enforceCompanyScope(user, (allocation as any).budget.companyId)

  const { error: adjError } = await supabase
    .from('BudgetAdjustment')
    .insert({
      allocationId: validated.allocationId,
      amountUSD: validated.amountUSD,
      amountVES: 0,
      reason: validated.reason,
      recordedById: user.profileId,
    })

  if (adjError) throw adjError

  const newAmount = Number(allocation.amountUSD) + validated.amountUSD
  const { error: allocUpdateError } = await supabase
    .from('BudgetAllocation')
    .update({ amountUSD: newAmount })
    .eq('id', validated.allocationId)

  if (allocUpdateError) throw allocUpdateError

  await triggerBudgetAlerts(validated.allocationId)

  revalidatePath(`/dashboard/presupuestos/${(allocation as any).budget.id}`)
}

export async function transferFunds(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  if (!hasRole(user.role, ["SUPER_ADMIN"])) {
    throw new Error("Seguridad: Solo un Super Administrador puede realizar transferencias de fondos entre rubros.")
  }

  const sourceId = Number(formData.get("sourceAllocationId"))
  const targetId = Number(formData.get("targetAllocationId"))
  const amount = Number(formData.get("amountUSD"))

  if (isNaN(amount) || amount <= 0) throw new Error("Monto de transferencia inválido.")
  if (sourceId === targetId) throw new Error("No puedes transferir fondos al mismo rubro.")

  const { data: source, error: sError } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(id, companyId)')
    .eq('id', sourceId)
    .single()

  const { data: target, error: tError } = await supabase
    .from('BudgetAllocation')
    .select('*, budget:Budget(id, companyId)')
    .eq('id', targetId)
    .single()

  if (sError || tError || !source || !target) throw new Error("Uno de los rubros no existe.")
  if (source.budgetId !== target.budgetId) throw new Error("Los rubros deben pertenecer al mismo ciclo presupuestario.")

  if (Number(source.amountUSD) < amount) {
    throw new Error(`Fondos insuficientes en el origen. Disponible: $${source.amountUSD}`)
  }

  // Decrement source
  await supabase.from('BudgetAllocation').update({ amountUSD: Number(source.amountUSD) - amount }).eq('id', sourceId)
  // Increment target
  await supabase.from('BudgetAllocation').update({ amountUSD: Number(target.amountUSD) + amount }).eq('id', targetId)

  await Promise.all([
    triggerBudgetAlerts(sourceId),
    triggerBudgetAlerts(targetId)
  ])

  revalidatePath(`/dashboard/presupuestos/${source.budgetId}`)
}

export async function updateBudgetMaster(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()

  const id = Number(formData.get("budgetId"))
  const newLimit = Number(formData.get("amountLimitUSD"))

  if (isNaN(newLimit) || newLimit < 0) throw new Error("Monto inválido.")

  const { data: budget, error: bError } = await supabase
    .from('Budget')
    .select('*, allocations:BudgetAllocation(amountUSD)')
    .eq('id', id)
    .single()

  if (bError || !budget) throw new Error("Presupuesto no encontrado.")
  enforceCompanyScope(user, budget.companyId)

  const totalAllocated = (budget as any).allocations.reduce((acc: number, a: any) => acc + Number(a.amountUSD), 0)

  if (newLimit < totalAllocated) {
    throw new Error(`Inconsistencia detectada: El nuevo límite ($${newLimit.toLocaleString()}) es inferior al monto ya distribuido ($${totalAllocated.toLocaleString()}).`)
  }

  const { error: uError } = await supabase
    .from('Budget')
    .update({ amountLimitUSD: newLimit })
    .eq('id', id)

  if (uError) throw uError

  revalidatePath(`/dashboard/presupuestos/${id}`)
  revalidatePath("/dashboard/presupuestos")
}

export async function getAllocationsForCompany(companyId: number) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  // Validar permisos
  if (user.role !== "SUPER_ADMIN" && Number(user.companyId) !== Number(companyId)) {
    throw new Error("No autorizado para ver presupuestos de esta empresa")
  }

  const { data: budgets, error } = await supabase
    .from('Budget')
    .select(`
      id, name,
      branch:Branch(id, name, company:Company(name)),
      allocations:BudgetAllocation(
        id, amountUSD, consumedUSD,
        category:Category(name),
        subcategory:Subcategory(name),
        account:AccountingAccount(code, name)
      )
    `)
    .eq('companyId', companyId)
    .eq('status', 'ACTIVE')

  if (error) throw new Error("Error obteniendo presupuestos")

  const availableAllocations = (budgets || []).flatMap((b: any) => 
      (b.allocations || []).map((a: any) => ({ 
          id: a.id, 
          label: `${user.role === "SUPER_ADMIN" ? `[${b.branch.company.name}] ` : ''}${b.name} (${b.branch.name}) - ${a.account ? `${a.account.code} ${a.account.name}` : `${a.category?.name}${a.subcategory ? ` > ${a.subcategory.name}` : ''}`}`,
          remainingUSD: Number(a.amountUSD) - Number(a.consumedUSD)
      }))
  )

  return availableAllocations
}
