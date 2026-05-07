import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  const { count: invNulls } = await supabase.from('Invoice').select('*', { count: 'exact', head: true }).is('companyAccountId', null)
  const { count: incNulls } = await supabase.from('Income').select('*', { count: 'exact', head: true }).is('companyAccountId', null)
  const { count: allNulls } = await supabase.from('BudgetAllocation').select('*', { count: 'exact', head: true }).is('companyAccountId', null)

  console.log({ invNulls, incNulls, allNulls })
}

check()
