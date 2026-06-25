import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { measureAsync } from "@/lib/perf"

export async function getIncomes(companyId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  return measureAsync("getIncomes", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const whereClause = enforceCompanyScope(user)

    const targetCompanyId = whereClause.companyId || (companyId ? Number(companyId) : null)
    const targetGroupId = groupId ? Number(groupId) : null
    
    const actualPage = page === undefined ? 1 : page
    const actualLimit = page === undefined ? 1000 : limit
    const from = (actualPage - 1) * actualLimit

    const { data: items, error } = await (supabase.rpc as any)('rpc_get_income_list', {
      p_company_id: targetCompanyId,
      p_group_id: targetGroupId,
      p_search: queryParam || null,
      p_limit: actualLimit,
      p_offset: from
    })

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

    if (error) {
      throw new Error(`Error al obtener ingresos: ${error.message}`)
    }

    const formattedItems = (items || []).map(mapIncome)
    const count = items && items.length > 0 ? Number(items[0].total_count) : 0

    if (page === undefined) {
      return { items: formattedItems, total: formattedItems.length, pageCount: 1 }
    }

    return {
      items: formattedItems,
      total: count,
      pageCount: Math.ceil(count / limit)
    }
  })
}

export async function getIncomeDetails(incomeId: number) {
  return measureAsync("getIncomeDetails", async () => {
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
  })
}
