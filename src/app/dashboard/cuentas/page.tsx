import { requireAuth } from "@/lib/permissions"
import { getGlobalAccounts, getCompanyAccounts } from "@/features/accounts/server/actions"
import { AccountsManager } from "@/components/accounts/AccountsManager"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Plan de Cuentas | Presupuesto Servitel",
  description: "Gestión del catálogo maestro de cuentas contables y activaciones por empresa.",
}

export default async function AccountsPage() {
  const user = await requireAuth()
  
  // Si no es SUPER_ADMIN y no tiene empresa, no puede ver nada
  if (!user.companyId && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <h2 className="text-xl font-semibold">Acceso Denegado</h2>
        <p className="text-muted-foreground mt-2">Su usuario no tiene una empresa asociada.</p>
      </div>
    )
  }

  const companyId = user.companyId || 0 // Para Super Admin que quiera ver globales sin filtro inicial
  
  const [globalAccounts, companyAccounts] = await Promise.all([
    getGlobalAccounts(),
    companyId ? getCompanyAccounts(companyId) : Promise.resolve([])
  ])

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Plan de Cuentas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administre el catálogo maestro global y active las cuentas necesarias para su empresa.
        </p>
      </div>

      <AccountsManager 
        globalAccounts={globalAccounts} 
        companyAccounts={companyAccounts}
        companyId={companyId}
        userRole={user.role}
      />
    </div>
  )
}
