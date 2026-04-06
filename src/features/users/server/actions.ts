"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { createUserSchema } from "../validations"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

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

  await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      passwordHash: passwordHash,
      role: validated.role,
      companyId: validated.companyId || null,
      branchId: validated.branchId || null
    }
  })

  revalidatePath('/dashboard/usuarios')
}
