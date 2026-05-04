import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full animate-pulse">
      <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
         <div className="space-y-3">
            <div className="h-9 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
         </div>
         <div className="flex items-center gap-3">
            <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-10 w-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl" />
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
         ))}
      </div>
      <div className="flex items-center justify-center py-4">
         <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    </div>
  )
}
