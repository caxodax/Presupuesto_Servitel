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
    supplierName?: string
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
            company:Company(name),
            branch:Branch(name),
            companyAccount:CompanyAccount(
                globalAccount:GlobalAccount(code, name, type)
            )
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
                ),
                companyAccount:CompanyAccount(
                    globalAccount:GlobalAccount(code, name, type)
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
        // En el nuevo mundo, categoryId ya no se usa para nuevos registros, pero si se pasa, 
        // podríamos intentar filtrar por el nombre de la cuenta equivalente o simplemente ignorarlo si ya no hay categorías.
        // Por ahora, asumimos que los filtros de UI también cambiarán a cuentas.
    }
    if (filters.groupId) {
        // Para filtrar por la matriz de la empresa
        incomesQuery = incomesQuery.eq('company.groupId', filters.groupId)
        expensesQuery = expensesQuery.eq('company.groupId', filters.groupId)
    }

    if (filters.supplierName) {
        // Si hay búsqueda por proveedor, los ingresos no aplican (se filtran a vacío)
        incomesQuery = incomesQuery.eq('id', -1)
        expensesQuery = expensesQuery.ilike('supplierName', `%${filters.supplierName}%`)
    }

    const [incomesRes, expensesRes] = await Promise.all([
        incomesQuery,
        expensesQuery
    ])

    if (incomesRes.error) throw new Error(`Error en ingresos: ${incomesRes.error.message}`)
    if (expensesRes.error) throw new Error(`Error en gastos: ${expensesRes.error.message}`)

    // 1. Procesamiento para Gráficos Diarios Consolidados
    const dailyData: Record<string, { income: number; expense: number }> = {}
    
    incomesRes.data.forEach(inc => {
        // Normalizamos a YYYY-MM-DD para consolidar múltiples registros del mismo día
        const date = inc.date.substring(0, 10) 
        if (!dailyData[date]) dailyData[date] = { income: 0, expense: 0 }
        dailyData[date].income += Number(inc.amountUSD)
    })

    expensesRes.data.forEach(exp => {
        const date = exp.date.substring(0, 10) 
        if (!dailyData[date]) dailyData[date] = { income: 0, expense: 0 }
        dailyData[date].expense += Number(exp.amountUSD)
    })

    const chartData = Object.entries(dailyData)
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

    // 3. Consolidación por cuenta de alto nivel (Nivel 1 o 2)
    const categoryAnalysis: Record<string, { name: string; income: number; expense: number }> = {}
    
    incomesRes.data.forEach(inc => {
        const accName = (inc.companyAccount as any)?.globalAccount?.name || 'Otros Ingresos'
        if (!categoryAnalysis[accName]) categoryAnalysis[accName] = { name: accName, income: 0, expense: 0 }
        categoryAnalysis[accName].income += Number(inc.amountUSD)
    })
 
    expensesRes.data.forEach(exp => {
        const accName = (exp.allocation as any)?.companyAccount?.globalAccount?.name || 'Otros Gastos'
        if (!categoryAnalysis[accName]) categoryAnalysis[accName] = { name: accName, income: 0, expense: 0 }
        categoryAnalysis[accName].expense += Number(exp.amountUSD)
    })

    // 4. Totales por tipo de cuenta contable
    let totalIncome = 0
    let totalCost = 0
    let totalExpense = 0

    incomesRes.data.forEach(inc => {
        const type = (inc.companyAccount as any)?.globalAccount?.type
        if (type === 'INCOME') {
            totalIncome += Number(inc.amountUSD)
        }
    })

    expensesRes.data.forEach(exp => {
        const type = (exp.allocation as any)?.companyAccount?.globalAccount?.type
        if (type === 'COST') {
            totalCost += Number(exp.amountUSD)
        } else if (type === 'EXPENSE') {
            totalExpense += Number(exp.amountUSD)
        }
    })
    
    // 5. Análisis de Eficiencia (Presupuesto vs Ejecutado)
    let allocationsQuery = supabase
        .from('BudgetAllocation')
        .select(`
            amountUSD,
            consumedUSD,
            companyAccount:CompanyAccount(
                globalAccount:GlobalAccount(name)
            ),
            budget:Budget!inner(companyId, branchId)
        `)
        .eq('budget.companyId', finalCompanyId || 0)

    if (filters.branchId) {
        allocationsQuery = allocationsQuery.eq('budget.branchId', filters.branchId)
    }

    const { data: allocations } = await allocationsQuery

    const budgetAnalysis: Record<string, { name: string; budget: number; executed: number }> = {}
    
    allocations?.forEach(al => {
        const accName = (al.companyAccount as any)?.globalAccount?.name || 'Otros'
        if (!budgetAnalysis[accName]) budgetAnalysis[accName] = { name: accName, budget: 0, executed: 0 }
        budgetAnalysis[accName].budget += Number(al.amountUSD)
        budgetAnalysis[accName].executed += Number(al.consumedUSD)
    })

    const budgetEfficiency = Object.values(budgetAnalysis)
        .filter(b => b.budget > 0)
        .sort((a, b) => (b.executed / b.budget) - (a.executed / a.budget)) // Ordenar por mayor consumo
        .slice(0, 5)

    // Restaurar cálculos de resumen
    const totalOut = totalCost + totalExpense
    const start = new Date(filters.startDate).getTime()
    const end = new Date(filters.endDate).getTime()
    const now = new Date().getTime()
    const daysElapsed = Math.max(1, (Math.min(end, now) - start) / (1000 * 60 * 60 * 24))

    return {
        chartData,
        detailedBreakdown,
        categories: Object.values(categoryAnalysis),
        budgetEfficiency,
        summary: {
            totalIncome,
            totalCost,
            totalExpense,
            totalOut,
            utility: totalIncome - totalOut,
            dailyAverage: totalOut / daysElapsed,
            projectedMonthly: (totalOut / daysElapsed) * 30,
            projectedNext30Days: totalOut + ((totalOut / daysElapsed) * 30)
        }
    }
}

/**
 * Reporte jerárquico financiero basado en el Plan de Cuentas.
 * Sumariza presupuesto y ejecución de hijos hacia padres.
 */
/**
 * Reporte jerárquico financiero basado en el Plan de Cuentas.
 * Sumariza presupuesto y ejecución de hijos hacia padres.
 */
export async function getFinancialTreeReport(filters: {
    startDate: string
    endDate: string
    companyId: number
    branchId?: number
    budgetId?: number
}) {
    const user = await requireAuth()
    const supabase = await createClient()
    enforceCompanyScope(user, filters.companyId)

    // 1. Obtener TODO el catálogo maestro (GlobalAccount) para la estructura base
    const { data: globalAccounts, error: gaError } = await supabase
        .from('GlobalAccount')
        .select('id, code, name, type, parentId, level, isMovementAccount')
        .order('code')

    if (gaError) throw new Error(`Error al obtener catálogo: ${gaError.message}`)

    // 2. Obtener cuentas activas de la empresa para mapeo
    const { data: companyAccounts, error: caError } = await supabase
        .from('CompanyAccount')
        .select('id, globalAccountId')
        .eq('companyId', filters.companyId)

    if (caError) throw new Error(`Error al obtener cuentas de empresa: ${caError.message}`)

    // Mapa para traducir companyAccountId -> globalAccountId
    const caToGaMap: Record<number, number> = {}
    companyAccounts.forEach(ca => {
        caToGaMap[ca.id] = ca.globalAccountId
    })

    // 3. Obtener Asignaciones Presupuestarias
    let allocationsQuery = supabase
        .from('BudgetAllocation')
        .select(`
            companyAccountId, 
            amountUSD, 
            consumedUSD,
            budget:Budget!inner(companyId, branchId, id)
        `)
        .eq('budget.companyId', filters.companyId)
    
    if (filters.budgetId) {
        allocationsQuery = allocationsQuery.eq('budgetId', filters.budgetId)
    }
    if (filters.branchId) {
        allocationsQuery = allocationsQuery.eq('budget.branchId', filters.branchId)
    }

    const { data: allocations, error: alError } = await allocationsQuery
    if (alError) throw alError

    // 4. Obtener Ingresos (que no suelen estar en BudgetAllocation)
    let incomesQuery = supabase
        .from('Income')
        .select('companyAccountId, amountUSD')
        .eq('companyId', filters.companyId)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
    
    if (filters.branchId) {
        incomesQuery = incomesQuery.eq('branchId', filters.branchId)
    }

    const { data: incomes, error: iError } = await incomesQuery
    if (iError) throw iError

    // 5. Construir Mapa de Cuentas inicializado con el catálogo global
    const accountMap: Record<number, any> = {}
    
    globalAccounts.forEach(ga => {
        accountMap[ga.id] = {
            globalId: ga.id,
            code: ga.code,
            name: ga.name,
            type: ga.type,
            parentId: ga.parentId,
            level: ga.level,
            isMovement: ga.isMovementAccount,
            budget: 0,
            executed: 0,
            available: 0,
            percent: 0,
            isActiveInCompany: false
        }
    })

    // Marcar cuentas que existen en la empresa
    companyAccounts.forEach(ca => {
        if (accountMap[ca.globalAccountId]) {
            accountMap[ca.globalAccountId].isActiveInCompany = true
        }
    })

    // 6. Cargar datos en las cuentas de movimiento (Leaf Nodes)
    allocations?.forEach(al => {
        const gid = caToGaMap[al.companyAccountId as number]
        if (gid && accountMap[gid]) {
            accountMap[gid].budget += Number(al.amountUSD)
            accountMap[gid].executed += Number(al.consumedUSD)
        }
    })

    incomes?.forEach(inc => {
        const gid = caToGaMap[inc.companyAccountId as number]
        if (gid && accountMap[gid]) {
            // Para el P&L, el ingreso ejecutado es el monto percibido
            accountMap[gid].executed += Number(inc.amountUSD)
        }
    })

    // 7. Agregación Recursiva (Bubble-up)
    // Ordenamos por nivel desc (5 -> 4 -> 3 -> 2 -> 1)
    const sortedIds = Object.keys(accountMap)
        .map(Number)
        .sort((a, b) => accountMap[b].level - accountMap[a].level)

    sortedIds.forEach(id => {
        const acc = accountMap[id]
        if (acc.parentId && accountMap[acc.parentId]) {
            accountMap[acc.parentId].budget += acc.budget
            accountMap[acc.parentId].executed += acc.executed
        }
    })

    // 8. Limpieza y Formateo Final
    const finalData = Object.values(accountMap)
        .filter((acc: any) => acc.budget !== 0 || acc.executed !== 0)
        .map((acc: any) => {
            const isIncome = acc.type === 'INCOME'
            
            // Para ingresos, el "disponible" es lo que hemos ganado (Ejecutado - Presupuesto)
            // Para gastos, es lo que nos queda por gastar (Presupuesto - Ejecutado)
            const available = isIncome 
                ? acc.executed - acc.budget 
                : acc.budget - acc.executed

            // Para ingresos, si no hay presupuesto, cualquier ejecución es 100% de éxito
            const percent = acc.budget > 0 
                ? (acc.executed / acc.budget) * 100 
                : (isIncome && acc.executed > 0 ? 100 : 0)

            return {
                ...acc,
                available,
                percent
            }
        })
        .sort((a: any, b: any) => a.code.localeCompare(b.code))

    return finalData
}
