import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function getIncomes(companyId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const whereClause = enforceCompanyScope(user)

  let query = supabase
    .from('Income')
    .select(`
      *,
      company:Company(name),
      registeredBy:User(name),
      category:Category(name),
      subcategory:Subcategory(name),
      branch:Branch(name),companyAccount:CompanyAccount(globalAccount:GlobalAccount(code,name))
    `, { count: 'exact' })
    .order('date', { ascending: false })

  if (whereClause.companyId) {
    query = query.eq('companyId', whereClause.companyId)
  } else if (companyId) {
    query = query.eq('companyId', Number(companyId))
  }

  if (queryParam) {
    query = query.or(`number.ilike.%${queryParam}%,clientName.ilike.%${queryParam}%`)
  }

  if (groupId) {
    query = query.filter('company.groupId', 'eq', Number(groupId))
  }

  if (page === undefined) {
    const { data, error } = await query
    if (error) throw new Error(`Error al obtener ingresos: ${error.message}`)
    return { items: data || [], total: (data || []).length, pageCount: 1 }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener ingresos: ${error.message}`)
  }

  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}

export async function getIncomeDetails(incomeId: number) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: income, error: incomeError } = await supabase
    .from('Income')
    .select(`
      *,
      company:Company(name),
      registeredBy:User(name),
      category:Category(name),
      subcategory:Subcategory(name),
      branch:Branch(name),companyAccount:CompanyAccount(globalAccount:GlobalAccount(code,name))
    `)
    .eq('id', incomeId)
    .single()

  if (incomeError || !income) throw new Error("Ingreso no encontrado")
  
  enforceCompanyScope(user, income.companyId)

  const { data: auditLogs } = await supabase
    .from('AuditLog')
    .select(`
      *,
      user:User(name, role)
    `)
    .eq('entity', "Ingreso")
    .eq('entityId', String(incomeId))
    .order('createdAt', { ascending: false })

  // Generar URL firmada para Cloudflare R2
  let attachmentUrl = null
  if (income.attachmentKey) {
      try {
          const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: income.attachmentKey,
          })
          attachmentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
      } catch (e) {
          console.error("Error generando Signed URL R2:", e)
      }
  }

  return {
    income: { ...income, attachmentUrl },
    auditLogs: auditLogs || []
  }
}


