"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

/**
 * Motor de detección de alertas de presupuesto.
 * Evalúa una asignación y dispara notificaciones si se alcanzan umbrales críticos.
 */
export async function triggerBudgetAlerts(allocationId: string, tx: any = prisma) {
  const allocation = await tx.budgetAllocation.findUnique({
    where: { id: allocationId },
    include: { 
      category: true,
      subcategory: true,
      budget: { include: { company: true } }
    }
  })

  if (!allocation) return

  const limitUSD = Number(allocation.amountUSD)
  const consumedUSD = Number(allocation.consumedUSD)
  const percent = consumedUSD / limitUSD

  const companyId = allocation.budget.companyId
  const rubroName = allocation.subcategory 
    ? `${allocation.category.name} > ${allocation.subcategory.name}`
    : allocation.category.name

  // 1. Alerta de Exceso (100%+)
  if (consumedUSD > limitUSD) {
    const title = `Presupuesto Excedido: ${rubroName}`
    
    // Evitar duplicados (no leídos) para el mismo rubro
    const existing = await tx.alert.findFirst({
      where: { companyId, title, isRead: false }
    })

    if (!existing) {
      await tx.alert.create({
        data: {
          companyId,
          type: "BUDGET_EXCEEDED",
          title,
          message: `El rubro ${rubroName} ha superado su límite de $${limitUSD.toLocaleString()}. Consumo actual: $${consumedUSD.toLocaleString()}.`
        }
      })
    }
  } 
  // 2. Alerta de Advertencia (90%+)
  else if (percent >= 0.90) {
    const title = `Umbral Crítico (90%): ${rubroName}`
    
    const existing = await tx.alert.findFirst({
      where: { companyId, title, isRead: false }
    })

    if (!existing) {
      await tx.alert.create({
        data: {
          companyId,
          type: "SYSTEM_WARNING",
          title,
          message: `El rubro ${rubroName} ha alcanzado el 90% de su capacidad. Disponible: $${(limitUSD - consumedUSD).toLocaleString()}.`
        }
      })
    }
  }
}

export async function markAlertAsRead(alertId: string) {
  const user = await requireAuth()
  
  // Solo permitimos marcar como leídas las alertas de la empresa del usuario
  // (O si es Super Admin puede todas)
  const alert = await prisma.alert.findUnique({ where: { id: alertId }})
  if (!alert) return

  if (user.role !== 'SUPER_ADMIN' && alert.companyId !== user.companyId) {
    throw new Error("No tienes permiso para gestionar esta alerta.")
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: { isRead: true }
  })

  revalidatePath("/dashboard")
}

export async function markAllAlertsAsRead() {
  const user = await requireAuth()
  
  const whereClause = user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }

  await prisma.alert.updateMany({
    where: { ...whereClause, isRead: false },
    data: { isRead: true }
  })

  revalidatePath("/dashboard")
}
