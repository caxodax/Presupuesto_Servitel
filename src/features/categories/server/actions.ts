"use server"
import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { categorySchema, subcategorySchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"

export async function createCategory(formData: FormData) {
  const user = await requireAuth()
  const targetId = formData.get("companyId") as string | undefined;
  
  const scope = enforceCompanyScope(user, targetId)
  
  const validated = categorySchema.parse({ 
    name: formData.get("name"), 
    companyId: scope.companyId! 
  })
  
  const category = await prisma.category.create({
    data: { name: validated.name, companyId: validated.companyId }
  })

  await recordAuditLog({
    action: "CREATE_CATEGORY",
    entity: "Clasificación Contable",
    entityId: category.id,
    userId: user.id,
    companyId: category.companyId,
    details: { name: category.name }
  })
  
  revalidatePath("/dashboard/categorias")
}

export async function createSubcategory(formData: FormData) {
  const user = await requireAuth()
  
  const categoryId = formData.get("categoryId") as string;
  
  const parentCat = await prisma.category.findUnique({ where: { id: categoryId }})
  if(!parentCat) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, parentCat.companyId)
  
  const validated = subcategorySchema.parse({ 
    name: formData.get("name"), 
    categoryId: categoryId 
  })
  
  const sub = await prisma.subcategory.create({
    data: { name: validated.name, categoryId: validated.categoryId }
  })

  await recordAuditLog({
    action: "CREATE_SUBCATEGORY",
    entity: "Subclasificación Contable",
    entityId: sub.id,
    userId: user.id,
    companyId: parentCat.companyId,
    details: { name: sub.name, parent: parentCat.name }
  })
  
  revalidatePath("/dashboard/categorias")
}

export async function updateCategory(formData: FormData) {
  const user = await requireAuth()
  const id = formData.get("id") as string
  const name = formData.get("name") as string

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, category.companyId)

  const updated = await prisma.category.update({
    where: { id },
    data: { name }
  })

  await recordAuditLog({
    action: "UPDATE_CATEGORY",
    entity: "Clasificación Contable",
    entityId: updated.id,
    userId: user.id,
    companyId: updated.companyId,
    details: { oldName: category.name, newName: updated.name }
  })

  revalidatePath("/dashboard/categorias")
}

export async function toggleCategoryStatus(id: string) {
  const user = await requireAuth()
  
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, category.companyId)

  const newStatus = !category.isActive

  // Update category and ALL subcategories (cascade)
  await prisma.$transaction([
    prisma.category.update({
      where: { id },
      data: { isActive: newStatus }
    }),
    prisma.subcategory.updateMany({
      where: { categoryId: id },
      data: { isActive: newStatus }
    })
  ])

  await recordAuditLog({
    action: "TOGGLE_CATEGORY_STATUS",
    entity: "Clasificación Contable",
    entityId: category.id,
    userId: user.id,
    companyId: category.companyId,
    details: { name: category.name, newStatus: newStatus ? "ACTIVE" : "INACTIVE" }
  })

  revalidatePath("/dashboard/categorias")
}

export async function updateSubcategory(formData: FormData) {
  const user = await requireAuth()
  const id = formData.get("id") as string
  const name = formData.get("name") as string

  const sub = await prisma.subcategory.findUnique({ 
    where: { id },
    include: { category: true } 
  })
  if (!sub) throw new Error("La subcategoria no existe.")
  
  enforceCompanyScope(user, sub.category.companyId)

  const updated = await prisma.subcategory.update({
    where: { id },
    data: { name }
  })

  await recordAuditLog({
    action: "UPDATE_SUBCATEGORY",
    entity: "Subclasificación Contable",
    entityId: updated.id,
    userId: user.id,
    companyId: sub.category.companyId,
    details: { oldName: sub.name, newName: updated.name }
  })

  revalidatePath("/dashboard/categorias")
}

export async function toggleSubcategoryStatus(id: string) {
  const user = await requireAuth()
  
  const sub = await prisma.subcategory.findUnique({ 
    where: { id },
    include: { category: true }
  })
  if (!sub) throw new Error("La subcategoria no existe.")
  
  enforceCompanyScope(user, sub.category.companyId)

  const newStatus = !sub.isActive

  const updated = await prisma.subcategory.update({
    where: { id },
    data: { isActive: newStatus }
  })

  await recordAuditLog({
    action: "TOGGLE_SUBCATEGORY_STATUS",
    entity: "Subclasificación Contable",
    entityId: updated.id,
    userId: user.id,
    companyId: sub.category.companyId,
    details: { name: updated.name, newStatus: newStatus ? "ACTIVE" : "INACTIVE" }
  })

  revalidatePath("/dashboard/categorias")
}
