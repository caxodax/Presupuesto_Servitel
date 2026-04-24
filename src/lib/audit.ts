import { createClient } from "./supabase/server"

type AuditLogInput = {
  action: string
  entity: string
  entityId: number | string
  userId: number
  companyId?: number | null
  details?: any
}

/**
 * Registra una entrada en la bitácora de auditoría de manera estandarizada.
 * Utiliza Supabase Directo.
 */
export async function recordAuditLog(data: AuditLogInput) {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('AuditLog')
      .insert({
        action: data.action,
        entity: data.entity,
        entityId: String(data.entityId),
        userId: data.userId,
        companyId: data.companyId,
        details: data.details || {},
      })

    if (error) throw error

  } catch (error) {
    console.error("Critical: Failed to record audit log:", error)
  }
}
