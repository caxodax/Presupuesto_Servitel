"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { incomeSchema } from "@/features/incomes/validations"
import { createIncome, updateIncome, getCompanyDataForIncome } from "@/features/incomes/server/actions"
import { 
    X, 
    Loader2, 
    Wallet, 
    Calendar, 
    Hash, 
    User, 
    Tag, 
    Building2, 
    MapPin,
    PlusIcon,
    Edit3
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"

type IncomeModalProps = {
    mode: "create" | "edit"
    income?: any
    companies: any[]
    categories: any[]
    currentBcvRate: string | number
    userRole: string
    defaultCompanyId?: string
    onClose: () => void
}

export function IncomeModal({ 
    mode, 
    income, 
    companies, 
    categories: initialCategories, 
    currentBcvRate, 
    userRole,
    defaultCompanyId,
    onClose 
}: IncomeModalProps) {
    const [isPending, startTransition] = useTransition()
    const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []
    const categoriesList = Array.isArray(initialCategories) ? initialCategories : (initialCategories as any).items || []
    const [dynamicCategories, setDynamicCategories] = useState(categoriesList)
    const [branches, setBranches] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(incomeSchema),
        defaultValues: mode === 'edit' ? {
            ...income,
            date: income.date ? format(new Date(income.date + 'T00:00:00'), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            incomeId: income.id
        } : {
            date: format(new Date(), 'yyyy-MM-dd'),
            exchangeRate: Number(currentBcvRate) || 0,
            companyId: defaultCompanyId || ""
        }
    })

    const watchCompanyId = watch("companyId" as any)

    useEffect(() => {
        const effectiveCompanyId = watchCompanyId || defaultCompanyId
        
        if (!effectiveCompanyId) {
            setBranches([])
            setDynamicCategories([])
            return
        }

        const fetchData = async () => {
            setIsLoadingData(true)
            try {
                const data = await getCompanyDataForIncome(Number(effectiveCompanyId))
                const cats = Array.isArray(data.categories) ? data.categories : (data.categories as any).items || []
                const brs = Array.isArray(data.branches) ? data.branches : (data.branches as any).items || []
                setDynamicCategories(cats)
                setBranches(brs)
            } catch (error) {
                toast.error("Error cargando datos de la empresa")
            } finally {
                setIsLoadingData(false)
            }
        }
        
        fetchData()
    }, [watchCompanyId, defaultCompanyId])

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
                if (mode === 'create') {
                    await createIncome(formData)
                    toast.success("Ingreso registrado correctamente", {
                        description: "El flujo de caja ha sido actualizado."
                    })
                } else {
                    await updateIncome(formData)
                    toast.success("Ingreso actualizado correctamente", {
                        description: "Los cambios han sido guardados."
                    })
                }
                onClose()
            } catch (e: any) {
                toast.error(e.message || "Error al procesar solicitud", {
                    description: "Por favor verifique los datos e intente nuevamente."
                })
            }
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${mode === 'create' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                            {mode === 'create' ? <PlusIcon className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-foreground">
                                {mode === 'create' ? 'Nuevo Ingreso' : 'Modificar Ingreso'}
                            </h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                {mode === 'create' ? 'Registro de entrada de capital' : `Editando registro #${income?.number}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {mode === 'edit' && <input type="hidden" {...register("incomeId" as any)} />}
                    <div className="space-y-6">
                        
                        {/* Empresa (Solo SuperAdmin en Create) */}
                        {userRole?.toUpperCase() === 'SUPER_ADMIN' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <Building2 className="w-3.5 h-3.5" /> Empresa / Organización
                                </label>
                                <select 
                                    {...register("companyId")}
                                    disabled={isPending || mode === 'edit'} 
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                    <option value="">Selecciona una empresa...</option>
                                    {companiesList.map((c: any) => (
                                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <User className="w-3.5 h-3.5" /> Cliente / Origen
                                </label>
                                <input 
                                    {...register("clientName")}
                                    placeholder="Nombre del cliente..."
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                                {errors.clientName && <p className="text-[10px] font-bold text-rose-500 ml-2 uppercase">{errors.clientName.message as string}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <Hash className="w-3.5 h-3.5" /> Nro. Documento
                                </label>
                                <input 
                                    {...register("number")}
                                    placeholder="Factura, Recibo, etc..."
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                                {errors.number && <p className="text-[10px] font-bold text-rose-500 ml-2 uppercase">{errors.number.message as string}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <Tag className="w-3.5 h-3.5" /> Categoría de Ingreso
                                    {isLoadingData && <Loader2 className="w-3 h-3 animate-spin ml-2 text-indigo-500" />}
                                </label>
                                <select 
                                    {...register("categoryId")}
                                    disabled={isPending || isLoadingData || (!watchCompanyId && !defaultCompanyId)}
                                    className={`w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border ${errors.categoryId ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                                >
                                    <option value="">Selecciona categoría...</option>
                                    {dynamicCategories.map((c: any) => (
                                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <MapPin className="w-3.5 h-3.5" /> Sucursal (Opcional)
                                    {isLoadingData && <Loader2 className="w-3 h-3 animate-spin ml-2 text-indigo-500" />}
                                </label>
                                <select 
                                    {...register("branchId")}
                                    disabled={isPending || isLoadingData || (!watchCompanyId && !defaultCompanyId)}
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                >
                                    <option value="">GLOBAL (Sin sucursal)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id.toString()}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 ml-1">
                                    <Wallet className="w-3.5 h-3.5" /> Monto (USD)
                                </label>
                                <input 
                                    type="number" step="0.01"
                                    {...register("amountUSD")}
                                    className="w-full h-12 px-4 bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    Tasa BCV
                                </label>
                                <input 
                                    type="number" step="0.0001"
                                    {...register("exchangeRate")}
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                    <Calendar className="w-3.5 h-3.5" /> Fecha
                                </label>
                                <input 
                                    type="date"
                                    {...register("date")}
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <FileUploadInput name="attachment" currentFile={income?.attachmentName} />

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                Notas adicionales
                            </label>
                            <textarea 
                                {...register("notes")}
                                rows={2}
                                className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                placeholder="Detalles extra del movimiento..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 mt-10">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isPending}
                            className="flex-1 md:flex-none px-10 h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-zinc-500/10"
                        >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'create' ? 'Registrar Ingreso' : 'Guardar Cambios')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
