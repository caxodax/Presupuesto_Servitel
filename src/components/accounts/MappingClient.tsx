"use client"

import { useState, useTransition } from "react"
import { upsertCategoryMapping } from "@/features/accounts/server/actions"
import { 
    Plus, 
    Trash2, 
    ArrowRightLeft, 
    Building2, 
    Tag, 
    BookOpen, 
    Loader2, 
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { toast } from "sonner"

type MappingClientProps = {
    initialMappings: any[]
    companies: any[]
    categories: any[]
    accounts: any[]
    userRole: string
    userCompanyId?: number
}

export function MappingClient({ 
    initialMappings, 
    companies, 
    categories, 
    accounts, 
    userRole,
    userCompanyId 
}: MappingClientProps) {
    const [mappings, setMappings] = useState(initialMappings)
    const [isPending, startTransition] = useTransition()
    
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(userCompanyId?.toString() || "")
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")

    const handleAddMapping = async () => {
        if (!selectedCompanyId || !selectedCategoryId || !selectedAccountId) {
            toast.error("Por favor complete todos los campos")
            return
        }

        const payload = {
            companyId: Number(selectedCompanyId),
            categoryId: Number(selectedCategoryId),
            companyAccountId: Number(selectedAccountId),
            subcategoryId: null
        }

        startTransition(async () => {
            try {
                const result = await upsertCategoryMapping(payload)
                
                // Enriquecer el resultado localmente
                const companyAccount = accounts.find(a => a.id === payload.companyAccountId)
                const category = categories.find(c => c.id === payload.categoryId)
                
                const newMapping = {
                    ...result,
                    companyAccount,
                    category
                }

                setMappings(prev => {
                    const filtered = prev.filter(m => 
                        !(m.companyId === payload.companyId && m.categoryId === payload.categoryId)
                    )
                    return [newMapping, ...filtered]
                })

                toast.success("Mapeo configurado correctamente")
                setSelectedCategoryId("")
                setSelectedAccountId("")
            } catch (err: any) {
                toast.error(err.message || "Error al crear mapeo")
            }
        })
    }

    const filteredCategories = categories.filter(c => 
        !selectedCompanyId || !c.companyId || Number(c.companyId) === Number(selectedCompanyId)
    )

    return (
        <div className="space-y-6">
            
            {/* Formulario de creación rápida */}
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">Vincular Nueva Relación</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Automatización de clasificación contable</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" /> 1. Empresa
                        </label>
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            disabled={userRole !== 'SUPER_ADMIN'}
                            className="w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">Seleccione...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id.toString()}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" /> 2. Categoría Legacy
                        </label>
                        <select 
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">Seleccione...</option>
                            {filteredCategories.map(c => (
                                <option key={c.id} value={c.id.toString()}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" /> 3. Cuenta Contable
                        </label>
                        <select 
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">Seleccione...</option>
                            {accounts.map(a => (
                                <option key={a.id} value={a.id.toString()}>{a.code} - {a.name}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleAddMapping}
                        disabled={isPending}
                        className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-600/20"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                        {isPending ? 'Guardando...' : 'Establecer Mapeo'}
                    </button>
                </div>
            </div>

            {/* Listado de mapeos */}
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-lg font-black text-foreground">Relaciones Activas</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Total: {mappings.length} reglas de negocio</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Categoría Original</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Dirección</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Cuenta Contable Destino</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">Empresa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {mappings.map(m => (
                                <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                <Tag className="w-4 h-4 text-zinc-400" />
                                            </div>
                                            <span className="text-sm font-bold text-foreground">{m.category?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center">
                                            <ArrowRightLeft className="w-4 h-4 text-indigo-500/50 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
                                                {m.companyAccount?.globalAccount?.code || m.account?.code}
                                            </span>
                                            <span className="text-sm font-black text-foreground">
                                                {m.companyAccount?.globalAccount?.name || m.account?.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-500">
                                            {companies.find(c => c.id === m.companyId)?.name || 'Desconocida'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {mappings.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-zinc-400">
                                            <AlertCircle className="w-10 h-10 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay mapeos configurados aún</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
