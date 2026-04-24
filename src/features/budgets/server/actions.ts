"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope, hasRole } from "@/lib/permissions"
import { budgetSchema, allocationSchema, adjustmentSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { BudgetPeriodType } from "@prisma/client"
import { recordAuditLog } from "@/lib/audit"
import { triggerBudgetAlerts } from "@/features/alerts/server/actions"

export async function createBudget(formData: FormData) {
  const user = await requireAuth()

  const validated = budgetSchema.parse({
    name: formData.get("name"),
    branchId: formData.get("branchId"),
    initialDate: formData.get("initialDate") as string,
    endDate: formData.get("endDate") as string,
    amountLimitUSD: formData.get("amountLimitUSD"),
  })

  const branch = await prisma.branch.findUnique({ where: { id: validated.branchId } })
  if (!branch) throw new Error("Sucursal inválida")

  enforceCompanyScope(user, branch.companyId)

  const budget = await prisma.budget.create({
    data: {
      name: validated.name,
      companyId: branch.companyId,
      branchId: validated.branchId,
      type: BudgetPeriodType.MONTHLY,
      initialDate: new Date(validated.initialDate),
      endDate: new Date(validated.endDate),
      amountLimitUSD: validated.amountLimitUSD,
    },
  })

  await recordAuditLog({
    action: "CREATE_BUDGET",
    entity: "Ciclo Presupuestario",
    entityId: budget.id,
    userId: user.id,
    companyId: budget.companyId,
    details: { name: budget.name, limit: Number(budget.amountLimitUSD) }
  })

  revalidatePath("/dashboard/presupuestos")
}

export async function upsertAllocation(formData: FormData) {
  const user = await requireAuth()

  const validated = allocationSchema.parse({
    budgetId: formData.get("budgetId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId") || null,
    amountUSD: formData.get("amountUSD"),
  })

  const budget = await prisma.budget.findUnique({ where: { id: validated.budgetId } })
  if (!budget) throw new Error("Presupuesto no encontrado")
  enforceCompanyScope(user, budget.companyId)

  const existingAllocation = await prisma.budgetAllocation.findFirst({
    where: {
      budgetId: validated.budgetId,
      categoryId: validated.categoryId,
      subcategoryId: validated.subcategoryId,
    }
  })

  let allocationId = ""

  if (existingAllocation) {
    await prisma.budgetAllocation.update({
      where: { id: existingAllocation.id },
      data: { amountUSD: validated.amountUSD },
    })
    allocationId = existingAllocation.id
  } else {
    const fresh = await prisma.budgetAllocation.create({
      data: {
        budgetId: validated.budgetId,
        categoryId: validated.categoryId,
        subcategoryId: validated.subcategoryId,
        amountUSD: validated.amountUSD,
        amountVES: 0,
      },
    })
    allocationId = fresh.id
  }

  await recordAuditLog({
    action: "UPSERT_ALLOCATION",
    entity: "Asignación de Rubro",
    entityId: allocationId,
    userId: user.id,
    companyId: budget.companyId,
    details: { budgetName: budget.name, amount: Number(validated.amountUSD) }
  })

  revalidatePath(`/dashboard/presupuestos/${validated.budgetId}`)
}

export async function registerAdjustment(formData: FormData) {
  const user = await requireAuth()

  const validated = adjustmentSchema.parse({
    allocationId: formData.get("allocationId"),
    amountUSD: formData.get("amountUSD"),
    reason: formData.get("reason"),
  })

  const allocation = await prisma.budgetAllocation.findUnique({
    where: { id: validated.allocationId },
    include: { budget: true },
  })
  if (!allocation) throw new Error("Asignación no encontrada")
  enforceCompanyScope(user, allocation.budget.companyId)

  await prisma.$transaction([
    prisma.budgetAdjustment.create({
      data: {
        allocationId: validated.allocationId,
        amountUSD: validated.amountUSD,
        amountVES: 0,
        reason: validated.reason,
        recordedById: user.id,
      },
    }),
    prisma.budgetAllocation.update({
      where: { id: validated.allocationId },
      data: {
        amountUSD: { increment: validated.amountUSD },
      },
    }),
  ])

  await recordAuditLog({
    action: "ADJUST_BUDGET",
    entity: "Ajuste Presupuestario",
    entityId: allocation.id,
    userId: user.id,
    companyId: allocation.budget.companyId,
    details: { reason: validated.reason, amount: Number(validated.amountUSD) }
  })

  // Disparar motor de alertas
  await triggerBudgetAlerts(validated.allocationId)

  revalidatePath(`/dashboard/presupuestos/${allocation.budgetId}`)
}

/**
 * Mueve fondos de una categoría a otra dentro del mismo presupuesto.
 * Restringido estrictamente a SUPER_ADMIN.
 */
export async function transferFunds(formData: FormData) {
  const user = await requireAuth()
  
  if (!hasRole(user.role, ["SUPER_ADMIN"])) {
    throw new Error("Seguridad: Solo un Super Administrador puede realizar transferencias de fondos entre rubros.")
  }

  const sourceId = formData.get("sourceAllocationId") as string
  const targetId = formData.get("targetAllocationId") as string
  const amount = Number(formData.get("amountUSD"))

  if (isNaN(amount) || amount <= 0) throw new Error("Monto de transferencia inválido.")
  if (sourceId === targetId) throw new Error("No puedes transferir fondos al mismo rubro.")

  const [source, target] = await Promise.all([
    prisma.budgetAllocation.findUnique({ where: { id: sourceId }, include: { budget: true } }),
    prisma.budgetAllocation.findUnique({ where: { id: targetId }, include: { budget: true } })
  ])

  if (!source || !target) throw new Error("Uno de los rubros no existe.")
  if (source.budgetId !== target.budgetId) throw new Error("Los rubros deben pertenecer al mismo ciclo presupuestario.")

  if (Number(source.amountUSD) < amount) {
    throw new Error(`Fondos insuficientes en el origen. Disponible: $${source.amountUSD}`)
  }

  await prisma.$transaction([
    prisma.budgetAllocation.update({
      where: { id: sourceId },
      data: { amountUSD: { decrement: amount } }
    }),
    prisma.budgetAllocation.update({
      where: { id: targetId },
      data: { amountUSD: { increment: amount } }
    }),
    prisma.auditLog.create({
      data: {
        action: "TRANSFER_FUNDS",
        entity: "Transferencia Interna",
        entityId: source.budgetId,
        userId: user.id,
        companyId: source.budget.companyId,
        details: {
          from: sourceId,
          to: targetId,
          amount: amount,
          reason: "Transferencia manual autorizada por Super Admin"
        }
      }
    })
  ])

  // Disparar motor de alertas en ambos rubros (uno bajó presupuesto, otro subió)
  await Promise.all([
    triggerBudgetAlerts(sourceId),
    triggerBudgetAlerts(targetId)
  ])

  revalidatePath(`/dashboard/presupuestos/${source.budgetId}`)
}

export async function updateBudgetMaster(formData: FormData) {
  const user = await requireAuth()
  const id = formData.get("budgetId") as string
  const newLimit = Number(formData.get("amountLimitUSD"))

  if (isNaN(newLimit) || newLimit < 0) throw new Error("Monto inválido.")

  // 1. Obtener presupuesto actual con distribuciones
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { allocations: true }
  })

  if (!budget) throw new Error("Presupuesto no encontrado.")
  enforceCompanyScope(user, budget.companyId)

  // 2. Validar que no se reduzca por debajo de lo ya asignado a categorías
  const totalAllocated = budget.allocations.reduce((acc, a) => acc + Number(a.amountUSD), 0)

  if (newLimit < totalAllocated) {
    throw new Error(`Inconsistencia detectada: El nuevo límite ($${newLimit.toLocaleString()}) es inferior al monto que ya ha distribuido entre las categorías ($${totalAllocated.toLocaleString()}). Por favor, reduzca primero las asignaciones individuales antes de bajar el techo maestro.`)
  }

  // 3. Actualizar
  const updated = await prisma.budget.update({
    where: { id },
    data: { amountLimitUSD: newLimit }
  })

  // 4. Log Forense de alto nivel
  await recordAuditLog({
    action: "UPDATE_BUDGET_MASTER",
    entity: "Presupuesto Maestro",
    entityId: updated.id,
    userId: user.id,
    companyId: updated.companyId,
    details: { 
      oldLimit: Number(budget.amountLimitUSD), 
      newLimit: Number(updated.amountLimitUSD),
      difference: Number(updated.amountLimitUSD) - Number(budget.amountLimitUSD),
      reason: "Actualización de techo global operativa"
    }
  })

  revalidatePath(`/dashboard/presupuestos/${id}`)
  revalidatePath("/dashboard/presupuestos")
}
