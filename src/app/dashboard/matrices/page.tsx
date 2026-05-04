import { getBusinessGroups } from "@/features/companies/server/actions"
import { BusinessGroupRow } from "@/components/empresas/BusinessGroupRow"
import { CreateBusinessGroupModal } from "@/components/empresas/CreateBusinessGroupModal"
import { Layers, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function MatricesPage() {
  const groups = await getBusinessGroups()

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/empresas" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                <Layers className="w-8 h-8 text-indigo-500" /> Gestión de Matrices / Sectores
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Administra los grupos económicos y sectores de actividad.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <CreateBusinessGroupModal />
      </div>
      
      <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-8 py-5">Nombre y Descripción</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {groups.map(group => (
                 <BusinessGroupRow key={group.id} group={group} />
              ))}

              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                        <Layers className="w-10 h-10" />
                        <p className="text-sm font-bold uppercase tracking-widest">No hay matrices registradas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
