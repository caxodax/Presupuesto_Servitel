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
        try {
            // El valor está en un <strong> (que puede tener clases) cercano al div con el id de la moneda
            // Usamos un regex más flexible que permite atributos en el tag strong
            const regex = new RegExp(`id="${currencyId}"[\\s\\S]*?<strong[^>]*>\\s*([^<]+)\\s*</strong>`, 'i');
            const match = html.match(regex);
            
            if (match && match[1]) {
                const cleanValue = match[1].replace(/\./g, '').replace(',', '.').trim();
                const rate = parseFloat(cleanValue);
                return isNaN(rate) ? null : rate;
            }
        } catch (e) {
            console.error(`Error extracting rate for ${currencyId}:`, e);
        }
        return null;
    };

    const usd = extractRate("dolar");
    const eur = extractRate("euro");
    
    // Buscar la fecha de vigencia (suele estar en un span con clase date-display-single)
    const dateMatch = html.match(/class="date-display-single"[^>]*>([^<]+)</) || html.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)</);
    const date = dateMatch ? dateMatch[1].trim() : null;

    if (!usd) {
         console.warn("BCV Scraper: No se encontró la tasa USD en el HTML. Intentando fallback...");
         throw new Error("No se encontraron los campos de tasa en el HTML");
    }

    return {
      success: true,
      rates: { usd, eur: eur || 0 },
      validDate: date,
      source: "BCV Oficial"
    };

  } catch (error) {
    console.error("BCV Scraping Error:", error instanceof Error ? error.message : error);
    
    // FALLBACK: Si el BCV falla (página caída o estructura cambiada), usamos DolarAPI como respaldo de confianza
    try {
        console.log("Iniciando fallback a DolarAPI...");
        const fallbackRes = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
            next: { revalidate: 3600 } // Cache por 1 hora
        });
        
        if (!fallbackRes.ok) throw new Error(`DolarAPI respondió con status ${fallbackRes.status}`);
        
        const data = await fallbackRes.json();
        return {
            success: true,
            rates: { usd: data.promedio, eur: 0 }, // DolarAPI se enfoca en USD
            source: "DolarAPI (Fallback)",
            error: "Portal BCV fuera de línea o estructura modificada"
        };
    } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
        return { 
            success: false, 
            rates: null,
            error: "Todos los servicios de tasa están fuera de línea" 
        };
    }
  }
}
