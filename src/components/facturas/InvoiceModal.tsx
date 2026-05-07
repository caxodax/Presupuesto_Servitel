"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { invoiceSchema } from "@/features/invoices/validations"
import { createInvoice, updateInvoice, getRateByDate } from "@/features/invoices/server/actions"
import { getAllocationsForCompany } from "@/features/budgets/server/actions"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"
import { AccountSelector } from "@/components/accounts/AccountSelector"
import { 
    CheckCircle2, 
    Loader2, 
    X, 
    FileText, 
    Calendar, 
    Building2, 
    Receipt, 
    DollarSign, 
    Wallet,
    AlertCircle,
    TrendingDown,
    BookOpen
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import dynamic from "next/dynamic"

const NumericFormat = dynamic(
  () => import("react-number-format").then((mod) => mod.NumericFormat),
  { ssr: false }
)

type InvoiceModalProps = {
    mode: "create" | "edit"
    invoice?: any
    companies?: any[]
    initialAllocations: any[]
    currentBcvRate?: string | number
    userRole?: string
    onClose: () => void
}

export function InvoiceModal({ 
    mode, 
    invoice, 
    companies = [],
    initialAllocations, 
    currentBcvRate, 
    userRole,
    onClose 
}: InvoiceModalProps) {
    const [isPending, startTransition] = useTransition()
    const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
    const [allocations, setAllocations] = useState<any[]>(Array.isArray(initialAllocations) ? initialAllocations : (initialAllocations as any).items || [])
    const [isLoadingAllocations, setIsLoadingAllocations] = useState(false)
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(invoice?.companyId?.toString() || "")
    
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(invoiceSchema),
        defaultValues: mode === "edit" ? {
            ...invoice,
            date: invoice?.date && !isNaN(new Date(invoice.date).getTime()) ? format(new Date(invoice.date.includes("T") ? invoice.date : invoice.date + "T00:00:00"), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            companyAccountId: invoice.companyAccountId || null
        } : {
            date: format(new Date(), 'yyyy-MM-dd'),
            exchangeRate: Number(currentBcvRate) || 0,
            amountUSD: 0,
            companyAccountId: null
        }
    })

    const watchAllocationId = watch("allocationId")
    const watchAmountUSD = watch("amountUSD")
    const watchDate = watch("date")
    const watchCompanyAccountId = watch("companyAccountId")

    // Auto-heredar cuenta del rubro seleccionado
    const selectedAlloc = allocations.find(a => Number(a.id) === Number(watchAllocationId))
    
    useEffect(() => {
        if (selectedAlloc?.companyAccountId && !watchCompanyAccountId && mode === 'create') {
            setValue("companyAccountId", selectedAlloc.companyAccountId)
        }
    }, [selectedAlloc, watchCompanyAccountId, setValue, mode])

    // Buscar tasa histórica automáticamente
    useEffect(() => {
        const fetchHistoricalRate = async () => {
            if (!watchDate || mode === 'edit') return 
            try {
                const rate = await getRateByDate(watchDate)
                if (rate) {
                    setValue("exchangeRate", rate)
                    toast.info(`Tasa sugerida para el día ${watchDate} cargada automáticamente.`, {
                        icon: <Wallet className="w-4 h-4 text-amber-500" />
                    })
                }
            } catch (e) {
                console.error("Error fetching historical rate", e)
            }
        }
        fetchHistoricalRate()
    }, [watchDate, mode, setValue])

    // Cargar alocaciones al seleccionar una empresa
    useEffect(() => {
        const targetId = selectedCompanyId || (userRole !== "SUPER_ADMIN" ? "current" : "")
        if (!targetId) {
            setAllocations([])
            return
        }

        const fetchAllocations = async () => {
            setIsLoadingAllocations(true)
            try {
                const idToFetch = selectedCompanyId ? Number(selectedCompanyId) : undefined
                const data = await getAllocationsForCompany(idToFetch as any)
                setAllocations(data)
            } catch (err) {
                // toast.error("Error al cargar presupuestos")
            } finally {
                setIsLoadingAllocations(false)
            }
        }

        if (mode === "create" || (mode === "edit" && allocations.length === 0)) {
            fetchAllocations()
        }
    }, [selectedCompanyId, userRole])

    const onSubmit = (data: any) => {
        const formData = new FormData()
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key])
            }
        })
        
        // Adjunto
        const fileInput = document.getElementById('attachment') as HTMLInputElement
        if (fileInput?.files?.[0]) {
            formData.append('attachment', fileInput.files[0])
        }

        startTransition(async () => {
            try {
                if (mode === "create") {
                    await createInvoice(formData)
                    toast.success("Factura registrada y presupuesto impactado")
                } else {
                    await updateInvoice(formData)
                    toast.success("Factura actualizada y recálculo completado")
                }
                onClose()
            } catch (err: any) {
                toast.error(err.message || "Fallo en la operación", {
                    description: "Por favor verifique los datos e intente nuevamente."
                })
            }
        })
    }

    // Cálculo de impacto presupuestario previo
    const remainingBefore = selectedAlloc?.remainingUSD || 0
    const remainingAfter = remainingBefore - Number(watchAmountUSD || 0)
    const isOverBudget = remainingAfter < 0

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${mode === 'create' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                            {mode === 'create' ? <PlusIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-foreground">
                                {mode === 'create' ? 'Registrar Factura' : 'Modificar Factura'}
                            </h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                {mode === 'create' ? 'Consolidación de egreso operativo' : `Editando registro #${invoice?.number}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {mode === 'edit' && <input type="hidden" value={invoice.id} {...register("invoiceId")} />}
                    <div className="space-y-6">
                        
                        {/* Selección de Empresa (Solo Super Admin en modo creación) */}
                        {userRole === "SUPER_ADMIN" && mode === "create" && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> 1. Empresa
                                </label>
                                <select 
                                    value={selectedCompanyId}
                                    onChange={(e) => {
                                        setSelectedCompanyId(e.target.value)
                                        setValue("allocationId", "") // Reset allocation
                                    }}
                                    disabled={isPending} 
                                    className="w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                >
                                    <option value="">Seleccione Empresa...</option>
                                    {companiesList.map((c: any) => (
                                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Destino del Gasto */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> Impacto Presupuestario
                                    {isLoadingAllocations && <Loader2 className="w-3 h-3 animate-spin ml-2 text-indigo-500" />}
                                </label>
                                <select 
                                    {...register("allocationId")}
                                    disabled={isPending || isLoadingAllocations || (userRole === "SUPER_ADMIN" && mode === "create" && !selectedCompanyId)} 
                                    className={`w-full h-12 rounded-2xl border ${errors.allocationId ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none`}
                                >
                                    <option value="">Seleccione Asignación...</option>
                                    {allocations.map(alloc => (
                                        <option key={alloc.id} value={alloc.id.toString()}>{alloc.label}</option>
                                    ))}
                                </select>
                                {errors.allocationId && (
                                    <p className="text-[10px] text-rose-500 font-bold uppercase flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.allocationId.message as string}
                                    </p>
                                )}
                            </div>

                            {/* Cuenta Contable */}
                            <div className="space-y-2">
                                <AccountSelector 
                                    label="Cuenta Contable (Obligatoria)"
                                    placeholder="Vincular a cuenta..."
                                    defaultValue={watchCompanyAccountId}
                                    onSelect={(id) => setValue("companyAccountId", id)}
                                    isExecutable={true}
                                    companyId={selectedCompanyId ? Number(selectedCompanyId) : undefined}
                                />
                                {errors.companyAccountId && <p className="text-[10px] font-bold text-rose-500 ml-2 uppercase">{(errors.companyAccountId as any).message}</p>}
                                {selectedAlloc?.companyAccountId && watchCompanyAccountId === selectedAlloc.companyAccountId && (
                                    <p className="text-[9px] text-indigo-500 font-bold uppercase flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> Heredada del presupuesto
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" /> Proveedor / Emisor
                                </label>
                                <input 
                                    {...register("supplierName")}
                                    disabled={isPending} 
                                    placeholder="Ej. Servitel C.A." 
                                    className={`w-full h-12 rounded-2xl border ${errors.supplierName ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20`} 
                                />
                                {errors.supplierName && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.supplierName.message as string}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <HashIcon className="w-3.5 h-3.5" /> Número de Factura
                                </label>
                                <input 
                                    {...register("number")}
                                    disabled={isPending} 
                                    placeholder="Ej. 123456" 
                                    className={`w-full h-12 rounded-2xl border ${errors.number ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20`} 
                                />
                                {errors.number && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.number.message as string}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Fecha
                                </label>
                                <input 
                                    {...register("date")}
                                    type="date" 
                                    disabled={isPending} 
                                    className={`w-full h-12 rounded-2xl border ${errors.date ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20`} 
                                />
                                {errors.date && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.date.message as string}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" /> Monto (USD)
                                </label>
                                <NumericFormat 
                                    thousandSeparator="." 
                                    decimalSeparator="," 
                                    value={watchAmountUSD}
                                    onValueChange={(values) => setValue("amountUSD", Number(values.value))}
                                    disabled={isPending} 
                                    placeholder="0,00"
                                    className={`w-full h-12 rounded-2xl border ${errors.amountUSD ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-emerald-100 dark:border-emerald-900/30'} bg-emerald-50/30 dark:bg-emerald-500/5 px-4 text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20`} 
                                />
                                {errors.amountUSD && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.amountUSD.message as string}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5" /> Tasa (BCV)
                                </label>
                                <NumericFormat 
                                    thousandSeparator="." 
                                    decimalSeparator="," 
                                    value={watch("exchangeRate")}
                                    onValueChange={(values) => setValue("exchangeRate", Number(values.value))}
                                    disabled={isPending} 
                                    decimalScale={4}
                                    placeholder="0,0000"
                                    className={`w-full h-12 rounded-2xl border ${errors.exchangeRate ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-amber-100 dark:border-amber-900/30'} bg-amber-50/30 dark:bg-amber-500/5 px-4 text-sm font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500/20`} 
                                />
                                {errors.exchangeRate && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.exchangeRate.message as string}</p>}
                            </div>
                        </div>

                        {/* Impact Preview */}
                        {watchAllocationId && watchAmountUSD > 0 && (
                            <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${isOverBudget ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50' : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50'}`}>
                                <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${isOverBudget ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    <TrendingDown className="w-3.5 h-3.5" /> Impacto Proyectado
                                </h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Capacidad Actual</span>
                                        <span className="text-sm font-black text-foreground">${remainingBefore.toLocaleString()}</span>
                                    </div>
                                    <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Post-Operación</span>
                                        <span className={`text-sm font-black ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ${remainingAfter.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                {isOverBudget && (
                                    <p className="text-[10px] text-rose-500 font-bold uppercase mt-3 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Aviso: Esta operación excede el fondo asignado.
                                    </p>
                                )}
                            </div>
                        )}

                        <FileUploadInput name="attachment" currentFile={invoice?.attachmentName} />

                        <div className="pt-4 flex gap-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={isPending}
                                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isPending} 
                                className={`flex-[2] h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${mode === 'create' ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700' : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white shadow-zinc-900/20 hover:opacity-90'}`}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'create' ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                {isPending ? 'Procesando...' : mode === 'create' ? 'Consolidar Registro' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

function PlusIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
}

function HashIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 15m-3.1-15l-3.9 15" /></svg>
}
