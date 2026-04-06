import { Suspense } from "react"
import { getFilterOptions } from "@/features/dashboard/server/queries"
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/KpiCards"
import { RecentActivity, ActivitySkeleton } from "@/components/dashboard/RecentActivity"
import { DashboardFilters } from "@/components/dashboard/DashboardFilters"

// Exportamos en dynamic permitiendo busquedas real-time del SearchParams sin cacheo agresivo global.
export const dynamic = "force-dynamic"

export default async function DashboardRootPage({ searchParams }: { searchParams: { companyId?: string, branchId?: string, budgetId?: string } }) {
  // Opciones de filtro SSR (Se recuperan on-server para hidratar el cliente)
  const filterOptions = await getFilterOptions()
  
  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      
      {/* Cabecera y Filtros Dinámicos (URL State) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Termómetro Contable</h1>
           <p className="text-sm text-muted-foreground mt-1 text-balance">
             Monitoreo cruzado en tiempo real. Utiliza los filtros para aislar las métricas.
           </p>
         </div>
         <div className="shrink-0">
            <DashboardFilters options={filterOptions} />
         </div>
      </div>
      
      {/* KPIs Prioritarios (React 18 Suspense Boundaries) */}
      <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards searchParams={searchParams} />
      </Suspense>
      
      {/* Bloques Secundarios  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
          
          <div className="lg:col-span-2">
             <Suspense fallback={<ActivitySkeleton />}>
                 <RecentActivity searchParams={searchParams} />
             </Suspense>
          </div>
          
          <div className="col-span-1 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 shadow-sm p-6 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-white dark:bg-zinc-900 shadow-sm text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center mb-4">
                 <span className="text-2xl">📊</span>
             </div>
             <h3 className="font-semibold text-foreground mb-1.5 tracking-tight">Analítica Segmentada</h3>
             <p className="text-xs text-zinc-500 text-balance leading-relaxed max-w-[250px]">
                Módulo expansible para gráficas Chart.js mostrando la composición radial de los centros de costo en futuras versiones.
             </p>
          </div>

      </div>

    </div>
  )
}
