"use server"

import { getConsolidatedReport, getFinancialTreeReport } from "./queries"
import { requireAuth } from "@/lib/permissions"

export async function fetchReportAction(filters: {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
    budgetId?: number
    supplierName?: string
}) {
    try {
        const user = await requireAuth()
        const consolidated = await getConsolidatedReport(filters, user)
        let tree: any[] = []
        
        if (filters.companyId) {
            tree = await getFinancialTreeReport({
                startDate: filters.startDate,
                endDate: filters.endDate,
                companyId: filters.companyId,
                branchId: filters.branchId,
                budgetId: filters.budgetId
            }, user)
        }

        return {
            ...consolidated,
            tree
        }
    } catch (e: any) {
        throw new Error(e.message || "Error al generar reporte")
    }
}
