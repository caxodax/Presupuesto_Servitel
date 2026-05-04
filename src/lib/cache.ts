import { cache } from "react"
import { getAllCompanies, getBranches, getCompanies } from "@/features/companies/server/queries"
import { getCategories } from "@/features/categories/server/queries"
import { getBusinessGroups } from "@/features/companies/server/actions"

/**
 * Catálogo de Empresas (Cacheado por request)
 */
export const getCachedCompanies = cache(async () => {
    return await getAllCompanies()
})

/**
 * Catálogo de Sucursales (Cacheado por request)
 */
export const getCachedBranches = cache(async (companyId?: number) => {
    return await getBranches(companyId)
})

/**
 * Catálogo de Categorías (Cacheado por request)
 */
export const getCachedCategories = cache(async (options: { companyId?: number; type?: 'EXPENSE' | 'INCOME' }) => {
    return await getCategories(options)
})

/**
 * Catálogo de Grupos Empresariales (Cacheado por request)
 */
export const getCachedBusinessGroups = cache(async (activeOnly: boolean = true) => {
    return await getBusinessGroups(activeOnly)
})
