import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function force() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  // 1. Encontrar una cuenta cualquiera para la empresa 3 (Foxbyte)
  const { data: acc } = await supabase.from('CompanyAccount').select('id').eq('companyId', 3).limit(1).single()
  if (!acc) {
      console.log("No se encontró cuenta para empresa 3")
      return
  }

  console.log(`Usando cuenta dummy ${acc.id} para backfill`)

  await supabase.from('BudgetAllocation').update({ companyAccountId: acc.id }).is('companyAccountId', null)
  await supabase.from('Invoice').update({ companyAccountId: acc.id }).is('companyAccountId', null)
  await supabase.from('Income').update({ companyAccountId: acc.id }).is('companyAccountId', null)

  console.log("Backfill final completado.")
}

force()
