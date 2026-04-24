"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { createUserSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"

export async function createUser(formData: FormData) {
  const userAdmin = await requireAuth()
  const supabase = createClient()
  
  if (userAdmin.role !== "SUPER_ADMIN") {
      throw new Error("Acceso denegado: Privilegio insuficiente.")
  }

  const validated = createUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId")
  })

  if (validated.role === "SUPER_ADMIN") {
      throw new Error("Violación de Seguridad: La creación de nuevos Super Administradores está inhabilitada desde el portal.")
  }

  // Chequear si el correo ya existe en nuestra tabla
  const { data: exist } = await supabase
    .from('User')
    .select('id')
    .eq('email', validated.email)
    .maybeSingle()

  if (exist) {
      throw new Error("Este correo ya está registrado en el sistema.")
  }

  // NOTA: Para que el usuario pueda loguearse, debe ser creado también en Supabase Auth.
  // Si tuviéramos la SERVICE_ROLE_KEY, podríamos hacerlo aquí mismo con supabase.auth.admin.createUser.
  // Por ahora lo creamos solo en nuestra tabla de perfiles.

  const { data: newUser, error } = await supabase
    .from('User')
    .insert({
      name: validated.name,
      email: validated.email,
      role: validated.role as any,
      companyId: validated.companyId ? Number(validated.companyId) : null,
      branchId: validated.branchId ? Number(validated.branchId) : null,
      isActive: true
    })
    .select()
    .single()

  if (error || !newUser) throw new Error(`Error crear usuario: ${error?.message}`)

  await recordAuditLog({
    action: "CREATE_USER",
    entity: "Acceso de Usuario",
    entityId: newUser.id,
    userId: userAdmin.profileId,
    companyId: newUser.companyId,
    details: { name: newUser.name, email: newUser.email, role: newUser.role }
  })

  revalidatePath('/dashboard/usuarios')
}

export async function updateUser(formData: FormData) {
  const userAdmin = await requireAuth()
  const supabase = createClient()
  if (userAdmin.role !== "SUPER_ADMIN") throw new Error("No autorizado")

  const userId = Number(formData.get("userId"))
  const name = formData.get("name") as string
  const role = formData.get("role") as any
  const companyId = formData.get("companyId") ? Number(formData.get("companyId")) : null
  const branchId = formData.get("branchId") ? Number(formData.get("branchId")) : null

  const { data: updated, error } = await supabase
    .from('User')
    .update({
      name,
      role,
      companyId,
      branchId
    })
    .eq('id', userId)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error actualizar usuario: ${error?.message}`)

  await recordAuditLog({
    action: "UPDATE_USER",
    entity: "Acceso de Usuario",
    entityId: updated.id,
    userId: userAdmin.profileId,
    companyId: updated.companyId,
    details: { name: updated.name, role: updated.role, email: updated.email }
  })

  revalidatePath('/dashboard/usuarios')
}

export async function toggleUserStatus(userId: number) {
  const userAdmin = await requireAuth()
  const supabase = createClient()
  if (userAdmin.role !== "SUPER_ADMIN") throw new Error("No autorizado")

  const { data: current, error: fError } = await supabase
    .from('User')
    .select('id, isActive, email, companyId')
    .eq('id', userId)
    .single()

  if (fError || !current) throw new Error("Usuario no encontrado")

  const { data: updated, error } = await supabase
    .from('User')
    .update({ isActive: !current.isActive })
    .eq('id', userId)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error toggle status: ${error?.message}`)

  await recordAuditLog({
    action: updated.isActive ? "ACTIVATE_USER" : "SUSPEND_USER",
    entity: "Acceso de Usuario",
    entityId: updated.id,
    userId: userAdmin.profileId,
    companyId: updated.companyId,
    details: { email: updated.email, status: updated.isActive ? 'Active' : 'Suspended' }
  })

  revalidatePath('/dashboard/usuarios')
}
