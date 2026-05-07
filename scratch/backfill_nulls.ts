import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function backfill() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  // 1. Invoices
  const { data: invs } = await supabase.from('Invoice').select('id, allocationId').is('companyAccountId', null)
  for (const inv of invs || []) {
     // Intenta heredar del rubro
     const { data: alloc } = await supabase.from('BudgetAllocation').select('companyAccountId').eq('id', inv.allocationId).single()
     if (alloc?.companyAccountId) {
         console.log(`Actualizando Invoice ${inv.id} con cuenta ${alloc.companyAccountId}`)
         await supabase.from('Invoice').update({ companyAccountId: alloc.companyAccountId }).eq('id', inv.id)
     } else {
         console.log(`Invoice ${inv.id} no tiene cuenta en su rubro. Borrando si es junk...`)
         // await supabase.from('Invoice').delete().eq('id', inv.id) // Comentado por seguridad
     }
  }

  // 2. BudgetAllocations
  const { data: allocs } = await supabase.from('BudgetAllocation').select('id, categoryId, subcategoryId, budget:Budget(companyId)').is('companyAccountId', null)
  for (const al of allocs || []) {
      const companyId = (al.budget as any)?.companyId
      if (companyId && al.categoryId) {
           // Intentar resolver desde CategoryAccountMapping
           const { data: map } = await supabase.from('CategoryAccountMapping')
             .select('companyAccountId')
             .eq('companyId', companyId)
             .eq('categoryId', al.categoryId)
             .maybeSingle()
           
           if (map?.companyAccountId) {
               console.log(`Actualizando BudgetAllocation ${al.id} con cuenta ${map.companyAccountId}`)
               await supabase.from('BudgetAllocation').update({ companyAccountId: map.companyAccountId }).eq('id', al.id)
           }
      }
  }
}

backfill()
