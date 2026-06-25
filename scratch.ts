import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function test() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_get_recent_activity`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_limit: 6
    })
  })
  
  const text = await res.text()
  console.log("STATUS:", res.status)
  console.log("RESPONSE:", text)
}

test()
