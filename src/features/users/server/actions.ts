"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { createUserSchema } from "../validations"
import { revalidatePath } from "next/cache"

export async function createUser(formData: FormData) {
  const userAdmin = await requireAuth()
  
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'tu-service-role-key-aqui') {
    throw new Error("Configuración incompleta: Se requiere la SUPABASE_SERVICE_ROLE_KEY para crear cuentas de acceso.")
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Crear en Supabase Auth primero
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true, // AUTO-CONFIRMAR para que puedan entrar de una
    user_metadata: { name: validated.name }
  })

  if (authError) throw new Error(`Error en Auth: ${authError.message}`)

  // 2. Crear en nuestra tabla 'User'
  const supabase = await createClient()
  const { data: newUser, error } = await supabase
    .from('User')
    .insert({
      authId: authUser.user.id,
      name: validated.name,
      email: validated.email,
      role: validated.role as any,
      companyId: validated.companyId ? Number(validated.companyId) : null,
      branchId: validated.branchId ? Number(validated.branchId) : null,
      isActive: true
    })
    .select()
    .single()

  if (error || !newUser) throw new Error(`Error crear perfil DB: ${error?.message}`)

  revalidatePath('/dashboard/usuarios')
}

export async function updateUser(formData: FormData) {
  const userAdmin = await requireAuth()
  const supabase = await createClient()
  if (userAdmin.role !== "SUPER_ADMIN") throw new Error("No autorizado")

  const userId = Number(formData.get("userId"))
  const name = formData.get("name") as string
  const role = formData.get("role") as any
  const companyId = formData.get("companyId") ? Number(formData.get("companyId")) : null
  const branchId = formData.get("branchId") ? Number(formData.get("branchId")) : null
  const password = formData.get("password") as string

  const { data: userProfile, error: pError } = await supabase
    .from('User')
    .select('authId, email')
    .eq('id', userId)
    .single()

  if (pError || !userProfile) throw new Error("Usuario no encontrado.")

  // 1. Manejo de Auth (Actualizar o Crear si no existe)
  if (password && password.length >= 6) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'tu-service-role-key-aqui') {
          throw new Error("Se requiere Service Role Key para esta acción.")
      }

      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      if (userProfile.authId) {
          // Existe en Auth: Actualizar
          const { error: authError } = await adminClient.auth.admin.updateUserById(
              userProfile.authId,
              { password: password }
          )
          if (authError) throw new Error(`Error Auth Update: ${authError.message}`)
      } else {
          // NO existe en Auth: Crear cuenta retroactivamente (Caso Cinthia)
          const { data: newAuth, error: authError } = await adminClient.auth.admin.createUser({
              email: userProfile.email,
              password: password,
              email_confirm: true,
              user_metadata: { name }
          })
          if (authError) throw new Error(`Error Auth Creation: ${authError.message}`)
          
          // Vincular el nuevo authId al perfil
          await supabase.from('User').update({ authId: newAuth.user.id }).eq('id', userId)
      }
  }

  // 2. Actualizar perfil local
  const { data: updated, error } = await supabase
    .from('User')
    .update({ name, role, companyId, branchId })
    .eq('id', userId)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error local: ${error?.message}`)

  revalidatePath('/dashboard/usuarios')
}

export async function toggleUserStatus(userId: number) {
  const userAdmin = await requireAuth()
  const supabase = await createClient()
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

  revalidatePath('/dashboard/usuarios')
}

