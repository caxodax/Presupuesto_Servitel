"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

/**
 * Motor de detección de alertas de presupuesto.
 * Evalúa una asignación y dispara notificaciones si se alcanzan umbrales críticos.
 */
export async function triggerBudgetAlerts(allocationId: number) {
  const supabase = createClient()

  const { data: allocation, error } = await supabase
    .from('BudgetAllocation')
    .select(`
      *,
      category:Category(name),
      subcategory:Subcategory(name),
      budget:Budget(companyId)
    `)
    .eq('id', allocationId)
    .single()

  if (error || !allocation) return

  const limitUSD = Number(allocation.amountUSD)
  const consumedUSD = Number(allocation.consumedUSD)
  const percent = limitUSD > 0 ? consumedUSD / limitUSD : 0

  const companyId = (allocation as any).budget.companyId
  const rubroName = allocation.subcategory 
    ? `${(allocation as any).category.name} > ${(allocation as any).subcategory.name}`
    : (allocation as any).category.name

  // 1. Alerta de Exceso (100%+)
  if (consumedUSD > limitUSD) {
    const title = `Presupuesto Excedido: ${rubroName}`
    
    // Evitar duplicados (no leídos)
    const { data: existing } = await supabase
      .from('Alert')
      .select('id')
      .eq('companyId', companyId)
      .eq('title', title)
      .eq('isRead', false)
      .maybeSingle()

    if (!existing) {
      await supabase.from('Alert').insert({
          companyId,
          type: "BUDGET_EXCEEDED",
          title,
          message: `El rubro ${rubroName} ha superado su límite de $${limitUSD.toLocaleString()}. Consumo actual: $${consumedUSD.toLocaleString()}.`
      })
    }
  } 
  // 2. Alerta de Advertencia (90%+)
  else if (percent >= 0.90) {
    const title = `Umbral Crítico (90%): ${rubroName}`
    
    const { data: existing } = await supabase
      .from('Alert')
      .select('id')
      .eq('companyId', companyId)
      .eq('title', title)
      .eq('isRead', false)
      .maybeSingle()

    if (!existing) {
      await supabase.from('Alert').insert({
          companyId,
          type: "SYSTEM_WARNING",
          title,
          message: `El rubro ${rubroName} ha alcanzado el 90% de su capacidad. Disponible: $${(limitUSD - consumedUSD).toLocaleString()}.`
      })
    }
  }
}

export async function markAlertAsRead(alertId: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const { data: alert } = await supabase
    .from('Alert')
    .select('companyId')
    .eq('id', alertId)
    .single()

  if (!alert) return

  if (user.role !== 'SUPER_ADMIN' && alert.companyId !== user.companyId) {
    throw new Error("No tienes permiso para gestionar esta alerta.")
  }

  await supabase
    .from('Alert')
    .update({ isRead: true })
    .eq('id', alertId)

  revalidatePath("/dashboard")
}

export async function markAllAlertsAsRead() {
  const user = await requireAuth()
  const supabase = createClient()
  
  let query = supabase
    .from('Alert')
    .update({ isRead: true })
    .eq('isRead', false)

  if (user.role !== 'SUPER_ADMIN') {
    query = query.eq('companyId', user.companyId)
  }

  await query

  revalidatePath("/dashboard")
}
