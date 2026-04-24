import { getBudgets } from "@/features/budgets/server/queries"
import { createInvoice } from "@/features/invoices/server/actions"
import { getCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"


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
          <form action={createInvoice} method="POST" encType="multipart/form-data" className="flex flex-col gap-6">

              
              <div className="space-y-2">
                 <label className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 uppercase">Impacto Estratégico (Destino del Gasto)</label>
                 <select name="allocationId" required className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none">
                    <option value="" disabled selected>Identificador Viga / Categoría / Presupuesto Maestro...</option>
                    {availableAllocations.map(alloc => (
                       <option key={alloc.id} value={alloc.id}>{alloc.label}</option>
                    ))}
                 </select>
                 <p className="text-xs text-zinc-500 font-medium italic mt-1">Este gasto restará capacidad operativa exclusivamente de la rama seleccionada.</p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">Proveedor / Emisor</label>
                    <input type="text" name="supplierName" required placeholder="Consultores Lógica C.A." className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">Número de Factura</label>
                    <input type="text" name="number" required placeholder="001-0004523" className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500" />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">Fecha Operativa</label>
                    <input type="date" name="date" required className="w-full h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-sm outline-none focus:border-indigo-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-emerald-600">Base Imponible (USD)</label>
                    <input type="number" step="0.01" name="amountUSD" required placeholder="$0.00" className="w-full h-9 rounded-md border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-amber-600">Referencia BCV (Tasa)</label>
                    <input type="number" step="0.0001" name="exchangeRate" required defaultValue={currentBcvRate} placeholder="Ej. 36.5021" className="w-full h-9 rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold text-foreground outline-none focus:border-amber-500" />
                    {currentBcvRate && <p className="text-[10px] text-amber-600/80 font-medium">Auto-obtenido de DolarApi Oficial</p>}
                 </div>
              </div>

              <FileUploadInput name="attachment" />

              <button type="submit" className="w-full h-11 bg-indigo-600 text-white rounded-md flex items-center justify-center gap-2 mt-4 hover:bg-indigo-700 active:scale-[0.98] transition-all font-semibold shadow-md shadow-indigo-600/20">
                 <CheckCircle2 className="w-5 h-5" /> Consolidar Factura y Procesar Resta
              </button>
          </form>
      </div>

    </div>
  )
}
