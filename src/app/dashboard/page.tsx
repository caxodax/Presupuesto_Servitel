import { Suspense } from "react"
import { getFilterOptions } from "@/features/dashboard/server/queries"
import { requireAuth } from "@/lib/permissions"
import { KpiCards, KpiCardsSkeleton } from "@/components/dashboard/KpiCards"
import { ExecutiveAnalytics, ExecutiveAnalyticsSkeleton } from "@/components/dashboard/ExecutiveAnalytics"
import { RecentActivity, ActivitySkeleton } from "@/components/dashboard/RecentActivity"
import { DashboardFilters } from "@/components/dashboard/DashboardFilters"

// Exportamos en dynamic permitiendo busquedas real-time del SearchParams sin cacheo agresivo global.
export const dynamic = "force-dynamic"

export default async function DashboardRootPage({ searchParams }: { searchParams: { companyId?: string, groupId?: string, branchId?: string, budgetId?: string } }) {
  // Opciones de filtro SSR (Se recuperan on-server para hidratar el cliente)
  const [user, filterOptions] = await Promise.all([
    requireAuth(),
    getFilterOptions()
  ])
  
  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      
      {/* Cabecera y Filtros Dinámicos (URL State) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Sistema Activo</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Información Contable</h1>
            <p className="text-sm text-muted-foreground mt-1 text-balance max-w-lg">
                Consolidación financiera Multi-Empresa. Monitoreo de desvíos y capacidad operativa en tiempo real.
            </p>
         </div>
         <div className="shrink-0 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <DashboardFilters options={filterOptions} userRole={user.role} />
         </div>
      </div>
      
      {/* KPIs Prioritarios (React 18 Suspense Boundaries) */}
      <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards searchParams={searchParams} />
      </Suspense>
      
      {/* Bloque Analytics Ejecutivo */}
      <Suspense fallback={<ExecutiveAnalyticsSkeleton />}>
          <ExecutiveAnalytics searchParams={searchParams} />
      </Suspense>

      {/* Bloques Secundarios  */}
      <div className="flex-1">
          <Suspense fallback={<ActivitySkeleton />}>
              <RecentActivity searchParams={searchParams} />
          </Suspense>
      </div>

    </div>
  )
}
