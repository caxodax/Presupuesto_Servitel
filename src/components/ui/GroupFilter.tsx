"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"

interface BusinessGroup {
  id: number
  name: string
}

export function GroupFilter({ groups }: { groups: BusinessGroup[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentGroupId = searchParams.get("groupId") || ""

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set("groupId", value)
    } else {
      params.delete("groupId")
    }

    // Reset dependents
    params.delete("companyId")
    params.delete("branchId")
    params.delete("page")
    
    startTransition(() => {
        router.push(`?${params.toString()}`)
    })
  }

  return (
    <div className={`flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-2 shadow-sm transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
      ) : (
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Matriz:</label>
      )}
      <select 
        value={currentGroupId}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm font-bold outline-none text-foreground cursor-pointer w-auto max-w-[140px] md:max-w-[180px] truncate disabled:cursor-wait"
      >
        <option value="">Todas</option>
        {(Array.isArray(groups) ? groups : (groups as any).items || []).map((group: any) => (
          <option key={group.id} value={group.id.toString()}>
            {group.name}
          </option>
        ))}
      </select>
    </div>
  )
}
