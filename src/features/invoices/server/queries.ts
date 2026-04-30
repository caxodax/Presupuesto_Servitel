import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function getInvoices(companyId?: string, queryParam?: string, page?: number, limit: number = 10) {
  const user = await requireAuth()
  const supabase = createClient()
  
  const whereClause = enforceCompanyScope(user)

  let query = supabase
    .from('Invoice')
    .select(`
      *,
      company:Company(name),
      registeredBy:User(name),
      allocation:BudgetAllocation(
        *,
        category:Category(name),
        budget:Budget(
          *,
          branch:Branch(name)
        )
      )
    `, { count: 'exact' })
    .order('date', { ascending: false })

  if (whereClause.companyId) {
    query = query.eq('companyId', whereClause.companyId)
  } else if (companyId) {
    query = query.eq('companyId', Number(companyId))
  }

  if (queryParam) {
    query = query.or(`number.ilike.%${queryParam}%,supplierName.ilike.%${queryParam}%`)
  }

  if (page === undefined) {
    const { data, error } = await query
    if (error) throw new Error(`Error al obtener facturas: ${error.message}`)
    return { items: data || [], total: (data || []).length, pageCount: 1 }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: items, count, error } = await query.range(from, to)

  if (error) {
    throw new Error(`Error al obtener facturas: ${error.message}`)
  }

  return {
    items: items || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}

export async function getInvoiceDetails(invoiceId: number) {
  const user = await requireAuth()
  const supabase = createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('Invoice')
    .select(`
      *,
      company:Company(name),
      registeredBy:User(name),
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
  
  enforceCompanyScope(user, invoice.companyId)

  const allocLimit = Number(invoice.allocation.amountUSD)
  const currentConsumedAll = Number(invoice.allocation.consumedUSD)
  
  const negativeOverBudgetLimit = currentConsumedAll > allocLimit ? currentConsumedAll - allocLimit : 0
  const availableCapacity = allocLimit - currentConsumedAll

  const { data: auditLogs } = await supabase
    .from('AuditLog')
    .select(`
      *,
      user:User(name, role)
    `)
    .eq('entity', "Factura Operativa")
    .eq('entityId', String(invoiceId))
    .order('createdAt', { ascending: false })

  // Generar URL firmada para Cloudflare R2
  let attachmentUrl = null
  if (invoice.attachmentKey) {
      try {
          const command = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: invoice.attachmentKey,
          })
          attachmentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
      } catch (e) {
          console.error("Error generando Signed URL R2:", e)
      }
  }

  return {
    invoice: { ...invoice, attachmentUrl },
    analytics: {
      hardLimit: allocLimit,
      totalConsumedNow: currentConsumedAll,
      overBudgetSpill: negativeOverBudgetLimit,
      currentCapacity: availableCapacity,
    },
    auditLogs: auditLogs || []
  }
}

export async function getExchangeRateForDate(date: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ExchangeRate')
    .select('usd')
    .eq('date', date)
    .single()

  if (error || !data) return null
  return data.usd
}
