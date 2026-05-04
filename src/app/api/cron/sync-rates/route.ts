import { syncDailyExchangeRate } from "@/features/exchange/server/actions"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    
    // Si tienes CRON_SECRET en el .env, lo validamos
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 })
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
