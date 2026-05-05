import { getAccountById } from "./queries"

export async function validateAccountForBudget(accountId: number) {
    const account = await getAccountById(accountId)
    if (!account.isActive) throw new Error("La cuenta seleccionada está inactiva.")
    if (!account.isBudgetable) throw new Error("La cuenta seleccionada no es presupuestable.")
}

export async function validateAccountForExpense(accountId: number) {
    const account = await getAccountById(accountId)
    if (!account.isActive) throw new Error("La cuenta seleccionada está inactiva.")
    if (!account.isExecutable) throw new Error("La cuenta seleccionada no permite ejecución directa.")
    if (!['COST', 'EXPENSE'].includes(account.type)) {
        throw new Error(`Tipo de cuenta inválido para gastos: ${account.type}. Debe ser COST o EXPENSE.`)
    }
}

export async function validateAccountForIncome(accountId: number) {
    const account = await getAccountById(accountId)
    if (!account.isActive) throw new Error("La cuenta seleccionada está inactiva.")
    if (!account.isExecutable) throw new Error("La cuenta seleccionada no permite ejecución directa.")
    if (account.type !== 'INCOME') {
        throw new Error(`Tipo de cuenta inválido para ingresos: ${account.type}. Debe ser INCOME.`)
    }
}
