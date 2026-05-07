import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function runDiagnostics() {
  console.log('--- FASE 1: DIAGNÓSTICO DE BASE DE DATOS ---')

  const tables = [
    'GlobalAccount',
    'CompanyAccount',
    'CategoryAccountMapping',
    'BudgetAllocation',
    'Invoice',
    'Income',
    'BudgetAdjustment'
  ]

  console.log('\n1. Verificando Tablas:')
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`)
    } else {
      console.log(`✅ ${table}: Existe (Total: ${data?.length || 0})`)
    }
  }

  console.log('\n2. Conteos por Tipo en GlobalAccount:')
  const { data: counts, error: countErr } = await supabase
    .from('GlobalAccount')
    .select('type')
  if (countErr) {
    console.log(`❌ Error: ${countErr.message}`)
  } else {
    const typeCounts = counts.reduce((acc: any, curr: any) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1
      return acc
    }, {})
    console.table(typeCounts)
  }

  console.log('\n3. Cuentas Raíz (Nivel 1):')
  const { data: roots, error: rootErr } = await supabase
    .from('GlobalAccount')
    .select('code, name, type, level')
    .eq('level', 1)
    .order('code')
  if (rootErr) {
    console.log(`❌ Error: ${rootErr.message}`)
  } else {
    console.table(roots)
  }

  console.log('\n4. Activaciones por Empresa:')
  const { data: activations, error: actErr } = await supabase
    .from('CompanyAccount')
    .select('companyId')
  if (actErr) {
    console.log(`❌ Error: ${actErr.message}`)
  } else {
    const companyCounts = activations.reduce((acc: any, curr: any) => {
      acc[curr.companyId] = (acc[curr.companyId] || 0) + 1
      return acc
    }, {})
    console.table(companyCounts)
  }

  console.log('\n5. Muestra de CompanyAccount + GlobalAccount:')
  const { data: joinData, error: joinErr } = await supabase
    .from('CompanyAccount')
    .select('id, companyId, isActive, globalAccount:GlobalAccount(code, name, type)')
    .limit(5)
  if (joinErr) {
    console.log(`❌ Error: ${joinErr.message}`)
  } else {
    console.log(JSON.stringify(joinData, null, 2))
  }

  console.log('\n6. Verificando campos companyAccountId en transacciones:')
  const transactions = ['BudgetAllocation', 'Invoice', 'Income', 'BudgetAdjustment']
  for (const t of transactions) {
     const { data, error } = await supabase.from(t).select('id, companyAccountId').limit(10)
     if (error) {
         console.log(`❌ ${t}: Error - ${error.message}`)
     } else {
         const hasColumn = data.length > 0 ? 'companyAccountId' in data[0] : 'Desconocido'
         const withAccount = data.filter(i => i.companyAccountId).length
         console.log(`✅ ${t}: Columna presente: ${hasColumn}, Muestra con valor: ${withAccount}/${data.length}`)
     }
  }
}

runDiagnostics().catch(err => console.error(err))
