"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, hasRole, enforceCompanyScope } from "@/lib/permissions"
import { companySchema, branchSchema } from "../validations"
import { revalidatePath } from "next/cache"

export async function createCompany(formData: FormData) {
  const user = await requireAuth()
  
  // RLS Manual crítico, la creación raiz requiere rol global.
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
    
  const data = { 
    name: formData.get("name") as string,
  }
  
  const validated = companySchema.parse(data)
  
  await prisma.company.create({
    data: { name: validated.name }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function createBranch(formData: FormData) {
  const user = await requireAuth()
  
  // Cruza el validador estricto para cerciorarse de qué empresa será asignada
  const targetId = formData.get("companyId") as string | undefined;
  const scope = enforceCompanyScope(user, targetId)
  
  const data = { 
    name: formData.get("name") as string,
    companyId: scope.companyId! // Fallará arriba si es undefined para un admin no-G
  }
  
  const validated = branchSchema.parse(data)

  await prisma.branch.create({
    data: {
      name: validated.name,
      companyId: validated.companyId
    }
  })
  
  revalidatePath("/dashboard/sucursales")
}

export async function updateCompany(companyId: string, formData: FormData) {
  const user = await requireAuth()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
  
  const newName = formData.get("name") as string
  if (!newName || newName.trim().length === 0) throw new Error("El nombre no puede estar vacío.")

  await prisma.company.update({
    where: { id: companyId },
    data: { name: newName }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function toggleCompanyStatus(companyId: string) {
  const user = await requireAuth()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")

  const current = await prisma.company.findUnique({ where: { id: companyId } })
  if (!current) throw new Error("Empresa no encontrada")

  await prisma.company.update({
    where: { id: companyId },
    data: { isActive: !current.isActive }
  })
  
  revalidatePath("/dashboard/empresas")
}
