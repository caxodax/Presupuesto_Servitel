import { getBranches, getCompanies } from "@/features/companies/server/queries"
import { createBranch } from "@/features/companies/server/actions"
import { requireAuth } from "@/lib/permissions"

export default async function BranchesPage() {
  const user = await requireAuth()
  const [branches, companies] = await Promise.all([
    getBranches(),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sucursales Físicas</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Divisiones internas usadas como etiquetas de los presupuestos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6 h-fit">
          <h2 className="text-lg font-semibold mb-5 text-foreground leading-none">Nueva Unidad Operativa</h2>
          <form action={createBranch} className="flex flex-col gap-5">
            {user.role === "SUPER_ADMIN" && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block">Empresa</label>
                <select name="companyId" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm outline-none">
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none block text-zinc-700 dark:text-zinc-300">Nombre de Sucursal</label>
              <input type="text" name="name" required placeholder="Oficina Centro Histórico" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background dark:bg-indigo-600 dark:text-white rounded-md h-9 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all mt-1">Registrar Sucursal</button>
          </form>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-3.5">Nombre Filial</th>
                  <th className="px-6 py-3.5">Empresa</th>
                  <th className="px-6 py-3.5 text-right">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground">{branch.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{branch.company.name}</td>
                    <td className="px-6 py-4 text-right"><span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold tracking-wider bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{branch.isActive ? "OPERATIVA" : "BAJA"}</span></td>
                  </tr>
                ))}
                {branches.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-500">Sin sucursales registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
