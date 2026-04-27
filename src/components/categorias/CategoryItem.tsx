"use client"
import { useState, useTransition, useOptimistic } from "react"
import { Layers, Edit3, Eye, EyeOff, Save, X, Plus, Loader2 } from "lucide-react"
import { toggleCategoryStatus, updateCategory, toggleSubcategoryStatus, updateSubcategory } from "@/features/categories/server/actions"
import { toast } from "sonner"

export function CategoryItem({ 
    cat, 
    showCompanyBadge 
}: { 
    cat: any, 
    showCompanyBadge: boolean 
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(cat.name)
    const [isPending, startTransition] = useTransition()

    const [optimisticCat, setOptimisticCat] = useOptimistic(
        cat,
        (state, newState: Partial<typeof cat>) => ({ ...state, ...newState })
    )

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append("id", cat.id)
        formData.append("name", name)
        
        startTransition(async () => {
            setOptimisticCat({ name })
            try {
                await updateCategory(formData)
                toast.success("Categoría renombrada")
                setIsEditing(false)
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar")
            }
        })
    }

    const handleToggle = async () => {
        startTransition(async () => {
            setOptimisticCat({ isActive: !optimisticCat.isActive })
            try {
                await toggleCategoryStatus(cat.id)
                toast.success(optimisticCat.isActive ? "Categoría matriz desactivada" : "Categoría reactivada")
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar estado")
            }
        })
    }

    return (
        <div className={`group border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-4 bg-zinc-50/30 dark:bg-zinc-900/30 transition-all hover:border-indigo-500/30 ${!optimisticCat.isActive ? 'opacity-50 grayscale-[0.5]' : ''}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3 flex-1">
                    <Layers className={`w-4 h-4 ${optimisticCat.isActive ? 'text-indigo-500' : 'text-zinc-500'}`} />
                    
                    {isEditing ? (
                        <form onSubmit={handleUpdate} className="flex items-center gap-2 flex-1">
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                className="h-7 px-2 text-sm bg-white dark:bg-zinc-950 border border-indigo-500 rounded outline-none w-full max-w-[300px]"
                                autoFocus
                            />
                            <button disabled={isPending} type="submit" className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                                <Save className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <span className={`font-semibold ${!optimisticCat.isActive ? 'line-through text-zinc-500' : 'text-foreground'}`}>
                            {optimisticCat.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {showCompanyBadge && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                            {cat.Company?.name}
                        </span>
                    )}
                    
                    {!isEditing && (
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200/50 dark:border-indigo-500/30 rounded-xl transition-all active:scale-90"
                                title="Editar nombre"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={handleToggle}
                                disabled={isPending}
                                className={`p-2 rounded-xl border transition-all active:scale-90 ${
                                    optimisticCat.isActive 
                                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border-rose-200/50 dark:border-rose-500/30' 
                                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border-emerald-200/50 dark:border-emerald-500/30'
                                }`}
                                title={optimisticCat.isActive ? "Desactivar (Cascada)" : "Reactivar"}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    optimisticCat.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Subcategorías */}
            <div className="flex flex-wrap gap-2 mt-3 pl-7">
                {optimisticCat.subcategories.map((sub: any) => (
                    <SubcategoryItem key={sub.id} sub={sub} parentDisabled={!optimisticCat.isActive} />
                ))}
                {cat.subcategories.length === 0 && (
                    <div className="text-[10px] text-zinc-400 italic">Sin ramificaciones secundarias</div>
                )}
            </div>
        </div>
    )
}

function SubcategoryItem({ sub, parentDisabled }: { sub: any, parentDisabled: boolean }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(sub.name)
    const [isPending, startTransition] = useTransition()

    const [optSub, setOptSub] = useOptimistic(
        sub,
        (state, newState: Partial<typeof sub>) => ({ ...state, ...newState })
    )

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append("id", sub.id)
        formData.append("name", name)
        
        startTransition(async () => {
            setOptSub({ name })
            try {
                await updateSubcategory(formData)
                toast.success("Variación renombrada")
                setIsEditing(false)
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar")
            }
        })
    }

    const handleToggle = async () => {
        startTransition(async () => {
            setOptSub({ isActive: !optSub.isActive })
            try {
                await toggleSubcategoryStatus(sub.id)
                toast.success(optSub.isActive ? "Variación ocultada" : "Reactiva")
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar estado")
            }
        })
    }

    return (
        <div className={`group flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md border transition-all ${!optSub.isActive || parentDisabled ? 'bg-zinc-100/50 dark:bg-zinc-800/20 text-zinc-400 border-zinc-200 cursor-not-allowed' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 border-transparent hover:border-zinc-300'}`}>
            <span className="opacity-50">↳</span>
            
            {isEditing ? (
                 <form onSubmit={handleUpdate} className="flex items-center gap-1">
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="h-5 px-1 bg-white dark:bg-zinc-950 border border-indigo-500 rounded outline-none w-[120px]"
                        autoFocus
                    />
                    <button type="submit" disabled={isPending} className="text-emerald-500"><Save className="w-3 h-3" /></button>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-rose-500"><X className="w-3 h-3" /></button>
                 </form>
            ) : (
                <span className={!optSub.isActive || parentDisabled ? 'line-through' : ''}>{optSub.name}</span>
            )}

            {!isEditing && !parentDisabled && (
                <div className="flex items-center gap-1.5 ml-2">
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={handleToggle} 
                        disabled={isPending} 
                        className={`p-1.5 rounded-lg transition-colors ${
                            optSub.isActive 
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100" 
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                        }`}
                        title={optSub.isActive ? "Desactivar" : "Reactivar"}
                    >
                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                            optSub.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
