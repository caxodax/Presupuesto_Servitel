import { getAvailableAllocationsForSelect } from "@/features/budgets/server/queries"
import { getCachedCompanies } from "@/lib/cache"
import { requireAuth } from "@/lib/permissions"
import { getEffectiveRate } from "@/features/exchange/server/actions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CreateInvoiceForm } from "@/components/facturas/CreateInvoiceForm"

export default async function NewInvoiceEntryPage(props: { 
  searchParams: Promise<{ companyId?: string }>
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  const companyId = searchParams.companyId

  const [availableAllocations, companies, bcvResult] = await Promise.all([
    getAvailableAllocationsForSelect(companyId),
    user.role === "SUPER_ADMIN" ? getCachedCompanies() : Promise.resolve([]),
    getEffectiveRate()
  ])
  const currentBcvRate = bcvResult.usd || ""
  
  const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
   
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
            <CompanyFilter companies={companiesList} />
         )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm p-8">
          <CreateInvoiceForm availableAllocations={availableAllocations} currentBcvRate={currentBcvRate} />
      </div>

    </div>
  )
}
