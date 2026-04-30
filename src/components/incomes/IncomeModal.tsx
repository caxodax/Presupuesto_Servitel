"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { incomeSchema } from "@/features/incomes/validations"
import { createIncome, getIncomeCategories } from "@/features/incomes/server/actions"
import { X, Loader2, DollarSign, Calendar, Hash, User, Tag, FileUp, Building2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { FileUploadInput } from "@/components/facturas/FileUploadInput"

type IncomeModalProps = {
    mode: "create" | "edit"
    income?: any
    companies: any[]
    categories: any[]
    currentBcvRate: string | number
    userRole: string
    onClose: () => void
}

export function IncomeModal({ 
    mode, 
    income, 
    companies, 
    categories: initialCategories, 
    currentBcvRate, 
    userRole,
    onClose 
}: IncomeModalProps) {
    const [isPending, startTransition] = useTransition()
    const [dynamicCategories, setDynamicCategories] = useState(initialCategories)
    const [branches, setBranches] = useState<any[]>([])
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(incomeSchema),
        defaultValues: mode === 'edit' ? {
            ...income,
            date: new Date(income.date).toISOString().split('T')[0]
        } : {
            date: new Date().toISOString().split('T')[0],
            exchangeRate: Number(currentBcvRate) || 0
        }
    })

    const watchCompanyId = watch("companyId" as any)

    useEffect(() => {
        if (userRole === 'SUPER_ADMIN' && watchCompanyId) {
            const company = companies.find(c => c.id === Number(watchCompanyId))
            setBranches(company?.branches || [])
            
            // Recargar categorías para esa empresa
            getIncomeCategories(Number(watchCompanyId)).then(setDynamicCategories)
        } else if (userRole !== 'SUPER_ADMIN') {
            // El usuario ya tiene una empresa asignada, obtener sus sucursales si el objeto company viene hidratado
            // En este sistema, las sucursales suelen venir pre-cargadas o se obtienen aparte.
            // Para simplificar, usaremos las sucursales de la primera empresa si no es super admin
            // o asumiremos que categories ya viene filtrado.
        }
    }, [watchCompanyId, userRole, companies])

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
                    toast.success("Ingreso registrado correctamente")
                }
                onClose()
            } catch (e: any) {
                toast.error(e.message || "Error al procesar solicitud")
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">
                            {mode === 'create' ? 'Registrar Nuevo Ingreso' : 'Editar Registro de Ingreso'}
                        </h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Completa los datos del flujo de caja entrante</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Empresa (Solo Super Admin) */}
                        {userRole === 'SUPER_ADMIN' && mode === 'create' && (
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> Empresa Destino
                                </label>
                                <select 
                                    {...register("companyId")}
                                    className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                >
                                    <option value="">Selecciona una empresa...</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Hash className="w-3.5 h-3.5" /> Nro. de Documento / Recibo
                            </label>
                            <input 
                                {...register("number")}
                                placeholder="Ej: REC-001"
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            />
                            {errors.number && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.number.message as string}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Nombre del Cliente / Origen
                            </label>
                            <input 
                                {...register("clientName")}
                                placeholder="Nombre del pagador"
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            />
                            {errors.clientName && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.clientName.message as string}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> Categoría de Ingreso
                            </label>
                            <select 
                                {...register("categoryId")}
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            >
                                <option value="">Selecciona categoría...</option>
                                {dynamicCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {errors.categoryId && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.categoryId.message as string}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" /> Sucursal (Opcional)
                            </label>
                            <select 
                                {...register("branchId")}
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            >
                                <option value="">Global / Sin sucursal</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <DollarSign className="w-3.5 h-3.5" /> Monto en USD
                            </label>
                            <input 
                                {...register("amountUSD")}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            />
                            {errors.amountUSD && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.amountUSD.message as string}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Hash className="w-3.5 h-3.5" /> Tasa BCV (VES)
                            </label>
                            <input 
                                {...register("exchangeRate")}
                                type="number"
                                step="0.0001"
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Fecha de Ingreso
                            </label>
                            <input 
                                {...register("date")}
                                type="date"
                                className="w-full h-12 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <FileUp className="w-3.5 h-3.5" /> Soporte / Comprobante (Opcional)
                            </label>
                            <FileUploadInput name="attachment" />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                Notas adicionales
                            </label>
                            <textarea 
                                {...register("notes")}
                                rows={3}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                                placeholder="Detalles extra sobre este ingreso..."
                            />
                        </div>

                    </div>

                    <div className="mt-10 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={isPending}
                            className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'create' ? 'Confirmar Registro' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
