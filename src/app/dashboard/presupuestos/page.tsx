import { getBudgets } from "@/features/budgets/server/queries"
import { Layers } from "lucide-react"
import Link from "next/link"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { BranchFilter } from "@/components/ui/BranchFilter"
import { GroupFilter } from "@/components/ui/GroupFilter"
import { CreateBudgetModal } from "@/components/presupuestos/CreateBudgetModal"
import { BudgetsClient } from "@/components/presupuestos/BudgetsClient"
import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches, getCachedBusinessGroups } from "@/lib/cache"

export default async function BudgetsRootPage(props: { 
  searchParams: Promise<{ companyId?: string; branchId?: string; groupId?: string; q?: string; page?: string }> 
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const { companyId, branchId, groupId, q: query = "" } = searchParams;
  const companyIdNum = companyId ? Number(companyId) : undefined;
  const page = Number(searchParams.page) || 1;
  const limit = 10;

  const [budgetsResult, branchesResult, companiesResult, businessGroups] = await Promise.all([
    getBudgets(companyId, branchId, query, page, limit, groupId),
    getCachedBranches(companyIdNum), 
    user.role === "SUPER_ADMIN" ? getCachedCompanies() : Promise.resolve([]),
    getCachedBusinessGroups(true)
  ])
  
  // Extraer valores paginados o listados
  const { items: budgets, total, pageCount } = budgetsResult as any
  let branches = Array.isArray(branchesResult) ? branchesResult : (branchesResult as any).items || []
  let companies = companiesResult as any[]

  if (groupId) {
    companies = companies.filter((c: any) => Number(c.groupId) === Number(groupId))
    // Filter branches of those companies
    const companyIds = companies.map((c: any) => c.id)
    branches = branches.filter((b: any) => companyIds.includes(b.companyId))
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="animate-in fade-in slide-in-from-left-4 duration-500">
           <h1 className="text-3xl font-black tracking-tight text-foreground">Matriz de Presupuestos</h1>
           <p className="text-sm text-muted-foreground mt-1.5 font-medium">Manejo de ciclos, periodos globales y divisiones operacionales.</p>
         </div>
         <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
           {user.role === "SUPER_ADMIN" && (
              <>
                <GroupFilter groups={businessGroups} />
                <CompanyFilter companies={companies} />
                <BranchFilter branches={branches} selectedCompanyId={companyId} />
              </>
           )}
           <CreateBudgetModal 
              companies={companies} 
              branches={branches} 
              defaultCompanyId={companyId}
           />
         </div>
      </div>
      
      <BudgetsClient 
         budgets={budgets} 
         totalPages={pageCount} 
         currentPage={page} 
         totalItems={total} 
         searchParams={searchParams} 
      />
    </div>
  )
}
