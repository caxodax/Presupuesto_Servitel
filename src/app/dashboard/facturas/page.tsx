import { getInvoices } from "@/features/invoices/server/queries"
import { getCompanies } from "@/features/companies/server/queries"
import { getBudgets } from "@/features/budgets/server/queries"
import { requireAuth } from "@/lib/permissions"
import { InvoicesClient } from "@/components/facturas/InvoicesClient"

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

export default async function InvoicesListPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string, query?: string, page?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId
  const query = searchParams.query
  const page = Number(searchParams.page) || 1

  const [{ items: invoices, pageCount }, budgets, companies, currentBcvRate] = await Promise.all([
    getInvoices(companyId, query, page),
    getBudgets(companyId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
    fetchBCVRate()
  ])

  const availableAllocations = budgets.flatMap(b => 
      b.allocations.map(a => ({ 
          id: a.id, 
          label: `${user.role === "SUPER_ADMIN" ? `[${b.branch.company.name}] ` : ''}${b.name} (${b.branch.name}) - ${a.category.name} ${a.subcategory ? `> ${a.subcategory.name}` : ''}`
      }))
  )
  
  return (
    <div className="flex flex-col gap-6 pb-12">
      <InvoicesClient 
        invoices={invoices}
        companies={companies}
        availableAllocations={availableAllocations}
        currentBcvRate={currentBcvRate}
        userRole={user.role}
        totalPages={pageCount}
      />
    </div>
  )
}
