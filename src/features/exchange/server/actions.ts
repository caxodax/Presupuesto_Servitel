"use server"
import { createClient } from "@/lib/supabase/server"
import { getBCVRate } from "@/lib/bcv"

/**
 * Sincroniza la tasa del día desde el BCV a la base de datos.
 * Evita duplicados para la misma fecha.
 */
export async function syncDailyExchangeRate() {
    const supabase = await createClient()
    const result = await getBCVRate()

    if (!result.success || !result.rates) {
        return { action: 'error', error: result.error || "No se pudo obtener la tasa" }
    }

    const { usd, eur } = result.rates
    // Usamos la fecha del sistema o la del BCV si es confiable. 
    // Para normalizar, usamos la fecha actual en formato YYYY-MM-DD.
    const today = new Date().toISOString().split('T')[0]

    // Verificar si ya existe para hoy
    const { data: existing } = await supabase
        .from('ExchangeRate')
        .select('id')
        .eq('date', today)
        .maybeSingle()

    if (existing) {
        // Actualizar si ya existe (por si cambió durante el día)
        const { error } = await supabase
            .from('ExchangeRate')
            .update({
                usd,
                eur: eur || 0,
                updatedAt: new Date().toISOString()
            })
            .eq('id', existing.id)
        
        if (error) throw error
        return { action: 'updated', date: today, rates: { usd, eur } }
    } else {
        // Insertar nuevo
        const { error } = await supabase
            .from('ExchangeRate')
            .insert({
                date: today,
                usd,
                eur: eur || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        
        if (error) throw error
        return { action: 'created', date: today, rates: { usd, eur } }
    }
}

/**
 * Guarda una tasa histórica específica.
 */
export async function saveHistoricalRate(date: string, usd: number, eur: number) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('ExchangeRate')
        .upsert({
            date,
            usd,
            eur,
            updatedAt: new Date().toISOString()
        }, { onConflict: 'date' })

    if (error) throw error
    return { success: true }
}

/**
 * Obtiene la tasa efectiva para el día de hoy.
 * 1. Busca en la DB.
 * 2. Si no hay (o es vieja), intenta sincronizar del BCV.
 * 3. Si el BCV falla, usa el fallback y guarda.
 */
export async function getEffectiveRate() {
    const today = new Date().toISOString().split('T')[0]
    const supabase = await createClient()

    // 1. Intentar DB
    const { data: existing } = await supabase
        .from('ExchangeRate')
        .select('*')
        .eq('date', today)
        .maybeSingle()
    
    if (existing) return { usd: existing.usd, eur: existing.eur, source: 'Database' }

    // 2. No hay en DB para hoy, sincronizar
    try {
        const synced = await syncDailyExchangeRate()
        if (synced.action !== 'error' && synced.rates) {
            return { usd: synced.rates.usd, eur: synced.rates.eur, source: 'BCV (Auto-sync)' }
        }
        throw new Error(synced.error || "Sync failed")
    } catch (error) {
        console.error("Auto-sync failed, using latest available or fallback:", error)
        
        // 3. Si falla el sync, buscar la más reciente que tengamos
        const latest = await getLatestSavedRate()
        if (latest) return { usd: latest.usd, eur: latest.eur, source: 'Database (Last available)' }
        
        // 4. Si ni siquiera hay históricos, usar scraping directo (que tiene el fallback a DolarAPI)
        const direct = await getBCVRate()
        return { usd: direct.rates?.usd || 0, eur: direct.rates?.eur || 0, source: direct.source }
    }
}

/**
 * Obtiene la tasa más reciente disponible.
 */
export async function getLatestSavedRate() {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('ExchangeRate')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
    
    if (error) return null
    return data
}

