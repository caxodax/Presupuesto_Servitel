"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { revalidateTag } from "next/cache"

export async function createAccount(formData: any) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('AccountingAccount')
    .insert([{
      ...formData,
      companyId: user.companyId || formData.companyId,
      updatedAt: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidateTag('accounts')
  return data
}

export async function updateAccount(id: number, formData: any) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('AccountingAccount')
    .update({
      ...formData,
      updatedAt: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidateTag('accounts')
  return data
}

export async function deleteAccount(id: number) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from('AccountingAccount')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidateTag('accounts')
  return { success: true }
}

/**
 * Crea o actualiza un mapeo entre Categoría y Cuenta.
 */
export async function upsertCategoryMapping(mapping: { categoryId: number, subcategoryId?: number | null, accountId: number, companyId: number }) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('CategoryAccountMapping')
    .upsert({
      ...mapping,
      updatedAt: new Date().toISOString()
    }, { onConflict: 'companyId,categoryId,subcategoryId' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

/**
 * Intenta resolver un accountId a partir de una categoría si no se proporcionó uno.
 */
export async function resolveAccountFromCategory(params: { companyId: number, categoryId?: number | null, subcategoryId?: number | null }) {
  if (!params.categoryId) return null
  
  const supabase = await createClient()
  
  // 1. Intentar con subcategoría específica
  if (params.subcategoryId) {
    const { data: subMap } = await supabase
      .from('CategoryAccountMapping')
      .select('accountId')
      .eq('companyId', params.companyId)
      .eq('categoryId', params.categoryId)
      .eq('subcategoryId', params.subcategoryId)
      .single()
    
    if (subMap) return subMap.accountId
  }
  
  // 2. Intentar con categoría base (subcategoryId is null)
  const { data: catMap } = await supabase
    .from('CategoryAccountMapping')
    .select('accountId')
    .eq('companyId', params.companyId)
    .eq('categoryId', params.categoryId)
    .is('subcategoryId', null)
    .single()
    
  return catMap?.accountId || null
}
