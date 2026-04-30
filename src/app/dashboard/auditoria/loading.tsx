import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="flex-1 rounded-xl border bg-card overflow-hidden">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="p-0">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex gap-4 p-4 border-b">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
