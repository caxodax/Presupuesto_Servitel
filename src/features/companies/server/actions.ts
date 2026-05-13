"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth, hasRole, enforceCompanyScope } from "@/lib/permissions"
import { companySchema, branchSchema } from "../validations"
import { revalidatePath } from "next/cache"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"


export async function createCompany(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
    
  const validated = companySchema.parse({ 
    name: formData.get("name") as string,
    groupId: formData.get("groupId") as string,
    taxId: formData.get("taxId") as string,
    address: formData.get("address") as string,
    phone: formData.get("phone") as string,
    baseCurrency: formData.get("baseCurrency") as string || "USD",
  })
  
  const { data: company, error } = await supabase
    .from('Company')
    .insert({ 
        name: validated.name,
        groupId: validated.groupId,
        taxId: validated.taxId,
        address: validated.address,
        phone: validated.phone,
        baseCurrency: validated.baseCurrency
    })
    .select()
    .single()

  if (error || !company) throw new Error(`Error crear empresa: ${error?.message}`)

  // Procesar logo si existe
  const file = formData.get("logo") as File
  if (file && file.size > 0) {
    const logoUrl = `empresa_${company.id}/logo_${Date.now()}-${file.name.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: logoUrl,
      Body: buffer,
      ContentType: file.type,
    }))

    await supabase.from('Company').update({ logoUrl }).eq('id', company.id)
  }
  
  revalidatePath("/dashboard/empresas")
}

export async function createBranch(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  
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


  
  revalidatePath("/dashboard/sucursales")
}

export async function updateCompany(companyId: number, formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("Acceso denegado. Privilegios insuficientes.")
  
  const validated = companySchema.parse({
    name: formData.get("name") as string,
    groupId: formData.get("groupId") as string,
    taxId: formData.get("taxId") as string,
    address: formData.get("address") as string,
    phone: formData.get("phone") as string,
    baseCurrency: formData.get("baseCurrency") as string || "USD",
  })

  // Obtener empresa actual para mantener logo antiguo si no se sube uno nuevo
  const { data: oldCompany } = await supabase.from('Company').select('logoUrl').eq('id', companyId).single()
  let logoUrl = oldCompany?.logoUrl

  const file = formData.get("logo") as File
  if (file && file.size > 0) {
    logoUrl = `empresa_${companyId}/logo_${Date.now()}-${file.name.replace(/\s+/g, "_")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: logoUrl,
      Body: buffer,
      ContentType: file.type,
    }))
  }

  const { data: company, error } = await supabase
    .from('Company')
    .update({ 
        name: validated.name,
        groupId: validated.groupId,
        taxId: validated.taxId,
        address: validated.address,
        phone: validated.phone,
        baseCurrency: validated.baseCurrency,
        logoUrl: logoUrl
    })
    .eq('id', companyId)
    .select()
    .single()

  if (error || !company) throw new Error(`Error actualizar empresa: ${error?.message}`)
  
  revalidatePath("/dashboard/empresas")
}

export async function toggleCompanyStatus(companyId: number) {
  const user = await requireAuth()
  const supabase = await createClient()
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


  
  revalidatePath("/dashboard/empresas")
}

export async function updateBranch(branchId: number, formData: FormData) {
  const user = await requireAuth()
  const supabase = await createClient()
  
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


  
  revalidatePath("/dashboard/sucursales")
}

export async function toggleBranchStatus(branchId: number) {
  const user = await requireAuth()
  const supabase = await createClient()
  
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


  
  revalidatePath("/dashboard/sucursales")
}

export async function getBusinessGroups(onlyActive: boolean = false) {
    const user = await requireAuth()
    const supabase = await createClient()
    
    let query = supabase
        .from('BusinessGroup')
        .select('*')
        .order('name')
        
    if (onlyActive) {
        query = query.eq('isActive', true)
    }

    const { data, error } = await query
        
    if (error) throw new Error(`Error al obtener grupos: ${error.message}`)
    return data || []
}

export async function createBusinessGroup(formData: FormData) {
    const user = await requireAuth()
    const supabase = await createClient()
    if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("No tienes permisos")

    const name = formData.get("name") as string
    const description = formData.get("description") as string

    const { data, error } = await supabase
        .from('BusinessGroup')
        .insert({ name, description })
        .select()
        .single()

    if (error) throw new Error(`Error al crear matriz: ${error.message}`)



    revalidatePath("/dashboard/matrices")
    revalidatePath("/dashboard/empresas")
}

export async function updateBusinessGroup(id: number, formData: FormData) {
    const user = await requireAuth()
    const supabase = await createClient()
    if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("No tienes permisos")

    const name = formData.get("name") as string
    const description = formData.get("description") as string

    const { data, error } = await supabase
        .from('BusinessGroup')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`Error al actualizar matriz: ${error.message}`)



    revalidatePath("/dashboard/matrices")
    revalidatePath("/dashboard/empresas")
}

export async function toggleBusinessGroupStatus(id: number, currentStatus: boolean) {
    const user = await requireAuth()
    const supabase = await createClient()
    if (!hasRole(user.role, ["SUPER_ADMIN"])) throw new Error("No tienes permisos")

    const { data, error } = await supabase
        .from('BusinessGroup')
        .update({ isActive: !currentStatus })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`Error al cambiar estado: ${error.message}`)



    revalidatePath("/dashboard/matrices")
    revalidatePath("/dashboard/empresas")
}

