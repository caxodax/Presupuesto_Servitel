import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"
import { measureAsync } from "@/lib/perf"

export async function getConsolidatedReport(filters: {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
    groupId?: number
    supplierName?: string
}) {
    return measureAsync("getConsolidatedReport", async () => {
        const user = await requireAuth()
        const supabase = await createClient()
        const scope = enforceCompanyScope(user)

        const finalCompanyId = scope.companyId || filters.companyId

        // Llamar las RPCs de agregación de base de datos en paralelo
        const [summaryRes, flowRes, breakdownRes, accountRes, efficiencyRes] = await Promise.all([
            (supabase.rpc as any)('rpc_report_summary', {
                p_company_id: finalCompanyId || null,
                p_branch_id: filters.branchId || null,
                p_group_id: filters.groupId || null,
                p_supplier_name: filters.supplierName || null,
                p_date_from: filters.startDate || null,
                p_date_to: filters.endDate || null
            }),
            (supabase.rpc as any)('rpc_report_daily_flow', {
                p_company_id: finalCompanyId || null,
                p_branch_id: filters.branchId || null,
                p_group_id: filters.groupId || null,
                p_supplier_name: filters.supplierName || null,
                p_date_from: filters.startDate || null,
                p_date_to: filters.endDate || null
            }),
            (supabase.rpc as any)('rpc_report_breakdown', {
                p_company_id: finalCompanyId || null,
                p_branch_id: filters.branchId || null,
                p_group_id: filters.groupId || null,
                p_supplier_name: filters.supplierName || null,
                p_date_from: filters.startDate || null,
                p_date_to: filters.endDate || null
            }),
            (supabase.rpc as any)('rpc_report_account_analysis', {
                p_company_id: finalCompanyId || null,
                p_group_id: filters.groupId || null,
                p_date_from: filters.startDate || null,
                p_date_to: filters.endDate || null
            }),
            (supabase.rpc as any)('rpc_report_budget_efficiency', {
                p_company_id: finalCompanyId || 0,
                p_branch_id: filters.branchId || null
            })
        ])

        if (summaryRes.error) throw new Error(`Error en rpc_report_summary: ${summaryRes.error.message}`)
        if (flowRes.error) throw new Error(`Error en rpc_report_daily_flow: ${flowRes.error.message}`)
        if (breakdownRes.error) throw new Error(`Error en rpc_report_breakdown: ${breakdownRes.error.message}`)
        if (accountRes.error) throw new Error(`Error en rpc_report_account_analysis: ${accountRes.error.message}`)
        if (efficiencyRes.error) throw new Error(`Error en rpc_report_budget_efficiency: ${efficiencyRes.error.message}`)

        const summaryData = (summaryRes as any).data?.[0] || {
            total_income: 0,
            total_expenses: 0,
            net_balance: 0,
            total_budget: 0,
            total_consumed: 0,
            execution_percentage: 0
        }

        // Mapear flujo diario para gráficos
        const chartData = ((flowRes as any).data || []).map((row: any) => ({
            name: row.day,
            income: Number(row.income),
            expense: Number(row.expenses)
        }))

        // Mapear desglose detallado
        const detailedBreakdown = ((breakdownRes as any).data || []).map((row: any) => ({
            company: row.company,
            branch: row.branch,
            period: row.period,
            income: Number(row.income),
            expense: Number(row.expense),
            balance: Number(row.balance),
            status: row.status
        }))

        // Mapear análisis por cuenta contable
        const categories = ((accountRes as any).data || []).map((row: any) => ({
            name: row.account_name,
            income: Number(row.total_income),
            expense: Number(row.total_expenses)
        }))

        // Mapear eficiencia presupuestaria
        const budgetEfficiency = ((efficiencyRes as any).data || []).map((row: any) => ({
            name: row.name,
            budget: Number(row.budget),
            executed: Number(row.executed)
        }))

        const totalIncome = Number(summaryData.total_income)
        const totalOut = Number(summaryData.total_expenses)

        // Calcular días transcurridos para promedios
        const start = new Date(filters.startDate).getTime()
        const end = new Date(filters.endDate).getTime()
        const now = new Date().getTime()
        const daysElapsed = Math.max(1, (Math.min(end, now) - start) / (1000 * 60 * 60 * 24))

        return {
            chartData,
            detailedBreakdown,
            categories,
            budgetEfficiency,
            summary: {
                totalIncome,
                totalCost: 0,
                totalExpense: totalOut,
                totalOut,
                utility: totalIncome - totalOut,
                dailyAverage: totalOut / daysElapsed,
                projectedMonthly: (totalOut / daysElapsed) * 30,
                projectedNext30Days: totalOut + ((totalOut / daysElapsed) * 30)
            }
        }
    })
}

/**
 * Reporte jerárquico financiero basado en el Plan de Cuentas.
 * Realiza la agregación recursiva directamente en la base de datos (bubble-up).
 */
export async function getFinancialTreeReport(filters: {
    startDate: string
    endDate: string
    companyId: number
    branchId?: number
    budgetId?: number
}) {
    return measureAsync("getFinancialTreeReport", async () => {
        const user = await requireAuth()
        const supabase = await createClient()
        enforceCompanyScope(user, filters.companyId)

        const { data, error } = await (supabase.rpc as any)('rpc_financial_tree_report', {
            p_company_id: filters.companyId,
            p_branch_id: filters.branchId || null,
            p_budget_id: filters.budgetId || null,
            p_date_from: filters.startDate || null,
            p_date_to: filters.endDate || null
        })

        if (error) throw new Error(`Error en rpc_financial_tree_report: ${error.message}`)

        return (data || []).map((row: any) => ({
            globalId: row.global_id,
            code: row.code,
            name: row.name,
            type: row.type,
            parentId: row.parent_id,
            level: row.level,
            isMovement: row.is_movement,
            budget: Number(row.budget),
            executed: Number(row.executed),
            available: Number(row.available),
            percent: Number(row.percent)
        }))
    })
}
