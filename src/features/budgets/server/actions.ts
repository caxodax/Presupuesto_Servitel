"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { budgetSchema, allocationSchema, adjustmentSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { BudgetPeriodType } from "@prisma/client"

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

  await prisma.budget.create({
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

  if (existingAllocation) {
    await prisma.budgetAllocation.update({
      where: { id: existingAllocation.id },
      data: { amountUSD: validated.amountUSD },
    })
  } else {
    await prisma.budgetAllocation.create({
      data: {
        budgetId: validated.budgetId,
        categoryId: validated.categoryId,
        subcategoryId: validated.subcategoryId,
        amountUSD: validated.amountUSD,
        amountVES: 0,
      },
    })
  }

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

  revalidatePath(`/dashboard/presupuestos/${allocation.budgetId}`)
}
