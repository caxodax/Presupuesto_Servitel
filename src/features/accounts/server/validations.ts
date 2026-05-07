import { getAccountById } from "./queries"

export interface AccountValidationParams {
  companyAccountId: number
  companyId: number
  requiredTypes?: string[]
  requireActive?: boolean
  requireBudgetable?: boolean
  requireExecutable?: boolean
}

/**
 * Validador centralizado de acceso y reglas de cuentas contables por empresa.
 */
export async function validateCompanyAccountAccess(params: AccountValidationParams) {
  const { 
    companyAccountId, 
    companyId, 
    requiredTypes, 
    requireActive = true, 
    requireBudgetable, 
    requireExecutable 
  } = params

  const account = await getAccountById(companyAccountId)
  
  if (!account) {
    throw new Error("La cuenta contable no existe.")
  }

  // Validar pertenencia a la empresa
  if (Number(account.companyId) !== Number(companyId)) {
    throw new Error("Seguridad: La cuenta seleccionada no pertenece a su empresa.")
  }

  // Validar estado activo (considerar tanto el global como el override de la empresa)
  if (requireActive && !account.isActive) {
    throw new Error(`La cuenta ${account.code} - ${account.name} está inactiva.`)
  }

  // Validar tipo de cuenta
  if (requiredTypes && requiredTypes.length > 0 && !requiredTypes.includes(account.type)) {
    throw new Error(`Tipo de cuenta inválido. Se esperaba uno de: ${requiredTypes.join(", ")}, pero se recibió: ${account.type}`)
  }

  // Validar si es presupuestable (usar override si existe, sino el global)
  if (requireBudgetable) {
    const isBudgetable = account.isBudgetableOverride !== null 
      ? account.isBudgetableOverride 
      : account.globalAccount.isBudgetable
    
    if (!isBudgetable) {
      throw new Error(`La cuenta ${account.code} no está configurada como presupuestable.`)
    }
  }

  // Validar si es ejecutable
  if (requireExecutable) {
    const isExecutable = account.isExecutableOverride !== null 
      ? account.isExecutableOverride 
      : account.globalAccount.isExecutable
    
    if (!isExecutable) {
      throw new Error(`La cuenta ${account.code} no permite ejecución directa (movimientos).`)
    }
  }

  return account
}

export async function validateAccountForBudget(accountId: number, companyId: number) {
    return validateCompanyAccountAccess({
        companyAccountId: accountId,
        companyId,
        requireBudgetable: true
    })
}

export async function validateAccountForExpense(accountId: number, companyId: number) {
    return validateCompanyAccountAccess({
        companyAccountId: accountId,
        companyId,
        requiredTypes: ['COST', 'EXPENSE'],
        requireExecutable: true
    })
}

export async function validateAccountForIncome(accountId: number, companyId: number) {
    return validateCompanyAccountAccess({
        companyAccountId: accountId,
        companyId,
        requiredTypes: ['INCOME'],
        requireExecutable: true
    })
}
