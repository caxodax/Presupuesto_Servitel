import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCriticalAccounts() {
    console.log('--- TEST: CUENTAS CRÍTICAS ---')

    // Hacemos el query simulando getExecutiveAnalytics
    const { data, error } = await supabase
        .from('BudgetAllocation')
        .select(`
            amountUSD,
            consumedUSD,
            companyAccount:CompanyAccount(
                globalAccount:GlobalAccount(
                    code,
                    name
                )
            ),
            budget:Budget(
                id,
                companyId,
                branchId,
                company:Company(
                    groupId
                )
            )
        `)
        .gt('amountUSD', 0)

    if (error) {
        console.error('Error fetching allocations:', error)
        return
    }

    console.log(`Fetched ${data?.length || 0} allocations.`)

    // Procesamos y calculamos el porcentaje
    const mapped = (data || [])
        .map((row: any) => {
            const ga = row.companyAccount?.globalAccount
            const budget = Number(row.amountUSD || 0)
            const consumed = Number(row.consumedUSD || 0)
            const percent = budget > 0 ? (consumed / budget) * 100 : 0
            return {
                code: ga?.code || 'N/A',
                name: ga?.name || 'N/A',
                budget,
                consumed,
                percent
            }
        })
        .filter(item => item.consumed > 0) // solo con consumo
        .sort((a, b) => b.percent - a.percent || b.consumed - a.consumed)
        .slice(0, 5)

    console.log('Top Critical Accounts:')
    console.table(mapped)
}

testCriticalAccounts().catch(console.error)
