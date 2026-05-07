import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function cleanup() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  // Borrar facturas sin cuenta (son junk/test)
  const { data: badInvoices } = await supabase.from('Invoice').select('id').is('companyAccountId', null)
  for (const inv of badInvoices || []) {
      console.log(`Borrando Invoice ${inv.id} sin cuenta contable`)
      await supabase.from('Invoice').delete().eq('id', inv.id)
  }

  // Borrar asignaciones sin cuenta (son junk/test)
  const { data: badAllocs } = await supabase.from('BudgetAllocation').select('id').is('companyAccountId', null)
  for (const al of badAllocs || []) {
      console.log(`Borrando BudgetAllocation ${al.id} sin cuenta contable`)
      // Intentar borrar; si falla por FKs, asignar una cuenta dummy o reportar
      const { error } = await supabase.from('BudgetAllocation').delete().eq('id', al.id)
      if (error) {
          console.error(`No se pudo borrar allocation ${al.id}: ${error.message}`)
          // Si no se puede borrar, buscar una cuenta de la empresa y asignarla
          const { data: budget } = await supabase.from('Budget').select('companyId').eq('id', (al as any).budgetId).single()
          const { data: firstAcc } = await supabase.from('CompanyAccount').select('id').eq('companyId', budget?.companyId).limit(1).single()
          if (firstAcc) {
              await supabase.from('BudgetAllocation').update({ companyAccountId: firstAcc.id }).eq('id', al.id)
          }
      }
  }

  // Verificar Incomes
  const { count: incNulls } = await supabase.from('Income').select('*', { count: 'exact', head: true }).is('companyAccountId', null)
  console.log(`Ingresos sin cuenta: ${incNulls}`)
}

cleanup()
