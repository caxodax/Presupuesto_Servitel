"use server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { categorySchema, subcategorySchema } from "../validations"
import { revalidatePath } from "next/cache"
import { recordAuditLog } from "@/lib/audit"

export async function createCategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const targetId = formData.get("companyId") ? Number(formData.get("companyId")) : undefined;
  const scope = enforceCompanyScope(user, targetId)
  
  const validated = categorySchema.parse({ 
    name: formData.get("name"), 
    companyId: scope.companyId! 
  })
  
  const { data: category, error } = await supabase
    .from('Category')
    .insert({ name: validated.name, companyId: validated.companyId })
    .select()
    .single()

  if (error || !category) throw new Error(`Error crear categoría: ${error?.message}`)

  await recordAuditLog({
    action: "CREATE_CATEGORY",
    entity: "Clasificación Contable",
    entityId: category.id,
    userId: user.profileId,
    companyId: category.companyId,
    details: { name: category.name }
  })
  
  revalidatePath("/dashboard/categorias")
}

export async function createSubcategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const categoryId = Number(formData.get("categoryId"));
  
  const { data: parentCat, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId')
    .eq('id', categoryId)
    .single()

  if (fetchError || !parentCat) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, parentCat.companyId)
  
  const validated = subcategorySchema.parse({ 
    name: formData.get("name"), 
    categoryId: categoryId 
  })
  
  const { data: sub, error } = await supabase
    .from('Subcategory')
    .insert({ name: validated.name, categoryId: validated.categoryId })
    .select()
    .single()

  if (error || !sub) throw new Error(`Error crear subcategoría: ${error?.message}`)

  await recordAuditLog({
    action: "CREATE_SUBCATEGORY",
    entity: "Subclasificación Contable",
    entityId: sub.id,
    userId: user.profileId,
    companyId: parentCat.companyId,
    details: { name: sub.name, parent: parentCat.name }
  })
  
  revalidatePath("/dashboard/categorias")
}

export async function updateCategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const id = Number(formData.get("id"))
  const name = formData.get("name") as string

  const { data: category, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId')
    .eq('id', id)
    .single()

  if (fetchError || !category) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, category.companyId)

  const { data: updated, error } = await supabase
    .from('Category')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error actualizar categoría: ${error?.message}`)

  await recordAuditLog({
    action: "UPDATE_CATEGORY",
    entity: "Clasificación Contable",
    entityId: updated.id,
    userId: user.profileId,
    companyId: updated.companyId,
    details: { oldName: category.name, newName: updated.name }
  })

  revalidatePath("/dashboard/categorias")
}

export async function toggleCategoryStatus(id: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const { data: category, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId, isActive')
    .eq('id', id)
    .single()

  if (fetchError || !category) throw new Error("La categoria no existe.")
  
  enforceCompanyScope(user, category.companyId)

  const newStatus = !category.isActive

  // Actualización: En Supabase las transacciones se pueden hacer vía RPC o simplemente secuencial si el riesgo de inconsistencia es bajo,
  // pero aquí queremos asegurar que se actualicen las subcategorías.
  const { error: catUpdateError } = await supabase
    .from('Category')
    .update({ isActive: newStatus })
    .eq('id', id)

  if (catUpdateError) throw catUpdateError

  const { error: subUpdateError } = await supabase
    .from('Subcategory')
    .update({ isActive: newStatus })
    .eq('categoryId', id)

  if (subUpdateError) throw subUpdateError

  await recordAuditLog({
    action: "TOGGLE_CATEGORY_STATUS",
    entity: "Clasificación Contable",
    entityId: category.id,
    userId: user.profileId,
    companyId: category.companyId,
    details: { name: category.name, newStatus: newStatus ? "ACTIVE" : "INACTIVE" }
  })

  revalidatePath("/dashboard/categorias")
}

export async function updateSubcategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const id = Number(formData.get("id"))
  const name = formData.get("name") as string

  const { data: sub, error: fetchError } = await supabase
    .from('Subcategory')
    .select('*, Category(companyId)')
    .eq('id', id)
    .single()

  if (fetchError || !sub) throw new Error("La subcategoria no existe.")
  
  enforceCompanyScope(user, (sub as any).Category.companyId)

  const { data: updated, error } = await supabase
    .from('Subcategory')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error actualizar subcategoría: ${error?.message}`)

  await recordAuditLog({
    action: "UPDATE_SUBCATEGORY",
    entity: "Subclasificación Contable",
    entityId: updated.id,
    userId: user.profileId,
    companyId: (sub as any).Category.companyId,
    details: { oldName: sub.name, newName: updated.name }
  })

  revalidatePath("/dashboard/categorias")
}

export async function toggleSubcategoryStatus(id: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const { data: sub, error: fetchError } = await supabase
    .from('Subcategory')
    .select('*, Category(companyId)')
    .eq('id', id)
    .single()

  if (fetchError || !sub) throw new Error("La subcategoria no existe.")
  
  enforceCompanyScope(user, (sub as any).Category.companyId)

  const newStatus = !sub.isActive

  const { data: updated, error } = await supabase
    .from('Subcategory')
    .update({ isActive: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error toggle subcategoría: ${error?.message}`)

  await recordAuditLog({
    action: "TOGGLE_SUBCATEGORY_STATUS",
    entity: "Subclasificación Contable",
    entityId: updated.id,
    userId: user.profileId,
    companyId: (sub as any).Category.companyId,
    details: { name: updated.name, newStatus: newStatus ? "ACTIVE" : "INACTIVE" }
  })

  revalidatePath("/dashboard/categorias")
}
