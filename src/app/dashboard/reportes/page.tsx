import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies, getCachedBranches, getCachedCategories, getCachedBusinessGroups } from "@/lib/cache"
import { ReportsClient } from "@/components/reports/ReportsClient"
import { Suspense } from "react"
import { ReportsSkeleton } from "@/components/reports/ReportsSkeleton"

export default async function ReportsPage() {
    const user = await requireAuth()
    
    // Fetch initial data for filters using the cached layer
    const [companies, branches, categories, businessGroups] = await Promise.all([
        getCachedCompanies(),
        getCachedBranches(user.role !== 'SUPER_ADMIN' ? (user.companyId || undefined) : undefined),
        getCachedCategories({ companyId: user.role !== 'SUPER_ADMIN' ? (user.companyId || undefined) : undefined }),
        getCachedBusinessGroups(true)
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