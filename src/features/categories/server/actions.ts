"use server"
import { prisma } from "@/lib/prisma"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { categorySchema, subcategorySchema } from "../validations"
import { revalidatePath } from "next/cache"

export async function createCategory(formData: FormData) {
  const user = await requireAuth()
  const targetId = formData.get("companyId") as string | undefined;
  
  // Garantizador de aislamiento RLS
  const scope = enforceCompanyScope(user, targetId)
  
  const validated = categorySchema.parse({ 
    name: formData.get("name"), 
    companyId: scope.companyId! 
  })
  
  await prisma.category.create({
    data: { name: validated.name, companyId: validated.companyId }
  })
  
  revalidatePath("/dashboard/categorias")
}

export async function createSubcategory(formData: FormData) {
  const user = await requireAuth()
  
  // Aqui verificariamos que la categoría padre le pertenezca a la empresa del usuario
  // por medidas militares de seguridad.
  const categoryId = formData.get("categoryId") as string;
  
  const parentCat = await prisma.category.findUnique({ where: { id: categoryId }})
  if(!parentCat) throw new Error("La categoria no existe.")
  
  // Si el usuario pertenece a una empresa distinta a la del padre, se repudia la solicitud.
  enforceCompanyScope(user, parentCat.companyId)
  
  const validated = subcategorySchema.parse({ 
    name: formData.get("name"), 
    categoryId: categoryId 
  })
  
  await prisma.subcategory.create({
    data: { name: validated.name, categoryId: validated.categoryId }
  })
  
  revalidatePath("/dashboard/categorias")
}
