"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { createUserSchema } from "../validations"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

import { recordAuditLog } from "@/lib/audit"

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

  // Bloquear clonación de super admins por inyección o por la fuerza
  if (validated.role === "SUPER_ADMIN") {
      throw new Error("Violación de Seguridad: La creación de nuevos Super Administradores está inhabilitada desde el portal. Solo es posible vía script en base de datos.")
  }

  // Chequear si el correo ya existe
  const exist = await prisma.user.findUnique({ where: { email: validated.email } })
  if (exist) {
      throw new Error("Este correo ya está registrado en el sistema.")
  }

  // Encriptar la contraseña (Bcrypt Hash)
  const salt = bcrypt.genSaltSync(10)
  const passwordHash = bcrypt.hashSync(validated.password, salt)

  const newUser = await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      passwordHash: passwordHash,
      role: validated.role,
      companyId: validated.companyId || null,
      branchId: validated.branchId || null
    }
  })

  await recordAuditLog({
    action: "CREATE_USER",
    entity: "Acceso de Usuario",
    entityId: newUser.id,
    userId: userAdmin.id,
    companyId: newUser.companyId,
    details: { name: newUser.name, email: newUser.email, role: newUser.role }
  })

  revalidatePath('/dashboard/usuarios')
}

export async function updateUser(formData: FormData) {
  const userAdmin = await requireAuth()
  if (userAdmin.role !== "SUPER_ADMIN") throw new Error("No autorizado")

  const userId = formData.get("userId") as string
  const name = formData.get("name") as string
  const role = formData.get("role") as any
  const companyId = formData.get("companyId") as string
  const branchId = formData.get("branchId") as string

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      role,
      companyId: companyId || null,
      branchId: branchId || null
    }
  })

  await recordAuditLog({
    action: "UPDATE_USER",
    entity: "Acceso de Usuario",
    entityId: updated.id,
    userId: userAdmin.id,
    companyId: updated.companyId,
    details: { name: updated.name, role: updated.role, email: updated.email }
  })

  revalidatePath('/dashboard/usuarios')
}

export async function toggleUserStatus(userId: string) {
  const userAdmin = await requireAuth()
  if (userAdmin.role !== "SUPER_ADMIN") throw new Error("No autorizado")

  const current = await prisma.user.findUnique({ where: { id: userId } })
  if (!current) throw new Error("Usuario no encontrado")

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !current.isActive }
  })

  await recordAuditLog({
    action: updated.isActive ? "ACTIVATE_USER" : "SUSPEND_USER",
    entity: "Acceso de Usuario",
    entityId: updated.id,
    userId: userAdmin.id,
    companyId: updated.companyId,
    details: { email: updated.email, status: updated.isActive ? 'Active' : 'Suspended' }
  })

  revalidatePath('/dashboard/usuarios')
}


