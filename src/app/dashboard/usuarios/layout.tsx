import { requireAuth } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard")
  return <>{children}</>
}
