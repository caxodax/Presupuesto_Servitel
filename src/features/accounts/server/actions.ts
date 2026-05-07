"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

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

  revalidatePath('/dashboard/cuentas')
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

  revalidatePath('/dashboard/cuentas')
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

  revalidatePath('/dashboard/cuentas')
  return { success: true }
}

/**
 * Crea o actualiza un mapeo entre Categoría y Cuenta.
 */
export async function upsertCategoryMapping(mapping: { 
    companyId: number, 
    categoryId: number, 
    subcategoryId?: number | null, 
    accountId?: number | null,
    companyAccountId?: number | null
}) {
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
 * Intenta resolver un accountId (legacy) o companyAccountId a partir de una categoría.
 */
export async function resolveAccountFromCategory(params: { companyId: number, categoryId?: number | null, subcategoryId?: number | null }) {
  if (!params.categoryId) return { accountId: null, companyAccountId: null }
  
  const supabase = await createClient()
  
  let mapping = null
  
  // 1. Intentar con subcategoría específica
  if (params.subcategoryId) {
    const { data: subMap } = await supabase
      .from('CategoryAccountMapping')
      .select('accountId, companyAccountId')
      .eq('companyId', params.companyId)
      .eq('categoryId', params.categoryId)
      .eq('subcategoryId', params.subcategoryId)
      .single()
    
    mapping = subMap
  }
  
  // 2. Intentar con categoría base (subcategoryId is null)
  if (!mapping) {
    const { data: catMap } = await supabase
      .from('CategoryAccountMapping')
      .select('accountId, companyAccountId')
      .eq('companyId', params.companyId)
      .eq('categoryId', params.categoryId)
      .is('subcategoryId', null)
      .single()
    
    mapping = catMap
  }
    
  return {
    accountId: mapping?.accountId || null,
    companyAccountId: mapping?.companyAccountId || null
  }
}

/**
 * Acciones para GlobalAccount (Solo Super Admin)
 */
export async function createGlobalAccount(data: any) {
    const user = await requireAuth()
    const supabase = await createClient()

    if (user.role !== 'SUPER_ADMIN') throw new Error("No autorizado")

    const { data: account, error } = await supabase
        .from('GlobalAccount')
        .insert([{ ...data, updatedAt: new Date().toISOString() }])
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/cuentas')
    return account
}

export async function updateGlobalAccount(id: number, data: any) {
    const user = await requireAuth()
    const supabase = await createClient()

    if (user.role !== 'SUPER_ADMIN') throw new Error("No autorizado")

    const { data: account, error } = await supabase
        .from('GlobalAccount')
        .update({ ...data, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/cuentas')
    return account
}

export async function deleteGlobalAccount(id: number) {
    const user = await requireAuth()
    const supabase = await createClient()

    if (user.role !== 'SUPER_ADMIN') throw new Error("No autorizado")

    const { error } = await supabase
        .from('GlobalAccount')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/cuentas')
    return { success: true }
}

/**
 * Acciones para CompanyAccount (Activación y Overrides)
 */
export async function toggleCompanyAccount(params: { companyId: number, globalAccountId: number, isActive: boolean }) {
    const user = await requireAuth()
    const supabase = await createClient()

    if (user.role !== 'SUPER_ADMIN' && (user.role !== 'COMPANY_ADMIN' || Number(user.companyId) !== Number(params.companyId))) {
        throw new Error("No autorizado")
    }

    const { data, error } = await supabase
        .from('CompanyAccount')
        .upsert({
            companyId: params.companyId,
            globalAccountId: params.globalAccountId,
            isActive: params.isActive,
            updatedAt: new Date().toISOString()
        }, { onConflict: 'companyId,globalAccountId,branchId' })
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/cuentas')
    return data
}

export async function updateCompanyAccountOverrides(id: number, data: any) {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: ca, error: getError } = await supabase
        .from('CompanyAccount')
        .select('companyId')
        .eq('id', id)
        .single()
    
    if (getError || !ca) throw new Error("Cuenta no encontrada")
    if (user.role !== 'SUPER_ADMIN' && (user.role !== 'COMPANY_ADMIN' || Number(user.companyId) !== Number(ca.companyId))) {
        throw new Error("No autorizado")
    }

    const { data: updated, error } = await supabase
        .from('CompanyAccount')
        .update({ ...data, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/cuentas')
    return updated
}

export async function getGlobalAccounts() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('GlobalAccount')
        .select('*')
        .order('code')
    
    if (error) throw error
    return data || []
}

export async function getCompanyAccounts(companyId: number) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('CompanyAccount')
        .select(`
            *,
            globalAccount:GlobalAccount(*)
        `)
        .eq('companyId', companyId)
        .eq('isActive', true)
    
    if (error) throw error
    return data || []
}

