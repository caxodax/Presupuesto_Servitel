import { prisma } from "./prisma"

type AuditLogInput = {
  action: string
  entity: string
  entityId: string
  userId: string
  companyId?: string | null
  details?: any
}

/**
 * Registra una entrada en la bitácora de auditoría de manera estandarizada.
 */
export async function recordAuditLog(data: AuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        companyId: data.companyId,
        details: data.details || {},
      },
    })
  } catch (error) {
    console.error("Critical: Failed to record audit log:", error)
    // No lanzamos el error para no bloquear la transacción principal si la auditoría falla
    // aunque en sistemas financieros críticos esto podría ser reversible.
  }
}
