"use server"

import { getConsolidatedReport, getFinancialTreeReport } from "./queries"

export async function fetchReportAction(filters: {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
    budgetId?: number
}) {
    try {
        const consolidated = await getConsolidatedReport(filters)
        let tree: any[] = []
        
        if (filters.companyId) {
            tree = await getFinancialTreeReport({
                startDate: filters.startDate,
                endDate: filters.endDate,
                companyId: filters.companyId,
                branchId: filters.branchId,
                budgetId: filters.budgetId
            })
        }

        return {
            ...consolidated,
            tree
        }
    } catch (e: any) {
        throw new Error(e.message || "Error al generar reporte")
    }
}
