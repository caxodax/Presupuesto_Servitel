"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, hasRole, enforceCompanyScope } from "@/lib/permissions"
import { companySchema, branchSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"

export async function createCompany(formData: FormData) {
  const user = await requireAuth()
  
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
    
  const data = { 
    name: formData.get("name") as string,
  }
  
  const validated = companySchema.parse(data)
  
  const company = await prisma.company.create({
    data: { name: validated.name }
  })

  await recordAuditLog({
    action: "CREATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: company.id,
    userId: user.id,
    details: { name: company.name }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function createBranch(formData: FormData) {
  const user = await requireAuth()
  
  const targetId = formData.get("companyId") as string | undefined;
  const scope = enforceCompanyScope(user, targetId)
  
  const data = { 
    name: formData.get("name") as string,
    companyId: scope.companyId!
  }
  
  const validated = branchSchema.parse(data)

  const branch = await prisma.branch.create({
    data: {
      name: validated.name,
      companyId: validated.companyId
    }
  })

  await recordAuditLog({
    action: "CREATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: branch.id,
    userId: user.id,
    companyId: branch.companyId,
    details: { name: branch.name }
  })
  
  revalidatePath("/dashboard/sucursales")
}

export async function updateCompany(companyId: string, formData: FormData) {
  const user = await requireAuth()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
  
  const newName = formData.get("name") as string
  if (!newName || newName.trim().length === 0) throw new Error("El nombre no puede estar vacío.")

  const company = await prisma.company.update({
    where: { id: companyId },
    data: { name: newName }
  })

  await recordAuditLog({
    action: "UPDATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: company.id,
    userId: user.id,
    details: { newName: company.name }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function toggleCompanyStatus(companyId: string) {
  const user = await requireAuth()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")

  const current = await prisma.company.findUnique({ where: { id: companyId } })
  if (!current) throw new Error("Empresa no encontrada")

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { isActive: !current.isActive }
  })

  await recordAuditLog({
    action: updated.isActive ? "ACTIVATE_COMPANY" : "DEACTIVATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: updated.id,
    userId: user.id,
    details: { status: updated.isActive ? "ACTIVA" : "SUSPENDIDA" }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function updateBranch(branchId: string, formData: FormData) {
  const user = await requireAuth()
  
  const branchData = await prisma.branch.findUnique({ where: { id: branchId } })
  if (!branchData) throw new Error("Sucursal no encontrada")
  
  enforceCompanyScope(user, branchData.companyId)
  
  const newName = formData.get("name") as string
  if (!newName || newName.trim().length === 0) throw new Error("El nombre es requerido")

  const updatedBranch = await prisma.branch.update({
    where: { id: branchId },
    data: { name: newName }
  })

  await recordAuditLog({
    action: "UPDATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: updatedBranch.id,
    userId: user.id,
    companyId: updatedBranch.companyId,
    details: { newName: updatedBranch.name }
  })
  
  revalidatePath("/dashboard/sucursales")
}

export async function toggleBranchStatus(branchId: string) {
  const user = await requireAuth()
  
  const current = await prisma.branch.findUnique({ where: { id: branchId } })
  if (!current) throw new Error("Sucursal no encontrada")
  
  enforceCompanyScope(user, current.companyId)

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: { isActive: !current.isActive }
  })

  await recordAuditLog({
    action: updated.isActive ? "ACTIVATE_BRANCH" : "DEACTIVATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: updated.id,
    userId: user.id,
    companyId: updated.companyId,
    details: { status: updated.isActive ? "ACTIVA" : "BAJA" }
  })
  
  revalidatePath("/dashboard/sucursales")
}
