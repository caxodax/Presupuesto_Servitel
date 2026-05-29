import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function getIncomes(companyId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const whereClause = enforceCompanyScope(user)

  let query = (supabase.from('income_list_view') as any)
    .select('*', { count: 'planned' })
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
    query = query.eq('companyGroupId', Number(groupId))
  }

  const mapIncome = (i: any) => ({
    ...i,
    company: { name: i.companyName },
    registeredBy: { name: i.registeredByName },
    category: { name: i.categoryName },
    subcategory: i.subcategoryName ? { name: i.subcategoryName } : null,
    branch: i.branchName ? { name: i.branchName } : null,
    companyAccount: {
      globalAccount: {
        code: i.accountCode,
        name: i.accountName
      }
    }
  })

  if (page === undefined) {
    const { data, error } = await query
    if (error) throw new Error(`Error al obtener ingresos: ${error.message}`)
    const formatted = (data || []).map(mapIncome)
    return { items: formatted, total: formatted.length, pageCount: 1 }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener ingresos: ${error.message}`)
  }

  const formattedItems = (items || []).map(mapIncome)

  return {
    items: formattedItems,
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}

export async function getIncomeDetails(incomeId: number) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: income, error: incomeError } = await (supabase.from('Income') as any)
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
  
  enforceCompanyScope(user, (income as any).companyId)

  const { data: auditLogs } = await (supabase.from('AuditLog') as any)
    .select(`
      *,
      user:User(name, role)
    `)
    .eq('entity', "Ingreso")
    .eq('entityId', String(incomeId))
    .order('createdAt', { ascending: false })

  // Generar URL firmada para Cloudflare R2
  let attachmentUrl = null
  if ((income as any).attachmentKey) {
      try {
          const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: (income as any).attachmentKey,
          })
          attachmentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
      } catch (e) {
          console.error("Error generando Signed URL R2:", e)
      }
  }

  return {
    income: { ...(income as any), attachmentUrl },
    auditLogs: auditLogs || []
  }
}
