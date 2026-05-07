"use client"

import { useState, useTransition } from "react"
import { createCategory, createSubcategory } from "@/features/categories/server/actions"
import { Layers, Plus, X, Loader2, GitBranch } from "lucide-react"
import { toast } from "sonner"

export function CreateCategoryModal({ 
  companies, 
  categories, 
  userRole, 
  filteredCompanyId 
}: { 
  companies: any[], 
  categories: any[], 
  userRole: string, 
  filteredCompanyId?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'category' | 'subcategory'>('category')
  const [isPending, startTransition] = useTransition()

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createCategory(formData)
        toast.success("Categoría padre creada con éxito")
        setIsOpen(false)
      } catch (err: any) {
        toast.error(err.message || "Error al crear la categoría")
      }
    })
  }

  const handleCreateSubcategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createSubcategory(formData)
        toast.success("Subcategoría creada con éxito")
        setIsOpen(false)
      } catch (err: any) {
        toast.error(err.message || "Error al crear la subcategoría")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Nueva Clasificación
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
             {/* Header */}
             <div className="relative p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                    <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">Crear Jerarquía</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Expande el árbol de clasificación contable.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="absolute top-6 right-6 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors disabled:opacity-50"
                >
                    <X className="w-4 h-4" />
                </button>
             </div>

             {/* Tabs */}
             <div className="px-6 pt-4 flex gap-2">
                <button 
                  onClick={() => setActiveTab('category')}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 text-xs font-bold rounded-xl transition-all ${activeTab === 'category' ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <Layers className="w-3.5 h-3.5" /> Nueva Raíz
                </button>
                <button 
                  onClick={() => setActiveTab('subcategory')}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 text-xs font-bold rounded-xl transition-all ${activeTab === 'subcategory' ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <GitBranch className="w-3.5 h-3.5" /> Adherir Sub-rama
                </button>
             </div>

             {/* Form - Category */}
             {activeTab === 'category' && (
                 <form onSubmit={handleCreateCategory} className="p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Tipo de Clasificación</label>
                        <select name="type" required defaultValue="EXPENSE" disabled={isPending} className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50">
                            <option value="EXPENSE">Egreso (Gasto Operativo)</option>
                            <option value="INCOME">Ingreso (Capital/Cobranza)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nombre de la Categoría Principal</label>
                        <input type="text" name="name" required disabled={isPending} placeholder="Ej: Operaciones" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
                    </div>
                    <button type="submit" disabled={isPending} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-2 mt-2 hover:opacity-90 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Crear Categoría Raíz
                    </button>
                 </form>
             )}

             {/* Form - Subcategory */}
             {activeTab === 'subcategory' && (
                 <form onSubmit={handleCreateSubcategory} className="p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Padre Referencial</label>
                        <select name="categoryId" required defaultValue="" disabled={isPending} className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50">
                            <option value="" disabled>Seleccione categoría central...</option>
                            {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.type === 'INCOME' ? 'Ingreso' : 'Egreso'})
                            </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nombre de Variación</label>
                        <input type="text" name="name" required disabled={isPending} placeholder="Ej: Viáticos" className="w-full h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50" />
                    </div>
                    <button type="submit" disabled={isPending} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-2 mt-2 hover:opacity-90 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Adherir Sub-rama
                    </button>
                 </form>
             )}
          </div>
        </div>
      )}
    </>
  )
}
