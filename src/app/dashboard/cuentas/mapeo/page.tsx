import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { getCachedCompanies } from "@/lib/cache"
import { MappingClient } from "@/components/accounts/MappingClient"

export default async function CategoryAccountMappingPage() {
    const user = await requireAuth() as any
    const supabase = await createClient()
    
    // Solo Super Admin puede gestionar mapeos globales, otros solo los de su empresa
    const companies = await getCachedCompanies()
    
    // Obtener cuentas contables (Activadas por empresa)
    const { data: accounts } = await supabase
        .from('CompanyAccount')
        .select('id, companyId, globalAccountId, isActive, globalAccount:GlobalAccount(id, code, name, type)')
        .eq('isActive', true)
        .order('id')

    // Obtener todas las cuentas globales maestras
    const { data: globalAccounts } = await supabase
        .from('GlobalAccount')
        .select('*')
        .order('code')

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Plan de Cuentas por Empresa</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Habilite o deshabilite las cuentas contables maestras para la empresa seleccionada.
                </p>
            </div>

            <MappingClient 
                companies={companies || []}
                accounts={accounts || []}
                globalAccounts={globalAccounts || []}
                userRole={user.role}
                userCompanyId={user.companyId}
            />
        </div>
    )
}
