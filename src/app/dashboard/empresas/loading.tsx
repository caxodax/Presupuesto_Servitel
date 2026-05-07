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
      
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
         <div className="h-14 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800" />
         <div className="p-8 space-y-6">
            {[...Array(5)].map((_, i) => (
               <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                     <div className="space-y-2">
                        <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded" />
                     </div>
                  </div>
                  <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  <div className="h-8 w-16 rounded-lg bg-zinc-50 dark:bg-zinc-800" />
               </div>
            ))}
         </div>
      </div>
      <div className="flex items-center justify-center py-4">
         <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    </div>
  )
}
