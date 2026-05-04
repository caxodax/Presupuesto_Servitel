import { getIncomes } from "@/features/incomes/server/queries"
import { getIncomeCategories } from "@/features/incomes/server/actions"
import { getCompanies } from "@/features/companies/server/queries"
import { getBusinessGroups } from "@/features/companies/server/actions"
import { requireAuth } from "@/lib/permissions"
import { IncomesClient } from "@/components/incomes/IncomesClient"
import { createClient } from "@/lib/supabase/server"

import { getEffectiveRate } from "@/features/exchange/server/actions"

export default async function IncomesListPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string, groupId?: string, query?: string, page?: string } 
}) {
  const user = await requireAuth()
  const supabase = createClient()
  const { companyId, groupId, query } = searchParams
  const page = Number(searchParams.page) || 1

  // Solo descargamos las empresas si es Super Admin (para pintar el selector).
  // Ya no descargamos las branches masivamente para aliviar la carga inicial.
  let companyQuery = supabase.from('Company').select('id, name')
  if (user.role !== 'SUPER_ADMIN' && user.companyId) {
    companyQuery = companyQuery.eq('id', user.companyId)
  }

  const results = await Promise.all([
    getIncomes(companyId, query, page, 10, groupId),
    user.role === "SUPER_ADMIN" ? companyQuery.then(res => res.data || []) : Promise.resolve([]),
    getBusinessGroups(true),
    getEffectiveRate()
  ])

  const { items: incomes, pageCount, total } = results[0] as { items: any[]; pageCount: number; total: number }
  const companies = results[1] as any[]
  const businessGroups = results[2] as any[]
  const bcvResult = results[3] as any
  const currentBcvRate = bcvResult.usd || ""

  // Las categorías se cargarán de forma asíncrona (Lazy Load) en el modal
  const initialCategories: any[] = []

  return (
    <div className="flex flex-col gap-6 pb-12">
      <IncomesClient 
        incomes={incomes}
        companies={companies}
        categories={initialCategories}
        businessGroups={businessGroups}
        currentBcvRate={currentBcvRate}
        userRole={user.role}
        totalPages={pageCount}
        currentPage={page}
        totalItems={total}
        defaultCompanyId={companyId || user.companyId?.toString()}
      />
    </div>
  )
}
