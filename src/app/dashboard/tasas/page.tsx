import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/permissions"
import { RatesManagerClient } from "@/components/exchange/RatesManagerClient"

export default async function ExchangeRatesPage() {
    const user = await requireAuth()
    
    if (user.role !== 'SUPER_ADMIN') {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold">Acceso Denegado</h1>
                <p>Solo el Súper Administrador puede gestionar las tasas de cambio.</p>
            </div>
        )
    }

    const supabase = createClient()
    const { data: rates } = await supabase
        .from('ExchangeRate')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)

    return (
        <div className="flex flex-col gap-6 pb-12">
            <RatesManagerClient initialRates={rates || []} />
        </div>
    )
}
