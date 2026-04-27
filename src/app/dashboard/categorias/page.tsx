import { getCategories } from "@/features/categories/server/queries"
import { getCompanies, getAllCompanies } from "@/features/companies/server/queries"
import { requireAuth } from "@/lib/permissions"
import { CompanyFilter } from "@/components/ui/CompanyFilter"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"
import { CategoryItem } from "@/components/categorias/CategoryItem"
import { CreateCategoryModal } from "@/components/categorias/CreateCategoryModal"

export default async function CategoriesPage({ 
  searchParams 
}: { 
  searchParams: { companyId?: string; q?: string; page?: string } 
}) {
  const user = await requireAuth()
  const companyId = searchParams.companyId
  const query = searchParams.q || ""
  const page = Number(searchParams.page) || 1
  const limit = 10

  const [categoriesResult, companiesResult, allCategoriesResult] = await Promise.all([
     getCategories(companyId, query, page, limit),
     user.role === "SUPER_ADMIN" ? getAllCompanies() : Promise.resolve([]),
     getCategories(companyId) // Fetch all for dropdown in modal
  ])

  // types cast correctly
  const categoriesData = categoriesResult as { items: any[]; total: number; pageCount: number }
  const companies = companiesResult as any[]
  const allCategories = allCategoriesResult as any[]
  
  const { items: categories, total, pageCount } = categoriesData

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Clasificación Contable</h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">Categorías y clases principales de los presupuestos.</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
            {user.role === "SUPER_ADMIN" && (
              <CompanyFilter companies={companies} />
            )}
            <SearchInput placeholder="Buscar clasificación..." />
            <CreateCategoryModal 
              companies={companies} 
              categories={Array.isArray(allCategories) ? allCategories : []}
              userRole={user.role} 
              filteredCompanyId={companyId} 
            />
         </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
          <div className="flex flex-col gap-3">
            {categories.map((cat: any) => (
                <CategoryItem 
                    key={cat.id} 
                    cat={cat} 
                    showCompanyBadge={user.role === 'SUPER_ADMIN' && !companyId} 
                />
            ))}
            {categories.length === 0 && (
              <div className="text-center py-16 text-zinc-500 font-medium italic">
                {query ? `No se encontró ninguna raíz contable para "${query}".` : "Malla categórica vacía. Comience creando una nueva clasificación."}
              </div>
            )}
          </div>
          
          <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <Pagination page={page} pageCount={pageCount} total={total} />
          </div>
        </div>
      </div>
    </div>
  )
}
