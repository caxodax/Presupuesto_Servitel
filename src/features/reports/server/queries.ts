import { createClient } from "@/lib/supabase/server"
import { requireAuth, enforceCompanyScope } from "@/lib/permissions"

export async function getConsolidatedReport(filters: {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
    groupId?: number
}) {
    const user = await requireAuth()
    const supabase = await createClient()
    const scope = enforceCompanyScope(user)

    const finalCompanyId = scope.companyId || filters.companyId

    // Construcción de consultas dinámicas con Joins para nombres
    let incomesQuery = supabase
        .from('Income')
        .select(`
            amountUSD, 
            date, 
            categoryId, 
            category:Category(name),
            company:Company(name),
            branch:Branch(name)
        `)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)

    let expensesQuery = supabase
        .from('Invoice')
        .select(`
            amountUSD, 
            date, 
            company:Company(name),
            allocation:BudgetAllocation(
                categoryId, 
                subcategoryId, 
                category:Category(name), 
                budget:Budget(
                    branchId, 
                    branch:Branch(name)
                )
            )
        `)
        .eq('status', 'REGISTERED')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)

    if (finalCompanyId) {
        incomesQuery = incomesQuery.eq('companyId', finalCompanyId)
        expensesQuery = expensesQuery.eq('companyId', finalCompanyId)
    }

    // Aplicar filtros granulares
    if (filters.branchId) {
        incomesQuery = incomesQuery.eq('branchId', filters.branchId)
        expensesQuery = expensesQuery.filter('allocation.budget.branchId', 'eq', filters.branchId)
    }
    if (filters.categoryId) {
        incomesQuery = incomesQuery.eq('categoryId', filters.categoryId)
        expensesQuery = expensesQuery.filter('allocation.categoryId', 'eq', filters.categoryId)
    }
    if (filters.subcategoryId) {
        incomesQuery = incomesQuery.eq('subcategoryId', filters.subcategoryId)
        expensesQuery = expensesQuery.filter('allocation.subcategoryId', 'eq', filters.subcategoryId)
    }
    if (filters.groupId) {
        // Para filtrar por la matriz de la empresa
        incomesQuery = incomesQuery.eq('company.groupId', filters.groupId)
        expensesQuery = expensesQuery.eq('company.groupId', filters.groupId)
    }

    const [incomesRes, expensesRes] = await Promise.all([
        incomesQuery,
        expensesQuery
    ])

    if (incomesRes.error) throw new Error(`Error en ingresos: ${incomesRes.error.message}`)
    if (expensesRes.error) throw new Error(`Error en gastos: ${expensesRes.error.message}`)

    // 1. Procesamiento para Gráficos Mensuales
    const monthlyData: Record<string, { income: number; expense: number }> = {}
    
    incomesRes.data.forEach(inc => {
        const month = inc.date.substring(0, 7)
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 }
        monthlyData[month].income += Number(inc.amountUSD)
    })

    expensesRes.data.forEach(exp => {
        const month = exp.date.substring(0, 7)
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 }
        monthlyData[month].expense += Number(exp.amountUSD)
    })

    const chartData = Object.entries(monthlyData)
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => a.name.localeCompare(b.name))

    // 2. Desglose Detallado (Empresa > Sucursal > Periodo)
    const breakdownMap: Record<string, any> = {}

    incomesRes.data.forEach(inc => {
        const companyName = inc.company?.name || 'Empresa Desconocida'
        const branchName = inc.branch?.name || 'Sede Central / Global'
        const month = inc.date.substring(0, 7)
        const key = `${companyName}-${branchName}-${month}`

        if (!breakdownMap[key]) {
            breakdownMap[key] = { company: companyName, branch: branchName, period: month, income: 0, expense: 0 }
        }
        breakdownMap[key].income += Number(inc.amountUSD)
    })

    expensesRes.data.forEach(exp => {
        const companyName = exp.company?.name || 'Empresa Desconocida'
        const branchName = (exp.allocation as any)?.budget?.branch?.name || 'Sede Central / Global'
        const month = exp.date.substring(0, 7)
        const key = `${companyName}-${branchName}-${month}`

        if (!breakdownMap[key]) {
            breakdownMap[key] = { company: companyName, branch: branchName, period: month, income: 0, expense: 0 }
        }
        breakdownMap[key].expense += Number(exp.amountUSD)
    })

    const detailedBreakdown = Object.values(breakdownMap).map(row => ({
        ...row,
        balance: row.income - row.expense,
        status: row.income - row.expense >= 0 ? 'GAIN' : 'LOSS'
    })).sort((a, b) => b.period.localeCompare(a.period))

    // 3. Consolidación por categoría
    const categoryAnalysis: Record<string, { name: string; income: number; expense: number }> = {}
    
    incomesRes.data.forEach(inc => {
        const catName = inc.category?.name || 'Sin Categoría'
        if (!categoryAnalysis[catName]) categoryAnalysis[catName] = { name: catName, income: 0, expense: 0 }
        categoryAnalysis[catName].income += Number(inc.amountUSD)
    })

    expensesRes.data.forEach(exp => {
        const catName = (exp.allocation as any)?.category?.name || 'Sin Categoría'
        if (!categoryAnalysis[catName]) categoryAnalysis[catName] = { name: catName, income: 0, expense: 0 }
        categoryAnalysis[catName].expense += Number(exp.amountUSD)
    })

    // 4. Totales y Forecasting
    const totalIncome = Object.values(monthlyData).reduce((acc, curr) => acc + curr.income, 0)
    const totalExpense = Object.values(monthlyData).reduce((acc, curr) => acc + curr.expense, 0)
    
    const start = new Date(filters.startDate).getTime()
    const end = new Date(filters.endDate).getTime()
    const now = new Date().getTime()
    
    const daysElapsed = Math.max(1, (Math.min(end, now) - start) / (1000 * 60 * 60 * 24))
    const dailyAverage = totalExpense / daysElapsed
    const projectedMonthly = dailyAverage * 30
    const projectedNext30Days = totalExpense + (dailyAverage * 30)

    return {
        chartData,
        detailedBreakdown,
        categories: Object.values(categoryAnalysis),
        summary: {
            totalIncome,
            totalExpense,
            dailyAverage,
            projectedMonthly,
            projectedNext30Days
        }
    }
}

