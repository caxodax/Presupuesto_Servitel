import { getBudgets } from "@/features/budgets/server/queries"
import { getCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CreateInvoiceForm } from "@/components/facturas/CreateInvoiceForm"


async function fetchBCVRate(): Promise<number | string> {
  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 } // Revalidar cada hora
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.promedio || "";
  } catch (error) {
    console.error("Error fetching BCV:", error);
    return "";
  }
}

export default async function NewInvoiceEntryPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId

  const [budgets, companies, currentBcvRate] = await Promise.all([
    getBudgets(companyId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
    fetchBCVRate()
  ])
  
  // Condensamos TODAS las Allocations del sistema para el Select de impacto
  const availableAllocations = budgets.flatMap(b => 
      b.allocations.map(a => ({ 
          id: a.id, 
          label: `${user.role === "SUPER_ADMIN" ? `[${b.branch.company.name}] ` : ''}${b.name} (${b.branch.name}) - ${a.category.name} ${a.subcategory ? `> ${a.subcategory.name}` : ''}`
      }))
  )
   
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-10">
      
      <div className="flex items-center justify-between">
         <div>
            <Link href="/dashboard/facturas" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground transition-colors w-fit mb-4">
               <ArrowLeft className="w-4 h-4" /> Volver al Repositorio
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Registro de Gasto</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Portal transaccional de distracción cero. El impacto será reflejado inmediatamente.</p>
         </div>
         {user.role === "SUPER_ADMIN" && (
            <CompanyFilter companies={companies} />
         )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm p-8">
          <CreateInvoiceForm availableAllocations={availableAllocations} currentBcvRate={currentBcvRate} />
      </div>

    </div>
  )
}
