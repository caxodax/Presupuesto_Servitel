import { syncDailyExchangeRate } from "@/features/exchange/server/actions"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    // Verificación de seguridad
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // En producción, es obligatorio tener un secreto configurado
    if (process.env.NODE_ENV === 'production' && !cronSecret) {
        console.error("CRITICAL: CRON_SECRET no está configurado en producción.");
        return new NextResponse('Error de configuración de seguridad', { status: 500 });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('No autorizado', { status: 401 });
    }

    try {
        const result = await syncDailyExchangeRate()
        return NextResponse.json({
            success: true,
            message: `Tasa sincronizada: ${result.action}`,
            data: result
        })
    } catch (error: any) {
        console.error("Cron Job Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
