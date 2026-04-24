import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

export async function getInvoices() {
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
    `)
    .order('date', { ascending: false })

  if (whereClause.companyId) {
    query = query.eq('companyId', whereClause.companyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener facturas: ${error.message}`)
  }

  return data
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

  // Recuperar Auditoría Específica
  const { data: auditLogs, error: auditError } = await supabase
    .from('AuditLog')
    .select(`
      *,
      user:User(name, role)
    `)
    .eq('entity', "Factura Operativa")
    .eq('entityId', String(invoiceId)) // Mantenemos casteado a string por compatibilidad con la tabla AuditLog
    .order('createdAt', { ascending: false })

  return {
    invoice,
    analytics: {
      hardLimit: allocLimit,
      totalConsumedNow: currentConsumedAll,
      overBudgetSpill: negativeOverBudgetLimit,
      currentCapacity: availableCapacity,
    },
    auditLogs: auditLogs || []
  }
}
