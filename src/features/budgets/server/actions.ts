"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope, hasRole } from "@/lib/permissions"
import { budgetSchema, allocationSchema, adjustmentSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"

export async function createBudget(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

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

  await recordAuditLog({
    action: "CREATE_BUDGET",
    entity: "Ciclo Presupuestario",
    entityId: budget.id,
    userId: user.profileId,
    companyId: budget.companyId,
    details: { name: budget.name, limit: Number(budget.amountLimitUSD) }
  })

  revalidatePath("/dashboard/presupuestos")
}

export async function upsertAllocation(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

  const validated = allocationSchema.parse({
    budgetId: formData.get("budgetId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId") || null,
    amountUSD: formData.get("amountUSD"),
  })

  const { data: budget, error: bError } = await supabase
    .from('Budget')
    .select('id, name, companyId')
    .eq('id', validated.budgetId)
    .single()

  if (bError || !budget) throw new Error("Presupuesto no encontrado")
  enforceCompanyScope(user, budget.companyId)

  // Verificamos si ya existe
  let q = supabase
    .from('BudgetAllocation')
    .select('id')
    .eq('budgetId', validated.budgetId)
    .eq('categoryId', validated.categoryId)

  if (validated.subcategoryId) q = q.eq('subcategoryId', validated.subcategoryId)
  else q = q.is('subcategoryId', null)

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
        amountUSD: validated.amountUSD,
        amountVES: 0,
      })
      .select()
      .single()
    
    if (iError || !fresh) throw iError
    allocationId = fresh.id
  }

  await recordAuditLog({
    action: "UPSERT_ALLOCATION",
    entity: "Asignación de Rubro",
    entityId: allocationId,
    userId: user.profileId,
    companyId: budget.companyId,
    details: { budgetName: budget.name, amount: Number(validated.amountUSD) }
  })

  revalidatePath(`/dashboard/presupuestos/${validated.budgetId}`)
}

export async function registerAdjustment(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

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

  // En Supabase directo, si no usamos RPC para transacciones, hacemos secuencial o paralelizamos si es posible.
  // Pero lo ideal es un RPC si queremos atomicidad exacta. 
  // Por ahora, lo haremos secuencial para mantenerlo simple.

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

  // Incremento manual (Supabase no tiene increment directo en el cliente sin RPC fácilmente, 
  // pero podemos usar rpc('increment', { ... }) si creamos la función en postgres, 
  // o simplemente calcular y actualizar.)
  const newAmount = Number(allocation.amountUSD) + validated.amountUSD
  const { error: allocUpdateError } = await supabase
    .from('BudgetAllocation')
    .update({ amountUSD: newAmount })
    .eq('id', validated.allocationId)

  if (allocUpdateError) throw allocUpdateError

  await recordAuditLog({
    action: "ADJUST_BUDGET",
    entity: "Ajuste Presupuestario",
    entityId: allocation.id,
    userId: user.profileId,
    companyId: (allocation as any).budget.companyId,
    details: { reason: validated.reason, amount: Number(validated.amountUSD) }
  })

  await triggerBudgetAlerts(validated.allocationId)

  revalidatePath(`/dashboard/presupuestos/${(allocation as any).budget.id}`)
}

export async function transferFunds(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
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

  await recordAuditLog({
    action: "TRANSFER_FUNDS",
    entity: "Transferencia Interna",
    entityId: source.budgetId,
    userId: user.profileId,
    companyId: (source as any).budget.companyId,
    details: { from: sourceId, to: targetId, amount: amount, reason: "Transferencia manual autorizada por Super Admin" }
  })

  await Promise.all([
    triggerBudgetAlerts(sourceId),
    triggerBudgetAlerts(targetId)
  ])

  revalidatePath(`/dashboard/presupuestos/${source.budgetId}`)
}

export async function updateBudgetMaster(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()

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

  await recordAuditLog({
    action: "UPDATE_BUDGET_MASTER",
    entity: "Presupuesto Maestro",
    entityId: id,
    userId: user.profileId,
    companyId: budget.companyId,
    details: { oldLimit: Number(budget.amountLimitUSD), newLimit, reason: "Actualización de techo global operativa" }
  })

  revalidatePath(`/dashboard/presupuestos/${id}`)
  revalidatePath("/dashboard/presupuestos")
}
