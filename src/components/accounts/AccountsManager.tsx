"use client"

import { useState, useMemo } from "react"
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Check, 
  X, 
  Settings2,
  Building2,
  Lock,
  Eye,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { toggleCompanyAccount, deleteGlobalAccount } from "@/features/accounts/server/actions"
import { toast } from "sonner"
import { clsx } from "clsx"
import { GlobalAccountModal } from "./GlobalAccountModal"

interface GlobalAccount {
  id: number
  code: string
  name: string
  type: string
  parentId: number | null
  level: number
  isMovementAccount: boolean
  isBudgetable: boolean
  isExecutable: boolean
  isActive: boolean
}

interface CompanyAccount {
  id: number
  companyId: number
  globalAccountId: number
  isActive: boolean
}

interface Props {
  globalAccounts: GlobalAccount[]
  companyAccounts: CompanyAccount[]
  companyId: number
  userRole: string
}

export function AccountsManager({ globalAccounts, companyAccounts, companyId, userRole }: Props) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 2: true }) // Expande raíces por defecto
  const [loading, setLoading] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedAccount, setSelectedAccount] = useState<GlobalAccount | null>(null)

  // Mapeo de cuentas activas por globalId
  const activeMap = useMemo(() => {
    const map: Record<number, CompanyAccount> = {}
    companyAccounts.forEach(ca => {
      if (ca.isActive) map[ca.globalAccountId] = ca
    })
    return map
  }, [companyAccounts])

  // Filtrar y jerarquizar
  const filteredAccounts = useMemo(() => {
    if (!search) return globalAccounts
    const s = search.toLowerCase()
    return globalAccounts.filter(a => 
      a.code.toLowerCase().includes(s) || 
      a.name.toLowerCase().includes(s)
    )
  }, [globalAccounts, search])

  const rootAccounts = useMemo(() => 
    globalAccounts.filter(a => !a.parentId).sort((a, b) => a.code.localeCompare(b.code)), 
    [globalAccounts]
  )

  const toggleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleToggleActivation = async (globalId: number, currentlyActive: boolean) => {
    setLoading(globalId)
    try {
      await toggleCompanyAccount({
        companyId,
        globalAccountId: globalId,
        isActive: !currentlyActive
      })
      toast.success(currentlyActive ? "Cuenta desactivada" : "Cuenta activada")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteGlobal = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta cuenta global? Esta acción podría afectar activaciones existentes.")) return
    
    try {
      await deleteGlobalAccount(id)
      toast.success("Cuenta global eliminada")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openCreateModal = () => {
    setModalMode("create")
    setSelectedAccount(null)
    setIsModalOpen(true)
  }

  const openEditModal = (account: GlobalAccount) => {
    setModalMode("edit")
    setSelectedAccount(account)
    setIsModalOpen(true)
  }

  const renderAccount = (account: GlobalAccount, depth: number = 0) => {
    const children = globalAccounts.filter(a => a.parentId === account.id).sort((a, b) => a.code.localeCompare(b.code))
    const isExpanded = expanded[account.id]
    const hasChildren = children.length > 0
    const isActive = !!activeMap[account.id]
    const isVisible = !search || filteredAccounts.some(fa => fa.id === account.id)

    if (!isVisible && !hasChildren) return null

    return (
      <div key={account.id} className="flex flex-col">
        <div 
          className={clsx(
            "group flex items-center gap-3 py-2 px-3 rounded-lg transition-all hover:bg-accent/50 border border-transparent",
            isActive ? "bg-primary/5 border-primary/10" : "opacity-70 grayscale-[0.5]"
          )}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <button 
            onClick={() => toggleExpand(account.id)}
            className={clsx(
              "p-1 hover:bg-accent rounded transition-transform",
              !hasChildren && "invisible",
              isExpanded && "rotate-0"
            )}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground whitespace-nowrap">
                {account.code}
              </span>
              <span className="font-medium truncate text-sm">
                {account.name}
              </span>
              {account.isMovementAccount && (
                 <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20 uppercase tracking-tighter">
                   Movimiento
                 </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-accent/50 px-2 py-1 rounded">
                <span className={clsx(account.isBudgetable ? "text-green-500" : "text-muted-foreground/30")}>P</span>
                <span className={clsx(account.isExecutable ? "text-blue-500" : "text-muted-foreground/30")}>E</span>
             </div>
             
             {userRole === 'SUPER_ADMIN' && (
               <div className="flex items-center gap-1">
                 <button 
                  onClick={() => openEditModal(account)}
                  className="p-1.5 hover:bg-indigo-500/10 text-indigo-500 rounded transition-colors"
                  title="Editar Cuenta Global"
                 >
                   <Settings2 size={14} />
                 </button>
                 <button 
                  onClick={() => handleDeleteGlobal(account.id)}
                  className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded transition-colors"
                  title="Eliminar Cuenta Global"
                 >
                   <XCircle size={14} />
                 </button>
               </div>
             )}
          </div>

          <button
            onClick={() => handleToggleActivation(account.id, isActive)}
            disabled={loading === account.id}
            className={clsx(
              "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2",
              isActive 
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
            )}
          >
            {loading === account.id ? (
               <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isActive ? (
              <>Desactivar</>
            ) : (
              <>Activar</>
            )}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(child => renderAccount(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text"
            placeholder="Buscar por código o nombre..."
            className="w-full pl-10 pr-4 py-2 bg-accent/50 rounded-lg border-none focus:ring-2 ring-primary/20 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" /> Activas
              <div className="w-3 h-3 rounded-full bg-accent border border-border" /> Disponibles
           </div>
           {userRole === 'SUPER_ADMIN' && (
             <button 
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-sm font-medium"
              >
               <Plus size={18} /> Nueva Cuenta Global
             </button>
           )}
        </div>
      </div>

      {isModalOpen && (
        <GlobalAccountModal 
          mode={modalMode}
          account={selectedAccount}
          globalAccounts={globalAccounts}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-1 pb-20">
        {rootAccounts.map(account => renderAccount(account))}
      </div>
    </div>
  )
}
