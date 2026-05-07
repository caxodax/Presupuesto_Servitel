"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"

interface Company {
  id: number
  name: string
}

export function CompanyFilter({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentCompanyId = searchParams.get("companyId") || ""

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set("companyId", value)
    } else {
      params.delete("companyId")
    }
    
    startTransition(() => {
        router.push(`?${params.toString()}`)
    })
  }

  return (
    <div className={`flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 shadow-sm transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
      ) : (
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Empresa:</label>
      )}
      <select 
        value={currentCompanyId}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm font-bold outline-none text-foreground cursor-pointer w-auto max-w-[140px] md:max-w-[180px] truncate disabled:cursor-wait"
      >
        <option value="">Todas</option>
        {(Array.isArray(companies) ? companies : (companies as any).items || []).map((company: any) => (
          <option key={company.id} value={company.id.toString()}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  )
}
