"use client"

import { useState, useTransition, useEffect } from "react"
import { fetchReportAction } from "@/features/reports/server/actions"
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { 
    Calendar, 
    Download, 
    Filter, 
    Loader2, 
    TrendingUp, 
    TrendingDown, 
    DollarSign,
    PieChart as PieIcon,
    BarChart3,
    LayoutDashboard,
    TableProperties,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Info
} from "lucide-react"
import { ReportsSkeleton } from "./ReportsSkeleton"
import { toast } from "sonner"
import * as XLSX from "xlsx"

type ReportsClientProps = {
    companies: any[]
    branches: any[]
    categories: any[]
    businessGroups: any[]
    userRole: string
    initialCompanyId?: number
}

type Filters = {
    startDate: string
    endDate: string
    companyId?: number
    branchId?: number
    categoryId?: number
    subcategoryId?: number
    groupId?: number
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ReportsClient({ companies, branches, categories, businessGroups, userRole, initialCompanyId }: ReportsClientProps) {
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<'visual' | 'analytical'>('visual')
    const [reportData, setReportData] = useState<any>(null)
    const [filters, setFilters] = useState<Filters>({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        companyId: initialCompanyId || (companies.length > 0 ? companies[0].id : undefined),
        branchId: undefined,
        categoryId: undefined,
        subcategoryId: undefined,
        groupId: undefined
    })

    const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
    const branchesList = Array.isArray(branches) ? branches : (branches as any).items || []

    const filteredCompanies = filters.groupId 
        ? companiesList.filter((c: any) => Number(c.groupId) === Number(filters.groupId))
        : companiesList

    const filteredBranches = branchesList.filter((b: any) => Number(b.companyId) === Number(filters.companyId))
    const filteredCategories = categories.filter(c => Number(c.companyId) === Number(filters.companyId))
    
    const loadReport = () => {
        startTransition(async () => {
            try {
                const data = await fetchReportAction(filters)
                setReportData(data)
            } catch (e: any) {
                toast.error("Error al generar reporte")
            }
        })
    }

    useEffect(() => {
        loadReport()
    }, [filters.companyId])

    const exportToExcel = () => {
        if (!reportData) return
        
        const wb = XLSX.utils.book_new()
        
        // 1. Resumen
        const summaryData = [
            ["Métrica", "Valor"],
            ["Ingresos Totales", reportData.summary.totalIncome],
            ["Egresos Totales", reportData.summary.totalExpense],
            ["Balance Neto", reportData.summary.totalIncome - reportData.summary.totalExpense],
            ["Fecha Inicio", filters.startDate],
            ["Fecha Fin", filters.endDate]
        ]
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")

        // 2. Detalle Analítico (NUEVO)
        const wsDetailed = XLSX.utils.json_to_sheet(reportData.detailedBreakdown)
        XLSX.utils.book_append_sheet(wb, wsDetailed, "Detalle Analítico")

        // 3. Categorías
        const wsCategories = XLSX.utils.json_to_sheet(reportData.categories)
        XLSX.utils.book_append_sheet(wb, wsCategories, "Categorías")

        XLSX.writeFile(wb, `BI_Presupuesto_Servitel_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    if (!reportData && isPending) return <ReportsSkeleton />

    const balance = reportData ? reportData.summary.totalIncome - reportData.summary.totalExpense : 0
    const isProfit = balance >= 0

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header & Advanced Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        Business Intelligence
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" /> Análisis estratégico de rendimiento y flujos de caja.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-[28px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
                    {userRole === 'SUPER_ADMIN' && (
                        <>
                            <div className="flex flex-col gap-0.5 px-4 border-r border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Matriz / Sector</span>
                                <select 
                                    value={filters.groupId || ''}
                                    onChange={(e) => {
                                        const newGroupId = e.target.value ? Number(e.target.value) : undefined
                                        setFilters((prev: Filters) => ({ 
                                            ...prev, 
                                            groupId: newGroupId,
                                            companyId: undefined, // Reset company when matrix changes
                                            branchId: undefined
                                        }))
                                    }}
                                    className="bg-transparent border-none outline-none text-[11px] font-black text-foreground cursor-pointer"
                                >
                                    <option value="">Todas</option>
                                    {businessGroups.filter(g => g.isActive).map((g: any) => (
                                        <option key={g.id} value={g.id.toString()}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-0.5 px-4 border-r border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Empresa</span>
                                <select 
                                    value={filters.companyId || ''}
                                    onChange={(e) => setFilters((prev: Filters) => ({ ...prev, companyId: e.target.value ? Number(e.target.value) : undefined, branchId: undefined, categoryId: undefined }))}
                                    className="bg-transparent border-none outline-none text-[11px] font-black text-foreground cursor-pointer"
                                >
                                    <option value="">Todas</option>
                                    {filteredCompanies.map((c: any) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    
                    <div className="flex flex-col gap-0.5 px-4 border-r border-zinc-200 dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Sucursal</span>
                        <select 
                            value={filters.branchId || ''}
                            onChange={(e) => setFilters((prev: Filters) => ({ ...prev, branchId: e.target.value ? Number(e.target.value) : undefined }))}
                            className="bg-transparent border-none outline-none text-[11px] font-black text-foreground cursor-pointer"
                        >
                            <option value="">Todas</option>
                            {filteredBranches.map((b: any) => <option key={b.id} value={b.id.toString()}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5 px-4 border-r border-zinc-200 dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Desde</span>
                        <input 
                            type="date" 
                            value={filters.startDate}
                            onChange={(e) => setFilters((prev: Filters) => ({ ...prev, startDate: e.target.value }))}
                            className="bg-transparent border-none outline-none text-[11px] font-black text-foreground cursor-pointer"
                        />
                    </div>
                    <div className="flex flex-col gap-0.5 px-4">
                        <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Hasta</span>
                        <input 
                            type="date" 
                            value={filters.endDate}
                            onChange={(e) => setFilters((prev: Filters) => ({ ...prev, endDate: e.target.value }))}
                            className="bg-transparent border-none outline-none text-[11px] font-black text-foreground cursor-pointer"
                        />
                    </div>
                    
                    <button 
                        onClick={loadReport}
                        disabled={isPending}
                        className="h-12 px-6 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-zinc-900/10 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest"
                    >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                        Actualizar
                    </button>
                    
                    <button 
                        onClick={exportToExcel}
                        disabled={!reportData || isPending}
                        className="h-12 w-12 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        title="Exportar Excel"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Premium Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-fit self-center lg:self-start">
                <button 
                    onClick={() => setActiveTab('visual')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'visual' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Vista General
                </button>
                <button 
                    onClick={() => setActiveTab('analytical')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'analytical' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                    <TableProperties className="w-4 h-4" /> Detalle Analítico
                </button>
            </div>

            {activeTab === 'visual' ? (
                <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200/60 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                            <div className="relative z-10">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-500/20">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ingresos Totales</span>
                                <div className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mt-1">
                                    ${reportData?.summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200/60 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group hover:border-rose-500/30 transition-all">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                            <div className="relative z-10">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-500/20">
                                    <TrendingDown className="w-5 h-5 text-rose-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Egresos Totales</span>
                                <div className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mt-1">
                                    ${reportData?.summary.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200/60 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                            <div className="relative z-10">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-500/20">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Promedio de Gasto</span>
                                <div className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mt-1">
                                    ${reportData?.summary.dailyAverage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">Calculado por día transcurrido</p>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[40px] border shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group transition-all ${isProfit ? 'bg-white dark:bg-zinc-900 border-emerald-500/20' : 'bg-white dark:bg-zinc-900 border-rose-500/20'}`}>
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-transform ${isProfit ? 'bg-emerald-500/10 group-hover:scale-125' : 'bg-rose-500/10 group-hover:scale-125'}`} />
                            <div className="relative z-10">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-6 border ${isProfit ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-500/20'}`}>
                                    <DollarSign className={`w-5 h-5 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Resultado del Periodo</span>
                                <div className={`text-3xl font-black tracking-tighter mt-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isProfit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                    {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {isProfit ? 'Rentabilidad Neta' : 'Pérdida Neta'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] border border-zinc-200/60 dark:border-zinc-800 shadow-[0_8px_40px_rgb(0,0,0,0.02)]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
                            <div>
                                <h3 className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white">Curva de Tendencia Financiera</h3>
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-1">Ingresos vs Gastos · Análisis Histórico</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase">Ingresos</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase">Gastos</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-[450px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={reportData?.chartData}>
                                    <defs>
                                        <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                        dy={15}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                        tickFormatter={(val) => `$${val / 1000}k`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '24px', 
                                            border: 'none', 
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                            padding: '15px 20px',
                                            backgroundColor: '#fff',
                                            color: '#000'
                                        }}
                                        itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#gradIncome)" />
                                    <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" strokeWidth={5} fillOpacity={1} fill="url(#gradExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Secondary Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200/60 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                                    <PieIcon className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Distribución de Gasto</h3>
                                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Impacto por categoría raíz</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reportData?.categories.filter((c: any) => c.expense > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="expense"
                                            nameKey="name"
                                            animationBegin={0}
                                            animationDuration={1500}
                                        >
                                            {reportData?.categories.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black tracking-tighter text-zinc-900 dark:text-white uppercase">Mejores Categorías</h3>
                                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Top rendimiento positivo</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-3">
                                {reportData?.categories.sort((a: any, b: any) => b.income - a.income).map((cat: any, i: number) => (
                                    <div key={i} className="group flex items-center justify-between p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{cat.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-emerald-500">+${cat.income.toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Entrada de capital</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Analytical Grid View */
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-white dark:bg-zinc-900 rounded-[48px] border border-zinc-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tighter">Matriz Analítica de Rentabilidad</h3>
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Desglose granular por sucursal y periodo</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Empresa</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Sucursal</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Periodo</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Ingresos</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">Egresos</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Balance</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {reportData?.detailedBreakdown.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{row.company}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-zinc-500">{row.branch}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-500">{row.period}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black text-emerald-600">${row.income.toLocaleString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black text-rose-500">${row.expense.toLocaleString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-xs font-black ${row.balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600'}`}>
                                                    ${row.balance.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${row.status === 'GAIN' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                    {row.status === 'GAIN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {row.status === 'GAIN' ? 'Ganancia' : 'Pérdida'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData?.detailedBreakdown.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-20 text-center text-sm font-medium text-zinc-500 italic">
                                                No hay datos suficientes para generar el desglose analítico en este rango.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
