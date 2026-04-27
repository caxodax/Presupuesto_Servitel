import { NextResponse } from "next/server";
import { getBCVRate } from "@/lib/bcv";
import { createClient } from "@supabase/supabase-js";

// Usamos la Service Role Key para asegurar que el Cron pueda escribir sin restricciones de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verificación de seguridad (opcional: puedes añadir un API_KEY en los headers del Cron)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  const result = await getBCVRate();

  if (!result.success || !result.rates) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { usd, eur } = result.rates;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Intentamos insertar o actualizar (upsert) la tasa del día actual
    const { error } = await supabaseAdmin
      .from('ExchangeRate')
      .upsert({
        date: today,
        usd: usd,
        eur: eur || 0,
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'date'
      });

    if (error) throw error;

    return NextResponse.json({
      message: "Tasas actualizadas correctamente",
      date: today,
      rates: { usd, eur },
      source: result.source
    });

  } catch (error: any) {
    console.error("Error guardando tasas en DB:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
