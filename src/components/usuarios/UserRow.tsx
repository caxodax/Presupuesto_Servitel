"use client"

import { useState, useTransition, useOptimistic } from "react"
import { toggleUserStatus, updateUser } from "@/features/users/server/actions"
import { MoreHorizontal, User as UserIcon, ShieldX, ShieldCheck, Edit2, X, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

type UserItem = {
    id: number
    name: string
    email: string
    role: string
    isActive: boolean
    company?: { id: number, name: string } | null
    branch?: { id: number, name: string } | null
}

export function UserRow({ user, companies, branches }: { user: UserItem, companies: any[], branches: any[] }) {
    const [isPendingToggle, startTransitionToggle] = useTransition()
    const [showEdit, setShowEdit] = useState(false)

    const [optimisticUser, setOptimisticUser] = useOptimistic(
        user,
        (state, newState: Partial<typeof user>) => ({ ...state, ...newState })
    )

    const handleToggle = () => {
        if (!confirm(`¿Estás seguro de que deseas ${optimisticUser.isActive ? 'SUSPENDER' : 'REACTIVAR'} el acceso de ${optimisticUser.name}?`)) return
        
        startTransitionToggle(async () => {
            setOptimisticUser({ isActive: !optimisticUser.isActive })
            try {
                await toggleUserStatus(user.id)
                toast.success(optimisticUser.isActive ? 'Usuario suspendido' : 'Usuario reactivado')
            } catch (e: any) {
                toast.error(e.message || "Error al cambiar el estado del usuario")
            }
        })
    }

    return (
        <>
            <tr className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all duration-300 ${!optimisticUser.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <td className="px-8 py-5">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground flex items-center gap-2 tracking-tight">
                            <div className={`p-1.5 rounded-lg ${optimisticUser.isActive ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600' : 'bg-zinc-100 text-zinc-400'}`}>
                                <UserIcon className="w-3.5 h-3.5" /> 
                            </div>
                            {optimisticUser.name}
                            {!optimisticUser.isActive && (
                                <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/30">
                                    Inactivo
                                </span>
                            )}
                        </span>
                        <span className="text-[11px] text-zinc-500 pl-8 font-medium">{optimisticUser.email}</span>
                    </div>
                </td>
                <td className="px-8 py-5">
                    <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                        optimisticUser.role === 'SUPER_ADMIN' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400' : 
                        optimisticUser.role === 'COMPANY_ADMIN' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' : 
                        'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
                    }`}>
                        {optimisticUser.role.replace('_', ' ')}
                    </span>
                </td>
                <td className="px-8 py-5">
                    {optimisticUser.company ? (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{optimisticUser.company.name}</span>
                            {optimisticUser.branch && <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight flex items-center gap-1 opacity-70"><div className="w-1 h-1 rounded-full bg-zinc-300" /> {optimisticUser.branch.name}</span>}
                        </div>
                    ) : (
                        <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest italic">- Acceso Global -</span>
                    )}
                </td>
                <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                        <button 
                            onClick={() => setShowEdit(true)}
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl text-indigo-500 transition-all active:scale-90 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 shadow-sm hover:shadow-indigo-500/10"
                            title="Editar Perfil"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button 
                            onClick={handleToggle}
                            disabled={isPendingToggle}
                            className={`p-2 rounded-xl transition-all shadow-sm active:scale-90 border disabled:opacity-50 ${
                                optimisticUser.isActive 
                                ? 'text-rose-500 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 hover:border-rose-100 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/50' 
                                : 'text-emerald-500 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 hover:border-emerald-100 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-900/50'
                            }`}
                            title={optimisticUser.isActive ? "Suspender Usuario" : "Activar Usuario"}
                        >
                            {isPendingToggle ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                optimisticUser.isActive ? <ShieldX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {showEdit && (
                        <UserEditModal 
                            user={user} 
                            companies={companies} 
                            branches={branches} 
                            onClose={() => setShowEdit(false)} 
                        />
                    )}
                </td>
            </tr>
        </>
    )
}

function UserEditModal({ user, companies, branches, onClose }: { user: UserItem, companies: any[], branches: any[], onClose: () => void }) {
    const [selectedCompany, setSelectedCompany] = useState<number | "">(user.company?.id || "")
    const [selectedRole, setSelectedRole] = useState(user.role)
    const [showPassword, setShowPassword] = useState(false)
    const [isSaving, startTransitionUpdate] = useTransition()

    const branchesList = Array.isArray(branches) ? branches : (branches as any).items || []
    const companiesList = Array.isArray(companies) ? companies : (companies as any).items || []

    const filteredBranches = branchesList.filter((b: any) => Number(b.companyId) === Number(selectedCompany))

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        startTransitionUpdate(async () => {
            try {
                await updateUser(formData)
                toast.success("Perfil actualizado correctamente")
                onClose()
            } catch (e: any) {
                toast.error(e.message || "Error al actualizar el usuario")
            }
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 backdrop-blur-md p-4 text-left whitespace-normal animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_20px_70px_rgba(0,0,0,0.3)] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="relative p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Edit2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-foreground">Editar Acceso</h2>
                            <p className="text-sm text-zinc-500 font-medium mt-0.5">Ajustando permisos para <strong className="text-indigo-600 dark:text-indigo-400 font-black">{user.email}</strong></p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        className="absolute top-8 right-8 p-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-all active:scale-90 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form 
                    onSubmit={handleUpdate}
                    className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                    <input type="hidden" name="userId" value={user.id.toString()} />
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nombre Completo</label>
                        <input type="text" name="name" defaultValue={user.name} disabled={isSaving} required className="w-full h-12 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm disabled:opacity-50" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 ml-1">Rol de Sistema</label>
                        <div className="relative">
                            <select 
                                name="role" 
                                value={selectedRole} 
                                onChange={(e) => setSelectedRole(e.target.value)}
                                required 
                                disabled={isSaving}
                                className="w-full h-12 px-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-sm font-black text-indigo-700 dark:text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer transition-all shadow-sm disabled:opacity-50"
                            >
                                <option value="OPERATOR">Operador (Zonal)</option>
                                <option value="COMPANY_ADMIN">Administrador Empresa</option>
                                <option value="AUDITOR">Auditor</option>
                                <option value="SUPER_ADMIN">Super Administrador</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Empresa Corporativa</label>
                        <select 
                            name="companyId" 
                            value={selectedCompany || ''} 
                            onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : "")}
                            disabled={isSaving}
                            className="w-full h-12 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                        >
                            <option value="">-- Sin Empresa --</option>
                            {companiesList.map((c: any) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Sucursal Asignada</label>
                        <select 
                            name="branchId" 
                            defaultValue={user.branch?.id?.toString() || ""}
                            disabled={isSaving || !selectedCompany || (selectedRole !== 'OPERATOR' && selectedRole !== 'AUDITOR')}
                            className="w-full h-12 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:opacity-40 cursor-pointer transition-all shadow-sm"
                        >
                            <option value="">-- Sin Sucursal --</option>
                            {filteredBranches.map((b: any) => <option key={b.id} value={b.id.toString()}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nueva Contraseña (Opcional)</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                placeholder="Dejar en blanco para mantener la actual"
                                disabled={isSaving} 
                                className="w-full h-12 px-5 pr-12 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm disabled:opacity-50" 
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium ml-1">Mínimo 6 caracteres si decide cambiarla.</p>
                    </div>

                    <div className="md:col-span-2 flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 h-14 rounded-2xl text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
                        >
                            Cerrar
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-zinc-500/20 uppercase tracking-widest"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    Actualizar Perfil
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
