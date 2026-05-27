export default function DashboardLoading() {
  return (
    <div className="w-full h-full flex flex-col gap-6 animate-pulse p-1">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="h-8 w-48 bg-zinc-300 dark:bg-zinc-700 rounded-md" />
          <div className="h-4 w-72 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-10 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Grid of Cards (KPIs) */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="h-7 w-28 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Large Content Block Skeleton */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 flex-1">
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
          <div className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" />
          <div className="space-y-3">
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
          <div className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2 w-1/2 bg-zinc-100 dark:bg-zinc-800/80 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
