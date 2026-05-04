"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"

interface Branch {
  id: number
  name: string
  companyId: number
}

export function BranchFilter({ branches, selectedCompanyId }: { branches: Branch[], selectedCompanyId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentBranchId = searchParams.get("branchId") || ""

  const branchesList = Array.isArray(branches) ? branches : (branches as any).items || []

  const filteredBranches = selectedCompanyId 
    ? branchesList.filter((b: any) => {
        const compId = b.companyId || b.company_id;
        return compId && compId.toString() === selectedCompanyId.toString();
      })
    : branchesList

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set("branchId", value)
    } else {
      params.delete("branchId")
    }
    params.set("page", "1")
    
    startTransition(() => {
        router.push(`?${params.toString()}`)
    })
  }

  if (selectedCompanyId && filteredBranches.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 shadow-sm animate-in fade-in slide-in-from-top-2 transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
      ) : (
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Sucursal:</label>
      )}
      <select 
        value={currentBranchId}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm font-bold outline-none text-foreground cursor-pointer w-auto max-w-[140px] truncate disabled:cursor-wait"
      >
        <option value="">Todas</option>
        {filteredBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
