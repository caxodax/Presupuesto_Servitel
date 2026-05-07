import { Skeleton } from "@/components/ui/skeleton"

export function ReportsSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>

            <div className="h-[400px] bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-8">
                <div className="flex justify-between mb-8">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                </div>
                <div className="w-full h-full flex items-end gap-4 pb-8">
                    {[...Array(12)].map((_, i) => (
                        <Skeleton key={i} className="flex-1" style={{ height: `${20 + Math.random() * 60}%` }} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-[300px] bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-8">
                    <Skeleton className="h-4 w-40 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="h-[300px] bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-8">
                    <Skeleton className="h-4 w-40 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
