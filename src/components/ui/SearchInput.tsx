"use client"

import { Search, X } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"

export function SearchInput({ 
  placeholder = "Buscar...",
  value: externalValue,
  onChange: externalOnChange
}: { 
  placeholder?: string
  value?: string
  onChange?: (val: string) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [value, setValue] = useState(searchParams.get("q") || "")
  const [isPending, startTransition] = useTransition()
  const debouncedValue = useDebounce(externalValue !== undefined ? externalValue : value, 400)

  useEffect(() => {
    if (externalOnChange) {
      externalOnChange(debouncedValue)
      return
    }

    const params = new URLSearchParams(searchParams)
    if (debouncedValue) {
      params.set("q", debouncedValue)
    } else {
      params.delete("q")
    }
    params.set("page", "1") // Reset to page 1 on search

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [debouncedValue, pathname, router, searchParams, externalOnChange])

  return (
    <div className="relative group w-full max-w-sm">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className={`w-4 h-4 transition-colors ${isPending ? 'text-indigo-500 animate-pulse' : 'text-zinc-400 group-focus-within:text-indigo-500'}`} />
      </div>
      <input
        type="text"
        value={externalValue !== undefined ? externalValue : value}
        onChange={(e) => externalValue !== undefined ? externalOnChange?.(e.target.value) : setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-11 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
      />
      {(externalValue !== undefined ? externalValue : value) && (
        <button
          onClick={() => externalValue !== undefined ? externalOnChange?.("") : setValue("")}
          className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
