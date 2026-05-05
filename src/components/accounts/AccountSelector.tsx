"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { getAccounts } from "@/features/accounts/server/queries"

interface Account {
  id: number
  code: string
  name: string
  type: string
}

interface AccountSelectorProps {
  label?: string
  placeholder?: string
  defaultValue?: number | null
  onSelect: (accountId: number | null) => void
  type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'COST' | 'EXPENSE'
  isBudgetable?: boolean
  isExecutable?: boolean
  companyId?: number
  error?: string
}

export function AccountSelector({
  label,
  placeholder = "Seleccionar cuenta...",
  defaultValue,
  onSelect,
  type,
  isBudgetable,
  isExecutable,
  companyId,
  error
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cargar cuenta inicial si hay defaultValue
  useEffect(() => {
    if (defaultValue) {
      // Intentar buscar la cuenta inicial
      setIsLoading(true)
      getAccounts({ companyId }).then((data: any) => {
        const found = Array.isArray(data) ? data.find((a: any) => a.id === defaultValue) : null
        if (found) setSelectedAccount(found)
        setIsLoading(false)
      }).catch(() => setIsLoading(false))
    } else {
      setSelectedAccount(null)
    }
  }, [defaultValue, companyId])

  // Buscar cuentas cuando cambia el query o filtros
  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true)
      try {
        const results = await getAccounts({
          query: debouncedQuery,
          type,
          isBudgetable,
          isExecutable,
          companyId,
          limit: 10
        })
        setAccounts(Array.isArray(results) ? results : (results as any).items || [])
      } catch (err) {
        console.error("Error fetching accounts:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchAccounts()
    }
  }, [debouncedQuery, isOpen, type, isBudgetable, isExecutable, companyId])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (account: Account) => {
    setSelectedAccount(account)
    onSelect(account.id)
    setIsOpen(false)
    setQuery("")
  }

  const handleClear = () => {
    setSelectedAccount(null)
    onSelect(null)
  }

  return (
    <div className="flex flex-col gap-1.5 w-full" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between h-11 px-4 bg-zinc-50 dark:bg-zinc-950 border ${error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl text-sm font-medium transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500`}
        >
          <span className={selectedAccount ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}>
            {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : placeholder}
          </span>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  className="w-full h-9 pl-9 pr-4 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelect(account)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-left transition-colors group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">
                        {account.code}
                      </span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 font-medium">
                        {account.name}
                      </span>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <Check className="w-4 h-4 text-indigo-500" />
                    )}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  {isLoading ? "Buscando cuentas..." : "No se encontraron cuentas"}
                </div>
              )}
            </div>

            {selectedAccount && (
              <div className="p-1 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full py-2 text-[10px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Limpiar selección
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <span className="text-[10px] font-bold text-red-500 px-1 uppercase">{error}</span>}
    </div>
  )
}
