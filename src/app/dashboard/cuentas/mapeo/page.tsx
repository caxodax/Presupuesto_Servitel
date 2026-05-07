import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies } from "@/lib/cache"
import { MappingClient } from "@/components/accounts/MappingClient"

export default async function CategoryAccountMappingPage() {
    const user = await requireAuth() as any
    const supabase = await createClient()
    
    // Solo Super Admin puede gestionar mapeos globales, otros solo los de su empresa
    const companies = await getCachedCompanies()
    
    // Obtener categorías existentes (Gastos e Ingresos)
    const { data: categories } = await supabase
        .from('Category')
        .select('id, name, type, companyId')
        .eq('isActive', true)
        .order('name')

    // Obtener cuentas contables (Activadas por empresa)
    const { data: accounts } = await supabase
        .from('CompanyAccount')
        .select('id, isActive, globalAccount:GlobalAccount(code, name, type)')
        .eq('isActive', true)
        .order('id')

    // Obtener mapeos actuales
    const { data: mappings } = await supabase
        .from('CategoryAccountMapping')
        .select(`
            id,
            companyId,
            categoryId,
            subcategoryId,
            accountId,
            companyAccountId,
            companyAccount:CompanyAccount(globalAccount:GlobalAccount(code, name)),
            category:Category(name)
        `)

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Mapeo Contable</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Vincule categorías legacy con el nuevo Plan de Cuentas para automatizar la migración.
                </p>
            </div>

            <MappingClient 
                initialMappings={mappings || []}
                companies={companies || []}
                categories={categories || []}
                accounts={accounts || []}
                userRole={user.role}
                userCompanyId={user.companyId}
            />
        </div>
    )
}
