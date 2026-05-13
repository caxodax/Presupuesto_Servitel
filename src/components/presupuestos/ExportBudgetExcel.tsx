"use client"

import * as XLSX from 'xlsx'
import { FileDown } from "lucide-react"

type Allocation = {
    id: number
    amountUSD: number
    consumedUSD: number
    category?: { name: string } | null
    subcategory?: { name: string } | null
    account?: { code?: string, name: string } | null
    companyAccount?: { globalAccount: { code: string, name: string } } | null
}

type Props = {
    allocations: Allocation[]
    budgetName: string
}

export function ExportBudgetExcel({ allocations, budgetName }: Props) {
    const handleExport = () => {
        const totalBudget = allocations.reduce((sum, alloc) => sum + Number(alloc.amountUSD), 0)

        // Preparar datos planos para Excel
        const data = allocations.map(alloc => {
            const weight = totalBudget > 0 ? (Number(alloc.amountUSD) / totalBudget) * 100 : 0
            const execution = Number(alloc.amountUSD) > 0 ? (Number(alloc.consumedUSD) / Number(alloc.amountUSD)) * 100 : 0
            const available = Number(alloc.amountUSD) - Number(alloc.consumedUSD)
            const code = alloc.companyAccount?.globalAccount?.code || alloc.account?.code || 'S/C'
            const name = alloc.companyAccount?.globalAccount?.name || alloc.account?.name || 'Sin nombre'

            return {
                "Código Cuenta": code,
                "Nombre Cuenta": name,
                "Peso (%)": weight.toFixed(2),
                "Límite Aprobado (USD)": Number(alloc.amountUSD),
                "Consumido (USD)": Number(alloc.consumedUSD),
                "Disponible (USD)": available,
                "% Ejecución": execution.toFixed(2)
            }
        })

        // Crear Libro y Hoja
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Ejecución Presupuestaria")

        // Generar archivo
        const fileName = `Ejecucion_${budgetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)
    }

    return (
        <button
            onClick={handleExport}
            className="h-10 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 hover:opacity-90 shadow-xl shadow-zinc-900/10 dark:shadow-none"
        >
            <FileDown className="w-3.5 h-3.5" />
            Exportar Excel
        </button>
    )
}
