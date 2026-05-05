import { getInvoices } from "@/features/invoices/server/queries"
import { getCompanies } from "@/features/companies/server/queries"
import { getBusinessGroups } from "@/features/companies/server/actions"
import { getBudgets } from "@/features/budgets/server/queries"
import { requireAuth } from "@/lib/permissions"
import { InvoicesClient } from "@/components/facturas/InvoicesClient"

import { getEffectiveRate } from "@/features/exchange/server/actions"

// La función fetchBCVRate local ya no es necesaria pues usamos lib/bcv centralizado con caché

export default async function InvoicesListPage(props: { 
  searchParams: Promise<{ companyId?: string, groupId?: string, query?: string, page?: string }> 
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const { companyId, groupId, query } = searchParams
  const page = Number(searchParams.page) || 1

  const results = await Promise.all([
    getInvoices(companyId, query, page, 10, groupId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
    getBusinessGroups(true),
    getEffectiveRate()
  ])

  const { items: invoices, pageCount, total } = results[0] as { items: any[]; pageCount: number; total: number }
  const companies = results[1] as any[]
  const businessGroups = results[2] as any[]
  const bcvResult = results[3] as any
  const currentBcvRate = bcvResult.usd || ""

  // La carga diferida (Lazy Loading) de alocaciones ocurre ahora dentro del InvoiceModal
  // para evitar descargar todo el ecosistema de presupuestos.
  const initialAllocations: any[] = [] 
  
  return (
    <div className="flex flex-col gap-6 pb-12">
      <InvoicesClient 
        invoices={invoices}
        companies={companies}
        businessGroups={businessGroups}
        initialAllocations={initialAllocations}
        currentBcvRate={currentBcvRate}
        userRole={user.role}
        totalPages={pageCount}
        currentPage={page}
        totalItems={total}
        searchParams={searchParams}
      />
    </div>
  )
}
