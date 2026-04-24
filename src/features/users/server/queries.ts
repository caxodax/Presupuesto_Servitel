import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

export async function getUsers(companyId?: number, branchId?: number, page: number = 1, limit: number = 10) {
  const user = await requireAuth()
  const supabase = createClient()
  
  if (user.role !== "SUPER_ADMIN") {
     throw new Error("ACCCESO BLOQUEADO: Se requiere alcance global.")
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('User')
    .select(`
      *,
      company:Company(id, name),
      branch:Branch(id, name)
    `, { count: 'exact' })

  if (companyId) query = query.eq('companyId', companyId)
  if (branchId) query = query.eq('branchId', branchId)

  const { data, error, count } = await query
    .order('createdAt', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Error al obtener usuarios: ${error.message}`)
  }

  return {
    items: data || [],
    total: count || 0,
    pageCount: Math.ceil((count || 0) / limit)
  }
}
