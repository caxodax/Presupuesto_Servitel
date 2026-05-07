import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'Income' }) // Si existe este rpc, o usar query
  // Mejor usamos un select head
  const { data } = await supabase.from('Income').select('*').limit(1)
  console.log('Income columns:', Object.keys(data?.[0] || {}))
}
check()
