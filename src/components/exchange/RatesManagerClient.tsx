"use client"

import { useState, useTransition } from "react"
import { 
    TrendingUp, 
    RefreshCcw, 
    Upload, 
    Calendar, 
    DollarSign, 
    Euro, 
    Loader2, 
    AlertCircle,
    CheckCircle2,
    Save
} from "lucide-react"
import { syncDailyExchangeRate, saveHistoricalRate } from "@/features/exchange/server/actions"
import { toast } from "sonner"

export function RatesManagerClient({ initialRates }: { initialRates: any[] }) {
    const [rates, setRates] = useState(initialRates)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isPendingMass, startTransitionMass] = useTransition()
    const [massData, setMassData] = useState("")

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const result = await syncDailyExchangeRate()
            if (result.action === 'error') {
                toast.error("Error: " + result.error)
            } else if (result.rates) {
                toast.success(`Tasa sincronizada: ${result.rates.usd} USD / ${result.rates.eur} EUR`)
                // Recargar
                window.location.reload()
            }
        } catch (error: any) {
            toast.error("Error al sincronizar: " + error.message)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleMassLoad = () => {
        const lines = massData.split('\n').filter(l => l.trim())
        if (lines.length === 0) return

        startTransitionMass(async () => {
            let successCount = 0
            for (const line of lines) {
                // Formato esperado: YYYY-MM-DD,USD,EUR
                const [date, usd, eur] = line.split(',').map(s => s.trim())
                if (date && usd) {
                    try {
                        await saveHistoricalRate(date, parseFloat(usd), parseFloat(eur || "0"))
                        successCount++
                    } catch (e) {
                        console.error(`Error en linea ${line}:`, e)
                    }
                }
            }
            toast.success(`Carga completada: ${successCount} registros procesados.`)
            setMassData("")
            window.location.reload()
        })
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-500/5">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl shadow-inner">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Gestor de Tasas</h1>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Control cambiario oficial BCV</p>
                    </div>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="h-14 px-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-zinc-500/20"
                >
                    {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                    Sincronizar Hoy
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Historico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Historial Reciente
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Fecha</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">USD ($)</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">EUR (€)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                    {rates.map((rate: any) => (
                                        <tr key={rate.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-8 py-4">
                                                <span className="font-bold text-zinc-600 dark:text-zinc-300">
                                                    {new Date(rate.date + 'T00:00:00').toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="font-black text-foreground">{Number(rate.usd).toFixed(4)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Euro className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="font-bold text-zinc-500">{Number(rate.eur).toFixed(4)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rates.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-20 text-center text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                                                No hay registros disponibles
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Carga Masiva */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 pb-2">
                            <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-xl">
                                <Upload className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-foreground">Carga Masiva</h3>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Importación de históricos</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Formato: YYYY-MM-DD, USD, EUR
                            </label>
                            <textarea 
                                value={massData}
                                onChange={(e) => setMassData(e.target.value)}
                                rows={8}
                                placeholder="2024-05-01, 36.45, 39.12&#10;2024-05-02, 36.50, 39.20"
                                className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                            />
                            
                            <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                    <strong>Nota:</strong> Los registros con fechas ya existentes serán actualizados con los nuevos valores proporcionados.
                                </p>
                            </div>

                            <button 
                                onClick={handleMassLoad}
                                disabled={isPendingMass || !massData.trim()}
                                className="w-full h-14 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/20"
                            >
                                {isPendingMass ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Procesar Carga
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
