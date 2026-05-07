import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: invs } = await supabase.from('Invoice').select('id, companyAccountId').eq('allocationId', 1)
  console.log('Invoices for Allocation 1:', invs)
}
check()
