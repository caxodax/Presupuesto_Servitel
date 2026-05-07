import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: inv } = await supabase.from('Invoice').select('*, allocation:BudgetAllocation(*)').eq('id', 2).single()
  console.log(JSON.stringify(inv, null, 2))
}
check()
