import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Inicializar el cliente de Supabase con Service Role (ignora RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. SEGURIDAD: Verificar el secreto (solo Vercel o tú localmente deben conocerlo)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. SCRAPING: Extraer la tasa del BCV
    const urlTarget = 'https://www.bcv.org.ve/';
    
    // El BCV a veces tiene problemas con los certificados SSL de NodeJS, lo ignoramos para este scrapeo
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    // Desactivamos caché y fingimos ser un navegador para que no nos bloquee
    const response = await fetch(urlTarget, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    
    const $ = cheerio.load(html);
    
    // Extrayendo el valor del div con id "dolar" (ajusta si el BCV cambia su web)
    const rateText = $('#dolar strong').text().trim().replace(',', '.');
    const rateValue = parseFloat(rateText);

    // Extraer también el euro
    const eurText = $('#euro strong').text().trim().replace(',', '.');
    const eurValue = parseFloat(eurText) || 0;

    if (isNaN(rateValue) || rateValue <= 0) {
      throw new Error(`No se pudo extraer una tasa válida del HTML. Texto extraído: "${rateText}"`);
    }

    // 3. GUARDAR EN SUPABASE: Tabla "ExchangeRate" según tu esquema
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    // Upsert: Inserta si no existe, actualiza si ya existe la fecha de hoy
    const { error } = await supabase
      .from('ExchangeRate')
      .upsert(
        { date: today, usd: rateValue, eur: eurValue, updatedAt: new Date().toISOString() }, 
        { onConflict: 'date' } 
      );

    if (error) throw error;

    // 4. ÉXITO
    return NextResponse.json({ success: true, rate: rateValue, date: today });

  } catch (error: any) {
    console.error('Error en el cron job:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
