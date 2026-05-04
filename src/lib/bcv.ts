/**
 * Script de Scraping Seguro para el Banco Central de Venezuela
 * Este script obtiene las tasas de USD y EUR directamente del sitio oficial.
 */

export async function getBCVRate() {
  const url = "https://www.bcv.org.ve/";
  
  try {
    const html = await new Promise<string>((resolve, reject) => {
        const https = require('https');
        const options = {
            hostname: 'www.bcv.org.ve',
            path: '/',
            method: 'GET',
            rejectUnauthorized: false, // Ignorar errores de certificado
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const req = https.request(options, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', (e: any) => reject(e));
        req.end();
    });

    // Función simple de extracción por Regex para no depender de librerías extras si no es necesario
    const extractRate = (currencyId: string) => {
        // El valor está en un <strong> cercano al div con el id de la moneda
        // Buscamos el ID y luego el primer <strong> que aparezca después
        const regex = new RegExp(`id="${currencyId}"[\\s\\S]*?<strong>\\s*([^<]+)\\s*</strong>`, 'i');
        const match = html.match(regex);
        if (match && match[1]) {
            return parseFloat(match[1].replace(',', '.').trim());
        }
        return null;
    };

    const usd = extractRate("dolar");
    const eur = extractRate("euro");
    const dateMatch = html.match(/class="date-display-single"[^>]*>([^<]+)</);
    const date = dateMatch ? dateMatch[1].trim() : null;

    if (!usd || !eur) {
         throw new Error("No se encontraron los campos de tasa en el HTML");
    }

    return {
      success: true,
      rates: { usd, eur },
      validDate: date,
      source: "BCV Oficial"
    };

  } catch (error) {
    console.error("BCV Scraping Error:", error);
    
    // FALLBACK: Si el BCV falla (página caída), usamos DolarAPI como respaldo de confianza
    try {
        const fallbackRes = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
        const data = await fallbackRes.json();
        return {
            success: true,
            rates: { usd: data.promedio, eur: null }, // DolarAPI se enfoca en USD
            source: "DolarAPI (Fallback)",
            error: "Portal BCV fuera de línea temporalmente"
        };
    } catch {
        return { success: false, error: "Todos los servicios de tasa están fuera de línea" };
    }
  }
}
