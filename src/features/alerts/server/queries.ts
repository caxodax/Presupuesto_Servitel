import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"

export async function getUnreadAlerts() {
    const user = await requireAuth()
    const supabase = createClient()
    
    let query = supabase
        .from('Alert')
        .select('*')
        .eq('isRead', false)
    
    if (user.role !== 'SUPER_ADMIN') {
        if (!user.companyId) return []
        query = query.eq('companyId', user.companyId)
    }

    const { data, error } = await query
        .order('createdAt', { ascending: false })
        .limit(10)

    if (error) {
        console.error("Error al obtener alertas:", error.message)
        return []
    }

    return data || []
}
