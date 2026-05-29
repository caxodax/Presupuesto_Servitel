"use client"

import { useState, useTransition, useMemo } from "react"
import { 
    Plus, 
    ChevronRight, 
    ChevronDown, 
    Building2, 
    Tag, 
    Loader2, 
    AlertCircle,
    Search,
    X,
    Settings2
} from "lucide-react"
import { toast } from "sonner"
import { clsx } from "clsx"
import { toggleCompanyAccount, upsertCategoryMapping, deleteCategoryMapping } from "@/features/accounts/server/actions"
import { GlobalAccountModal } from "@/components/accounts/GlobalAccountModal"

const TYPE_LABELS: Record<string, string> = {
    ASSET: "ACTIVO",
    LIABILITY: "PASIVO",
    EQUITY: "PATRIMONIO",
    INCOME: "INGRESO",
    COST: "COSTO",
    EXPENSE: "GASTO"
}

type MappingClientProps = {
    initialMappings: any[]
    companies: any[]
    categories: any[]
    accounts: any[]
    globalAccounts: any[]
    userRole: string
    userCompanyId?: number
}

export function MappingClient({ 
    initialMappings, 
    companies, 
    categories, 
    accounts, 
    globalAccounts,
    userRole,
    userCompanyId 
}: MappingClientProps) {
    const [mappings, setMappings] = useState(initialMappings)
    const [localAccounts, setLocalAccounts] = useState(accounts)
    const [localGlobalAccounts, setLocalGlobalAccounts] = useState(globalAccounts)
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
    const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<any | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 2: true }) // raíces abiertas por defecto
    const [isPending, startTransition] = useTransition()
    
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(userCompanyId?.toString() || "")

    // Filtrar categorías no mapeadas
    const availableCategories = useMemo(() => {
        if (!selectedCompanyId) return []
        const companyCats = categories.filter(c => !c.companyId || Number(c.companyId) === Number(selectedCompanyId))
        return companyCats.filter(c => !mappings.some(m => m.categoryId === c.id && Number(m.companyId) === Number(selectedCompanyId)))
    }, [categories, mappings, selectedCompanyId])

    const handleAddMapping = async (companyAccountId: number, categoryId: number) => {
        if (!selectedCompanyId) return

        const payload = {
            companyId: Number(selectedCompanyId),
            categoryId: categoryId,
            companyAccountId: companyAccountId,
            subcategoryId: null
        }

        startTransition(async () => {
            try {
                const result = (await upsertCategoryMapping(payload)) as any
                
                // Enriquecer el resultado localmente
                const companyAccount = localAccounts.find(a => a.id === payload.companyAccountId)
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
            } catch (err: any) {
                toast.error(err.message || "Error al crear mapeo")
            }
        })
    }

    const handleRemoveMapping = async (mappingId: number) => {
        startTransition(async () => {
            try {
                await deleteCategoryMapping(mappingId)
                setMappings(prev => prev.filter(m => m.id !== mappingId))
                toast.success("Mapeo eliminado correctamente")
            } catch (err: any) {
                toast.error(err.message || "Error al eliminar mapeo")
            }
        })
    }

    const handleEnableAccount = async (globalAccountId: number) => {
        if (!selectedCompanyId) return

        startTransition(async () => {
            try {
                const companyIdNum = Number(selectedCompanyId)
                const result = await toggleCompanyAccount({
                    companyId: companyIdNum,
                    globalAccountId: globalAccountId,
                    isActive: true
                })
                
                // Enriquecer y añadir a localAccounts
                const globalAcc = localGlobalAccounts.find(ga => ga.id === globalAccountId)
                const newCompanyAccount = {
                    ...result,
                    globalAccount: globalAcc
                }
                
                setLocalAccounts(prev => [...prev, newCompanyAccount])
                toast.success("Cuenta habilitada correctamente")
            } catch (err: any) {
                toast.error(err.message || "Error al habilitar cuenta")
            }
        })
    }

    const handleAccountCreated = (newCompanyAccount: any) => {
        setLocalAccounts(prev => [...prev, newCompanyAccount])
        if (newCompanyAccount.globalAccount) {
            setLocalGlobalAccounts(prev => [...prev, newCompanyAccount.globalAccount])
        }
    }

    const handleAccountUpdated = (updatedAccount: any) => {
        setLocalGlobalAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a))
        setLocalAccounts(prev => prev.map(a => a.globalAccountId === updatedAccount.id ? { ...a, globalAccount: updatedAccount } : a))
    }

    const toggleExpand = (id: number) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const filteredGlobalAccounts = useMemo(() => {
        if (!searchQuery) return localGlobalAccounts
        const s = searchQuery.toLowerCase()
        return localGlobalAccounts.filter(a => 
            a.code.toLowerCase().includes(s) || 
            a.name.toLowerCase().includes(s)
        )
    }, [localGlobalAccounts, searchQuery])

    const rootAccounts = useMemo(() => 
        localGlobalAccounts.filter(a => !a.parentId).sort((a, b) => a.code.localeCompare(b.code)), 
        [localGlobalAccounts]
    )

    const hasMatchingDescendant = (accId: number): boolean => {
        const children = localGlobalAccounts.filter(a => a.parentId === accId)
        for (const child of children) {
            if (filteredGlobalAccounts.some(fa => fa.id === child.id)) return true
            if (hasMatchingDescendant(child.id)) return true
        }
        return false
    }

    const renderAccountRow = (account: any, depth: number = 0): React.ReactNode => {
        const children = localGlobalAccounts.filter(a => a.parentId === account.id).sort((a, b) => a.code.localeCompare(b.code))
        const isExpanded = expanded[account.id]
        const hasChildren = children.length > 0
        
        const isVisible = !searchQuery || filteredGlobalAccounts.some(fa => fa.id === account.id) || hasMatchingDescendant(account.id)
        if (!isVisible) return null

        const companyAccount = localAccounts.find(ca => ca.globalAccountId === account.id && Number(ca.companyId) === Number(selectedCompanyId))
        const isEnabled = companyAccount?.isActive ?? false

        const rowMappings = companyAccount ? mappings.filter(m => m.companyAccountId === companyAccount.id) : []

        return (
            <>
                <tr 
                    key={account.id} 
                    className={clsx(
                        "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 border-b border-zinc-100 dark:border-zinc-800/50 transition-colors",
                        !isEnabled && "opacity-60 bg-zinc-50/30 dark:bg-zinc-950/10"
                    )}
                >
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                            {hasChildren ? (
                                <button 
                                    onClick={() => toggleExpand(account.id)}
                                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-transform text-zinc-400 hover:text-zinc-600 animate-all"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : (
                                <div className="w-6 h-6 shrink-0" />
                            )}
                            <span className="font-mono text-xs font-bold text-zinc-400 whitespace-nowrap">
                                {account.code}
                            </span>
                            <span className="font-bold text-sm text-foreground">
                                {account.name}
                            </span>
                            {userRole === 'SUPER_ADMIN' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedAccountForEdit(account)
                                        setIsEditModalOpen(true)
                                    }}
                                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 rounded transition-colors ml-1"
                                    title="Editar cuenta"
                                >
                                    <Settings2 size={13} />
                                </button>
                            )}
                            {account.isMovementAccount && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-blue-500/10 text-blue-500 font-bold uppercase tracking-tighter border border-blue-500/15">
                                    Movimiento
                                </span>
                            )}
                        </div>
                    </td>

                    <td className="px-6 py-4">
                        <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                            account.type === "INCOME" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/15",
                            account.type === "EXPENSE" && "bg-rose-500/10 text-rose-500 border-rose-500/15",
                            account.type === "COST" && "bg-amber-500/10 text-amber-500 border-amber-500/15",
                            (account.type === "ASSET" || account.type === "LIABILITY" || account.type === "EQUITY") && "bg-zinc-500/10 text-zinc-500 border-zinc-500/15"
                        )}>
                            {TYPE_LABELS[account.type] || account.type}
                        </span>
                    </td>

                    <td className="px-6 py-4">
                        {isEnabled ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {rowMappings.map(m => (
                                    <span 
                                        key={m.id} 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10"
                                    >
                                        <Tag className="w-3 h-3 shrink-0 opacity-70" />
                                        {m.category?.name}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMapping(m.id)}
                                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors ml-0.5 text-indigo-500"
                                            title="Desvincular"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                                {rowMappings.length === 0 && (
                                    <span className="text-xs text-zinc-400 italic">Sin mapear</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-zinc-400/50 italic">Habilite la cuenta contable para asociar categorías</span>
                        )}
                    </td>

                    <td className="px-6 py-4 text-right">
                        {isEnabled ? (
                            <select
                                value=""
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (val) handleAddMapping(companyAccount.id, Number(val))
                                }}
                                className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 text-xs font-bold outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                            >
                                <option value="">+ Vincular categoría</option>
                                {availableCategories.map(c => (
                                    <option key={c.id} value={c.id.toString()}>{c.name} ({TYPE_LABELS[c.type] || c.type})</option>
                                ))}
                            </select>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleEnableAccount(account.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Habilitar cuenta
                            </button>
                        )}
                    </td>
                </tr>
                {hasChildren && isExpanded && children.map(child => renderAccountRow(child, depth + 1))}
            </>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" /> Empresa:
                        </label>
                        <select 
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            disabled={userRole !== 'SUPER_ADMIN'}
                            className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">Seleccione empresa...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id.toString()}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="w-full h-10 pl-9 pr-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {userRole === 'SUPER_ADMIN' && selectedCompanyId && (
                    <button 
                        onClick={() => setIsAccountModalOpen(true)}
                        className="flex items-center gap-2 px-5 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10"
                    >
                        <Plus size={16} /> Nueva Cuenta
                    </button>
                )}
            </div>

            {isAccountModalOpen && (
                <GlobalAccountModal 
                    mode="create"
                    globalAccounts={localGlobalAccounts}
                    companyIdToLink={Number(selectedCompanyId)}
                    onClose={() => setIsAccountModalOpen(false)}
                    onSuccess={handleAccountCreated}
                />
            )}

            {isEditModalOpen && selectedAccountForEdit && (
                <GlobalAccountModal 
                    mode="edit"
                    account={selectedAccountForEdit}
                    globalAccounts={localGlobalAccounts}
                    onClose={() => {
                        setIsEditModalOpen(false)
                        setSelectedAccountForEdit(null)
                    }}
                    onSuccess={handleAccountUpdated}
                />
            )}

            {selectedCompanyId ? (
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-black text-foreground">Plan de Cuentas y Mapeo</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                            Total: {mappings.length} categorías legadas mapeadas
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/2">Código / Cuenta</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/12">Tipo</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/3">Categorías Legacy Asociadas</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rootAccounts.map(account => renderAccountRow(account))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 p-20 text-center shadow-sm">
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                        <AlertCircle className="w-12 h-12 opacity-30 text-indigo-500 animate-pulse" />
                        <h4 className="text-base font-black uppercase tracking-wider text-foreground">Seleccione una empresa</h4>
                        <p className="text-sm text-zinc-400 max-w-md mx-auto">
                            Debe seleccionar una empresa en el filtro superior para visualizar su Plan de Cuentas y gestionar las relaciones contables.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
