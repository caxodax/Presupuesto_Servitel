import { getIncomes } from "@/features/incomes/server/queries"
import { getCachedCompanies, getCachedBusinessGroups } from "@/lib/cache"
import { requireAuth } from "@/lib/permissions"
import { IncomesClient } from "@/components/incomes/IncomesClient"

import { getEffectiveRate } from "@/features/exchange/server/actions"

export default async function IncomesListPage(props: { 
  searchParams: Promise<{ companyId?: string, groupId?: string, query?: string, page?: string }> 
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const { companyId, groupId, query } = searchParams
  const page = Number(searchParams.page) || 1

  const results = await Promise.all([
    getIncomes(companyId, query, page, 10, groupId),
    user.role === "SUPER_ADMIN" ? getCachedCompanies() : Promise.resolve([]),
    getCachedBusinessGroups(true),
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
        userBranchId={user.branchId}
        totalPages={pageCount}
        currentPage={page}
        totalItems={total}
        defaultCompanyId={companyId || user.companyId?.toString()}
        searchParams={searchParams}
      />
    </div>
  )
}

