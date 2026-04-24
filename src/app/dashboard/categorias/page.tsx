import { getCategories } from "@/features/categories/server/queries"
import { createCategory, createSubcategory } from "@/features/categories/server/actions"
import { getCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { Layers } from "lucide-react"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { CategoryItem } from "@/components/categorias/CategoryItem"

export default async function CategoriesPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId

  const [categories, companies] = await Promise.all([
    getCategories(companyId),
    user.role === "SUPER_ADMIN" ? getCompanies() : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clasificación Contable</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Categorías y clases de los presupuestos de gasto.</p>
        </div>
        {user.role === "SUPER_ADMIN" && (
          <CompanyFilter companies={companies} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6 h-fit">
            <h2 className="text-lg font-semibold mb-5 text-foreground leading-none">Nueva Categoría Padre</h2>
            <form action={createCategory} className="flex flex-col gap-5">
              {user.role === "SUPER_ADMIN" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none block">Empresa</label>
                  {companyId ? (
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium">
                        <input type="hidden" name="companyId" value={companyId} />
                        <span className="text-foreground">{companies.find(c => c.id === companyId)?.name || 'Empresa Seleccionada'}</span>
                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-500 uppercase">Fijada</span>
                    </div>
                  ) : (
                    <select name="companyId" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm outline-none">
                        <option value="" disabled selected>Seleccione corporación...</option>
                        {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block text-zinc-700 dark:text-zinc-300">Nombre</label>
                <input type="text" name="name" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none" />
              </div>
              <button type="submit" className="w-full bg-zinc-900 text-white dark:bg-indigo-600 rounded-md h-9 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all">Crear Raíz</button>
            </form>
          </div>

          <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] p-6 h-fit">
            <h2 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wide text-zinc-500">Adherir Subcategoría</h2>
            <form action={createSubcategory} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block">Padre Referencial</label>
                <select name="categoryId" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm outline-none">
                  <option value="" disabled selected>Seleccione padre...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name} {user.role === 'SUPER_ADMIN' && !companyId ? `(${cat.company.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block">Nombre de Subitem</label>
                <input type="text" name="name" required className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 text-sm outline-none" />
              </div>
              <button type="submit" className="w-full border border-zinc-300 dark:border-zinc-700 bg-transparent rounded-md h-9 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all">Añadir Variación</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_4px_40px_rgba(0,0,0,0.02)] overflow-hidden p-6">
          <div className="flex flex-col gap-3">
            {categories
              .sort((a, b) => {
                 // Activos primero, luego por nombre
                 if (a.isActive && !b.isActive) return -1
                 if (!a.isActive && b.isActive) return 1
                 return a.name.localeCompare(b.name)
              })
              .map((cat) => (
                <CategoryItem 
                    key={cat.id} 
                    cat={cat} 
                    showCompanyBadge={user.role === 'SUPER_ADMIN' && !companyId} 
                />
            ))}
            {categories.length === 0 && <div className="text-center py-8 text-zinc-500 text-sm">Malla categórica vacía.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
