"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface Company {
  id: string
  name: string
}

export function CompanyFilter({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCompanyId = searchParams.get("companyId") || ""

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set("companyId", value)
    } else {
      params.delete("companyId")
    }
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 shadow-sm">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Empresa:</label>
      <select 
        value={currentCompanyId}
        onChange={handleChange}
        className="bg-transparent text-sm font-bold outline-none text-foreground cursor-pointer w-auto max-w-[140px] md:max-w-[180px] truncate"
      >
        <option value="">Todas</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  )
}
