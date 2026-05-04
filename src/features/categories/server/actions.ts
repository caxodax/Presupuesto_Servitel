"use server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { categorySchema, subcategorySchema } from "../validations"
import { revalidatePath } from "next/cache"


export async function createCategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Solo los Súper Administradores pueden crear categorías globales.")
  }
  
  const validated = categorySchema.parse({ 
    name: formData.get("name"), 
    type: formData.get("type"),
    companyId: undefined 
  })
  
  const { data: category, error } = await supabase
    .from('Category')
    .insert({ 
      name: validated.name, 
      type: validated.type as any,
      companyId: null 
    })
    .select()
    .single()

  if (error || !category) throw new Error(`Error crear categoría: ${error?.message}`)


  
  revalidatePath("/dashboard/categorias")
}

export async function createSubcategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Solo los Súper Administradores pueden gestionar la estructura global de categorías.")
  }

  const categoryId = Number(formData.get("categoryId"));
  
  const { data: parentCat, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId')
    .eq('id', categoryId)
    .single()

  if (fetchError || !parentCat) throw new Error("La categoria no existe.")
  
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


  
  revalidatePath("/dashboard/categorias")
}

export async function updateCategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Acceso denegado: Solo Súper Administradores.")
  }

  const id = Number(formData.get("id"))
  const name = formData.get("name") as string

  const { data: category, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId')
    .eq('id', id)
    .single()

  if (fetchError || !category) throw new Error("La categoria no existe.")
  
  const { data: updated, error } = await supabase
    .from('Category')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error actualizar categoría: ${error?.message}`)



  revalidatePath("/dashboard/categorias")
}

export async function toggleCategoryStatus(id: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Acceso denegado: Solo Súper Administradores.")
  }

  const { data: category, error: fetchError } = await supabase
    .from('Category')
    .select('id, name, companyId, isActive')
    .eq('id', id)
    .single()

  if (fetchError || !category) throw new Error("La categoria no existe.")
  
  const newStatus = !category.isActive

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



  revalidatePath("/dashboard/categorias")
}

export async function updateSubcategory(formData: FormData) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Acceso denegado.")
  }

  const id = Number(formData.get("id"))
  const name = formData.get("name") as string

  const { data: sub, error: fetchError } = await supabase
    .from('Subcategory')
    .select('*, Category(companyId)')
    .eq('id', id)
    .single()

  if (fetchError || !sub) throw new Error("La subcategoria no existe.")
  
  const { data: updated, error } = await supabase
    .from('Subcategory')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error actualizar subcategoría: ${error?.message}`)



  revalidatePath("/dashboard/categorias")
}

export async function toggleSubcategoryStatus(id: number) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error("Acceso denegado.")
  }

  const { data: sub, error: fetchError } = await supabase
    .from('Subcategory')
    .select('*, Category(companyId)')
    .eq('id', id)
    .single()

  if (fetchError || !sub) throw new Error("La subcategoria no existe.")
  
  const newStatus = !sub.isActive

  const { data: updated, error } = await supabase
    .from('Subcategory')
    .update({ isActive: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) throw new Error(`Error toggle subcategoría: ${error?.message}`)



  revalidatePath("/dashboard/categorias")
}
