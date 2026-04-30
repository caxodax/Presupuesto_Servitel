"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, hasRole, enforceCompanyScope } from "@/lib/permissions"
import { companySchema, branchSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"

export async function createCompany(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
    
  const validated = companySchema.parse({ 
    name: formData.get("name") as string,
  })
  
  const { data: company, error } = await supabase
    .from('Company')
    .insert({ name: validated.name })
    .select()
    .single()

  if (error || !company) throw new Error(`Error crear empresa: ${error?.message}`)

  recordAuditLog({
    action: "CREATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: company.id,
    userId: user.profileId,
    details: { name: company.name }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function createBranch(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const targetId = formData.get("companyId") ? Number(formData.get("companyId")) : undefined;
  const scope = enforceCompanyScope(user, targetId)
  
  const validated = branchSchema.parse({ 
    name: formData.get("name") as string,
    companyId: scope.companyId!
  })

  const { data: branch, error } = await supabase
    .from('Branch')
    .insert({
      name: validated.name,
      companyId: validated.companyId
    })
    .select()
    .single()

  if (error || !branch) throw new Error(`Error crear sucursal: ${error?.message}`)

  recordAuditLog({
    action: "CREATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: branch.id,
    userId: user.profileId,
    companyId: branch.companyId,
    details: { name: branch.name }
  })
  
  revalidatePath("/dashboard/sucursales")
}

export async function updateCompany(companyId: number, formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
  
  const newName = formData.get("name") as string
  if (!newName || newName.trim().length === 0) throw new Error("El nombre no puede estar vacío.")

  const { data: company, error } = await supabase
    .from('Company')
    .update({ name: newName })
    .eq('id', companyId)
    .select()
    .single()

  if (error || !company) throw new Error(`Error actualizar empresa: ${error?.message}`)

  recordAuditLog({
    action: "UPDATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: company.id,
    userId: user.profileId,
    details: { newName: company.name }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function toggleCompanyStatus(companyId: number) {
  const user = await requireAuth()
  const supabase = createClient()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")

  const { data: current, error: fError } = await supabase
    .from('Company')
    .select('*')
    .eq('id', companyId)
    .single()

  if (fError || !current) throw new Error("Empresa no encontrada")

  const { data: updated, error } = await supabase
    .from('Company')
    .update({ isActive: !current.isActive })
    .eq('id', companyId)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error toggle empresa: ${error?.message}`)

  recordAuditLog({
    action: updated.isActive ? "ACTIVATE_COMPANY" : "DEACTIVATE_COMPANY",
    entity: "Entidad Jurídica",
    entityId: updated.id,
    userId: user.profileId,
    details: { status: updated.isActive ? "ACTIVA" : "SUSPENDIDA" }
  })
  
  revalidatePath("/dashboard/empresas")
}

export async function updateBranch(branchId: number, formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const { data: branchData, error: fError } = await supabase
    .from('Branch')
    .select('*')
    .eq('id', branchId)
    .single()

  if (fError || !branchData) throw new Error("Sucursal no encontrada")
  
  enforceCompanyScope(user, branchData.companyId)
  
  const newName = formData.get("name") as string
  if (!newName || newName.trim().length === 0) throw new Error("El nombre es requerido")

  const { data: updatedBranch, error } = await supabase
    .from('Branch')
    .update({ name: newName })
    .eq('id', branchId)
    .select()
    .single()

  if (error || !updatedBranch) throw new Error(`Error actualizar sucursal: ${error?.message}`)

  recordAuditLog({
    action: "UPDATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: updatedBranch.id,
    userId: user.profileId,
    companyId: updatedBranch.companyId,
    details: { newName: updatedBranch.name }
  })
  
  revalidatePath("/dashboard/sucursales")
}

export async function toggleBranchStatus(branchId: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const { data: current, error: fError } = await supabase
    .from('Branch')
    .select('*')
    .eq('id', branchId)
    .single()

  if (fError || !current) throw new Error("Sucursal no encontrada")
  
  enforceCompanyScope(user, current.companyId)

  const { data: updated, error } = await supabase
    .from('Branch')
    .update({ isActive: !current.isActive })
    .eq('id', branchId)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error toggle sucursal: ${error?.message}`)

  recordAuditLog({
    action: updated.isActive ? "ACTIVATE_BRANCH" : "DEACTIVATE_BRANCH",
    entity: "Sucursal Operativa",
    entityId: updated.id,
    userId: user.profileId,
    companyId: updated.companyId,
    details: { status: updated.isActive ? "ACTIVA" : "BAJA" }
  })
  
  revalidatePath("/dashboard/sucursales")
}
