import { getIncomes } from "@/features/incomes/server/queries"
import { getIncomeCategories } from "@/features/incomes/server/actions"
import { getCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { IncomesClient } from "@/components/incomes/IncomesClient"

async function fetchBCVRate(): Promise<number | string> {
  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 }
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.promedio || "";
  } catch (error) {
    return "";
  }
}

export default async function IncomesListPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string, query?: string, page?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId
  const query = searchParams.query
  const page = Number(searchParams.page) || 1

  const results = await Promise.all([
    getIncomes(companyId, query, page),
    getIncomeCategories(companyId ? Number(companyId) : undefined),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
    fetchBCVRate()
  ])

  const { items: incomes, pageCount } = results[0] as { items: any[]; pageCount: number }
  const incomeCategories = results[1] as any[]
  const companies = results[2] as any[]
  const currentBcvRate = results[3] as string | number

  return (
    <div className="flex flex-col gap-6 pb-12">
      <IncomesClient 
        incomes={incomes}
        companies={companies}
        categories={incomeCategories}
        currentBcvRate={currentBcvRate}
        userRole={user.role}
        totalPages={pageCount}
      />
    </div>
  )
}
