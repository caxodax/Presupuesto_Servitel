"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface Branch {
  id: string
  name: string
  companyId: string
}

export function BranchFilter({ branches, selectedCompanyId }: { branches: Branch[], selectedCompanyId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentBranchId = searchParams.get("branchId") || ""

  const filteredBranches = selectedCompanyId 
    ? branches.filter(b => {
        const compId = (b as any).company_id || b.companyId;
        return compId && compId.toString() === selectedCompanyId.toString();
      })
    : branches

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set("branchId", value)
    } else {
      params.delete("branchId")
    }
    params.set("page", "1")
    
    router.push(`?${params.toString()}`)
  }

  if (selectedCompanyId && filteredBranches.length === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 shadow-sm animate-in fade-in slide-in-from-top-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Sucursal:</label>
      <select 
        value={currentBranchId}
        onChange={handleChange}
        className="bg-transparent text-sm font-bold outline-none text-foreground cursor-pointer w-auto max-w-[140px] truncate"
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
