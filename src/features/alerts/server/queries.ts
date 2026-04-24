import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function getUnreadAlerts() {
    const user = await requireAuth()
    
    const whereClause: any = { isRead: false }
    
    if (user.role !== 'SUPER_ADMIN') {
        if (!user.companyId) return []
        whereClause.companyId = user.companyId
    }

    return prisma.alert.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10
    })
}
