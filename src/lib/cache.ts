import { cache } from "react"
import { unstable_cache } from "next/cache"
import { getAllCompanies, getBranches, getCompanies } from "@/features/companies/server/queries"
import { getCategories } from "@/features/categories/server/queries"
import { createClient, createStaticClient } from "@/lib/supabase/server"

/**
 * Catálogo de Empresas
 * React.cache(): deduplicado por request (no cambia con cada navegación).
 */
export const getCachedCompanies = cache(async () => {
    return await getAllCompanies()
})

/**
 * Catálogo de Sucursales
 * React.cache(): deduplicado por request.
 */
export const getCachedBranches = cache(async (companyId?: number) => {
    return await getBranches(companyId)
})

/**
 * Catálogo de Categorías
 * React.cache(): deduplicado por request.
 */
export const getCachedCategories = cache(async (options: { companyId?: number; type?: 'EXPENSE' | 'INCOME' }) => {
    return await getCategories(options)
})

/**
 * Grupos Empresariales (Matrices)
 * unstable_cache: cross-request, 5 minutos.
 */
export const getCachedBusinessGroups = unstable_cache(
    async (activeOnly: boolean = true) => {
        const supabase = await createStaticClient()
        let query = supabase
            .from('BusinessGroup')
            .select('*')
            .order('name')
            
        if (activeOnly) {
            query = query.eq('isActive', true)
        }

        const { data, error } = await query
        if (error) throw error
        return data || []
    },
    ['business-groups'],
    {
        revalidate: 300, // 5 minutos
        tags: ['business-groups'],
    }
)

/**
 * Tasa de cambio más reciente (BCV)
 * unstable_cache: cross-request, 1 hora.
 */
export const getCachedLatestExchangeRate = unstable_cache(
    async () => {
        const supabase = await createStaticClient()
        const { data } = await supabase
            .from('ExchangeRate')
            .select('date, usd, eur')
            .order('date', { ascending: false })
            .limit(1)
            .single()
        return data
    },
    ['latest-exchange-rate'],
    {
        revalidate: 3600, // 1 hora
        tags: ['exchange-rates'],
    }
)

/**
 * Catálogo de Categorías por empresa con caché cross-request
 */
const getCategoriesInner = unstable_cache(
    async (companyId: number, type?: 'EXPENSE' | 'INCOME') => {
        const supabase = await createStaticClient()
        let query = supabase
            .from('Category')
            .select(`
              *,
              subcategories:Subcategory(*)
            `)
            .or(`companyId.eq.${companyId},companyId.is.null`)
            .order('isActive', { ascending: false })
            .order('name', { ascending: true })

        if (type) {
            query = query.eq('type', type)
        }

        const { data, error } = await query
        if (error) throw error
        return data || []
    },
    ['categories-by-company'],
    {
        revalidate: 600, // 10 minutos
        tags: ['categories'], // Tag genérico o podemos hacerlo dinámico en revalidateTag
    }
)

export function getCachedCategoriesByCompany(companyId: number, type?: 'EXPENSE' | 'INCOME') {
    return getCategoriesInner(companyId, type)
}
