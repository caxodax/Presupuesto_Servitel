"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

/**
 * Motor de detección de alertas de presupuesto.
 * Evalúa una asignación y dispara notificaciones si se alcanzan umbrales críticos.
 */
export async function triggerBudgetAlerts(allocationId: number) {
  const supabase = await createClient()

  const { data: allocation, error } = await supabase
    .from('BudgetAllocation')
    .select(`
      *,
      companyAccount:CompanyAccount(
        globalAccount:GlobalAccount(code, name)
      ),
      budget:Budget(
        id,
        companyId,
        company:Company(name),
        branch:Branch(name)
      )
    `)
    .eq('id', allocationId)
    .single()

  if (error || !allocation) return

  const limitUSD = Number(allocation.amountUSD)
  const consumedUSD = Number(allocation.consumedUSD)
  const percent = limitUSD > 0 ? consumedUSD / limitUSD : 0

  const budgetInfo = (allocation as any).budget
  const companyId = budgetInfo.companyId
  const companyName = budgetInfo.company?.name || 'N/A'
  const branchName = budgetInfo.branch?.name || 'N/A'
  
  const account = (allocation as any).companyAccount?.globalAccount
  const rubroName = account 
    ? `${account.code} - ${account.name}`
    : 'Cuenta no definida'

  const locationInfo = `[${companyName} - ${branchName}]`

  // 1. Alerta de Exceso (100%+)
  if (consumedUSD > limitUSD) {
    const title = `Presupuesto Excedido: ${locationInfo} ${rubroName}`
    
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
          message: `En ${companyName} (${branchName}), el rubro ${rubroName} ha superado su límite de $${limitUSD.toLocaleString()}. Consumo actual: $${consumedUSD.toLocaleString()}.`
      })
    }
  } 
  // 2. Alerta de Advertencia (90%+)
  else if (percent >= 0.90) {
    const title = `Umbral Crítico (90%): ${locationInfo} ${rubroName}`
    
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
          message: `En ${companyName} (${branchName}), el rubro ${rubroName} ha alcanzado el 90% de su capacidad. Disponible: $${(limitUSD - consumedUSD).toLocaleString()}.`
      })
    }
  }
}

export async function markAlertAsRead(alertId: number) {
  const user = await requireAuth()
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  
  let query = supabase
    .from('Alert')
    .update({ isRead: true })
    .eq('isRead', false)

  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
    query = query.eq('companyId', user.companyId)
  }

  await query

  revalidatePath("/dashboard")
}

