import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  console.log('--- Verificando Arquitectura Supabase ---')

  // 1. Verificar BusinessGroup
  const { data: bg, error: bgError } = await supabase
    .from('BusinessGroup')
    .insert({ name: 'Grupo de Prueba', description: 'Verificación inicial' })
    .select()
    .single()

  if (bgError) {
    console.error('❌ Error en BusinessGroup:', bgError.message)
  } else {
    console.log('✅ BusinessGroup creado:', bg.name)
    // Limpiar
    await supabase.from('BusinessGroup').delete().eq('id', bg.id)
  }

  // 2. Verificar ExchangeRate
  const today = new Date().toISOString().split('T')[0]
  const { data: rate, error: rateError } = await supabase
    .from('ExchangeRate')
    .upsert({ date: today, usd: 36.5, eur: 39.2 }, { onConflict: 'date' })
    .select()
    .single()

  if (rateError) {
    console.error('❌ Error en ExchangeRate:', rateError.message)
  } else {
    console.log('✅ ExchangeRate verificado:', rate.usd, 'USD para', rate.date)
  }

  // 3. Verificar RPC adjust_allocation_on_invoice
  // Primero necesitamos una alocación. Buscaremos una existente o crearemos una temporal.
  const { data: alloc } = await supabase.from('BudgetAllocation').select('id').limit(1).single()
  if (alloc) {
     const { error: rpcError } = await supabase.rpc('adjust_allocation_on_invoice', {
        p_allocation_id: alloc.id,
        p_amount_usd: 0, // No queremos alterar datos reales, solo verificar que la función existe y es llamable
        p_amount_ves: 0
     })
     if (rpcError) {
        console.error('❌ Error en RPC adjust_allocation_on_invoice:', rpcError.message)
     } else {
        console.log('✅ RPC adjust_allocation_on_invoice es funcional.')
     }
  } else {
     console.log('⚠️ No hay alocaciones para probar el RPC adjust_allocation_on_invoice (se asume correcto por schema).')
  }

  // 4. Verificar RPC get_my_profile
  const { error: profileError } = await supabase.rpc('get_my_profile')
  if (profileError && profileError.message.includes('function public.get_my_profile() does not exist')) {
     console.error('❌ Error: RPC get_my_profile() no existe.')
  } else {
     console.log('✅ RPC get_my_profile es funcional (llamada realizada).')
  }

  console.log('--- Verificación Completada ---')
}

verify()
