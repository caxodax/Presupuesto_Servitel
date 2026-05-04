import { requireAuth } from "@/lib/permissions"
import { getAllCompanies, getBranches } from "@/features/companies/server/queries"
import { getBusinessGroups } from "@/features/companies/server/actions"
import { getCategories } from "@/features/categories/server/queries"
import { ReportsClient } from "@/components/reports/ReportsClient"
import { Suspense } from "react"
import { ReportsSkeleton } from "@/components/reports/ReportsSkeleton"

export default async function ReportsPage() {
    const user = await requireAuth()
    
    // Fetch initial data for filters
    const [companies, branches, categories, businessGroups] = await Promise.all([
        getAllCompanies(),
        getBranches(user.role !== 'SUPER_ADMIN' ? (user.companyId || undefined) : undefined),
        getCategories(user.role !== 'SUPER_ADMIN' ? (user.companyId?.toString() || undefined) : undefined),
        getBusinessGroups(true)
    ])

    return (
        <Suspense fallback={<ReportsSkeleton />}>
            <ReportsClient 
                companies={companies} 
                branches={Array.isArray(branches) ? branches : (branches as any).items || []}
                categories={Array.isArray(categories) ? categories : (categories as any).items || []}
                businessGroups={businessGroups}
                userRole={user.role}
                initialCompanyId={user.companyId || undefined}
            />
        </Suspense>
    )
}