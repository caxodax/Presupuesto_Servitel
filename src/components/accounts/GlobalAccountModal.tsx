"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { 
    X, 
    Loader2, 
    BookOpen, 
    Hash, 
    Type, 
    Layers, 
    CheckCircle2, 
    Activity,
    Target
} from "lucide-react"
import { createGlobalAccount, updateGlobalAccount } from "@/features/accounts/server/actions"
import { toast } from "sonner"

interface Props {
    mode: "create" | "edit"
    account?: any
    globalAccounts: any[]
    onClose: () => void
}

export function GlobalAccountModal({ mode, account, globalAccounts, onClose }: Props) {
    const [isPending, startTransition] = useTransition()
    
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: mode === "edit" ? {
            code: account.code,
            name: account.name,
            type: account.type,
            parentId: account.parentId || "",
            level: account.level,
            isMovementAccount: account.isMovementAccount,
            isBudgetable: account.isBudgetable,
            isExecutable: account.isExecutable
        } : {
            type: "EXPENSE",
            level: 5,
            isMovementAccount: true,
            isBudgetable: true,
            isExecutable: true
        }
    })

    const onSubmit = async (data: any) => {
        const payload = {
            ...data,
            parentId: data.parentId ? Number(data.parentId) : null,
            level: Number(data.level)
        }

        startTransition(async () => {
            try {
                if (mode === "create") {
                    await createGlobalAccount(payload)
                    toast.success("Cuenta global creada")
                } else {
                    await updateGlobalAccount(account.id, payload)
                    toast.success("Cuenta global actualizada")
                }
                onClose()
            } catch (error: any) {
                toast.error(error.message)
            }
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-foreground">
                                {mode === "create" ? "Nueva Cuenta Global" : "Editar Cuenta Global"}
                            </h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                {mode === "create" ? "Agregando al plan maestro" : `Modificando ${account.code}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                <Hash className="w-3.5 h-3.5" /> Código de Cuenta
                            </label>
                            <input 
                                {...register("code", { required: "Código requerido" })}
                                placeholder="Ej: 5.1.01.01.001"
                                className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                            {errors.code && <p className="text-[10px] font-bold text-rose-500 ml-2 uppercase">{errors.code.message as string}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                <Layers className="w-3.5 h-3.5" /> Nivel Jerárquico
                            </label>
                            <select 
                                {...register("level")}
                                className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                {[1,2,3,4,5].map(l => (
                                    <option key={l} value={l}>Nivel {l}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                            <Type className="w-3.5 h-3.5" /> Nombre de la Cuenta
                        </label>
                        <input 
                            {...register("name", { required: "Nombre requerido" })}
                            placeholder="Nombre descriptivo..."
                            className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        {errors.name && <p className="text-[10px] font-bold text-rose-500 ml-2 uppercase">{errors.name.message as string}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Tipo de Cuenta
                            </label>
                            <select 
                                {...register("type")}
                                className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                <option value="ASSET">Activo</option>
                                <option value="LIABILITY">Pasivo</option>
                                <option value="EQUITY">Patrimonio</option>
                                <option value="INCOME">Ingreso</option>
                                <option value="COST">Costo</option>
                                <option value="EXPENSE">Gasto</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
                                <Target className="w-3.5 h-3.5" /> Cuenta Padre
                            </label>
                            <select 
                                {...register("parentId")}
                                className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                <option value="">Sin Padre (Raíz)</option>
                                {globalAccounts
                                    .filter(a => a.level < (watch("level") || 5))
                                    .map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <label className="flex flex-col items-center gap-2 cursor-pointer group">
                            <input type="checkbox" {...register("isMovementAccount")} className="hidden peer" />
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 transition-all">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 group-hover:text-foreground">Movimiento</span>
                        </label>

                        <label className="flex flex-col items-center gap-2 cursor-pointer group">
                            <input type="checkbox" {...register("isBudgetable")} className="hidden peer" />
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center peer-checked:bg-green-600 peer-checked:text-white peer-checked:border-green-600 transition-all">
                                <Target className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 group-hover:text-foreground">Presupuestable</span>
                        </label>

                        <label className="flex flex-col items-center gap-2 cursor-pointer group">
                            <input type="checkbox" {...register("isExecutable")} className="hidden peer" />
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 group-hover:text-foreground">Ejecutable</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
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
                            className="flex-1 px-10 h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-zinc-500/10"
                        >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === "create" ? "Crear Cuenta" : "Guardar Cambios")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
