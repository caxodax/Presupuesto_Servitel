"use server"

import { getConsolidatedReport } from "./queries"

export async function fetchReportAction(filters: {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
}) {
    try {
        return await getConsolidatedReport(filters)
    } catch (e: any) {
        throw new Error(e.message || "Error al generar reporte")
    }
}
