"use client"

import { useState } from "react"
import { Bell, X, Check, AlertCircle, AlertTriangle, Loader2 } from "lucide-react"
import { markAlertAsRead, markAllAlertsAsRead } from "@/features/alerts/server/actions"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type Alert = {
    id: number
    type: string
    title: string
    message: string
    createdAt: string
}

export function AlertCenter({ initialAlerts }: { initialAlerts: Alert[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [alerts, setAlerts] = useState(initialAlerts)
    const [isLoading, setIsLoading] = useState(false)

    const unreadCount = alerts.length

    const handleMarkAsRead = async (id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id))
        await markAlertAsRead(id)
    }

    const handleMarkAll = async () => {
        setIsLoading(true)
        await markAllAlertsAsRead()
        setAlerts([])
        setIsLoading(false)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-zinc-400 hover:text-foreground transition-all group p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
                <Bell className={`h-[18px] w-[18px] ${unreadCount > 0 ? 'animate-swing origin-top' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950 flex items-center justify-center text-[7px] text-white font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAll}
                                    disabled={isLoading}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                                >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Marcar todas
                                </button>
                            )}
                        </div>

                        <div className="max-h-[350px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
                            {alerts.length > 0 ? (
                                alerts.map(alert => (
                                    <div key={alert.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group relative">
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                alert.type === 'BUDGET_EXCEEDED' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                                            }`}>
                                                {alert.type === 'BUDGET_EXCEEDED' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col gap-1 pr-6">
                                                <span className="text-[13px] font-bold text-foreground leading-tight">{alert.title}</span>
                                                <p className="text-[11px] text-zinc-500 leading-normal">{alert.message}</p>
                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleMarkAsRead(alert.id)}
                                            className="absolute top-4 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-zinc-400 hover:text-zinc-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-zinc-300" />
                                    </div>
                                    <p className="text-sm text-zinc-500 font-medium italic">Sin alertas pendientes</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 text-center ">
                            <button className="text-[11px] font-bold text-zinc-500 hover:text-foreground transition-colors">Ver historial completo ↳</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
