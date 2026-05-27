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

    // 2. No hay en DB para hoy, NO sincronizamos durante el render para evitar bucles.
    // El sistema debe depender de un cron job o de una acción manual del admin para sincronizar.
    console.warn("No rate found for today in DB, skipping auto-sync during render to prevent re-validation loops.")

    // 3. Si falla el sync o no hubo resultados, buscar la más reciente que tengamos
    // Usamos una estrategia silenciosa para no romper el renderizado del servidor
    try {
        const latest = await getLatestSavedRate()
        if (latest) return { usd: latest.usd, eur: latest.eur, source: 'Database (Last available)' }
    } catch (e) {
        console.error("Error getting latest rate:", e)
    }
    
    // 4. Si ni siquiera hay históricos, usar DolarAPI directamente (nunca scraping de BCV en renderizado para evitar bloqueos)
    try {
        const fallbackRes = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
            next: { revalidate: 3600 } // Cache por 1 hora
        });
        if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            return { 
                usd: data.promedio || 0, 
                eur: 0, 
                source: 'DolarAPI (Direct Fallback)' 
            }
        }
    } catch (e) {
        console.error("Error al consultar fallback directo de DolarAPI:", e)
    }

    return { 
        usd: 0, 
        eur: 0, 
        source: 'Sin tasa disponible' 
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

