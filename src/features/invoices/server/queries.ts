import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { measureAsync } from "@/lib/perf"

export async function getInvoces(companyId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  return getInvoices(companyId, queryParam, page, limit, groupId)
}

export async function getInvoices(companyId?: string, queryParam?: string, page?: number, limit: number = 10, groupId?: string) {
  return measureAsync("getInvoices", async () => {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const whereClause = enforceCompanyScope(user)

    const targetCompanyId = whereClause.companyId || (companyId ? Number(companyId) : null)
    const targetGroupId = groupId ? Number(groupId) : null
    
    const actualPage = page === undefined ? 1 : page
    const actualLimit = page === undefined ? 1000 : limit
    const from = (actualPage - 1) * actualLimit

    const { data: items, error } = await (supabase.rpc as any)('rpc_get_invoice_list', {
      p_company_id: targetCompanyId,
      p_group_id: targetGroupId,
      p_search: queryParam || null,
      p_limit: actualLimit,
      p_offset: from
    })

    const mapInvoice = (i: any) => ({
      ...i,
      company: { name: i.companyName },
      registeredBy: { name: i.registeredByName },
      companyAccount: {
        globalAccount: {
          code: i.accountCode,
          name: i.accountName
        }
      },
      allocation: {
        id: i.allocationId,
        budget: {
          id: i.budgetId
        }
      }
    })

    if (error) {
      throw new Error(`Error al obtener facturas: ${error.message}`)
    }

    const formattedItems = (items || []).map(mapInvoice)
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

export async function getInvoiceDetails(invoiceId: number) {
  return measureAsync("getInvoiceDetails", async () => {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: invoice, error: invoiceError } = await (supabase.from('Invoice') as any)
      .select(`
        *,
        company:Company(name),
        registeredBy:User(name),companyAccount:CompanyAccount(globalAccount:GlobalAccount(code,name)),
        allocation:BudgetAllocation(
          *,
          category:Category(name),
          budget:Budget(
            *,
            branch:Branch(name)
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) throw new Error("Factura no encontrada")
    
    enforceCompanyScope(user, (invoice as any).companyId)

    const allocLimit = Number((invoice as any).allocation.amountUSD)
    const currentConsumedAll = Number((invoice as any).allocation.consumedUSD)
    
    const negativeOverBudgetLimit = currentConsumedAll > allocLimit ? currentConsumedAll - allocLimit : 0
    const availableCapacity = allocLimit - currentConsumedAll

    const { data: auditLogs } = await (supabase.from('AuditLog') as any)
      .select(`
        *,
        user:User(name, role)
      `)
      .eq('entity', "Factura Operativa")
      .eq('entityId', String(invoiceId))
      .order('createdAt', { ascending: false })

    // Generar URL firmada para Cloudflare R2
    let attachmentUrl = null
    if ((invoice as any).attachmentKey) {
        try {
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: (invoice as any).attachmentKey,
            })
            attachmentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
        } catch (e) {
            console.error("Error generando Signed URL R2:", e)
        }
    }

    return {
      invoice: { ...(invoice as any), attachmentUrl },
      analytics: {
        hardLimit: allocLimit,
        totalConsumedNow: currentConsumedAll,
        overBudgetSpill: negativeOverBudgetLimit,
        currentCapacity: availableCapacity,
      },
      auditLogs: auditLogs || []
    }
  })
}

export async function getExchangeRateForDate(date: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase.from('ExchangeRate') as any)
    .select('usd')
    .eq('date', date)
    .single()

  if (error || !data) return null
  return Number((data as any).usd)
}
