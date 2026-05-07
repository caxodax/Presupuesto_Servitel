import { requireAuth } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function AuditoriaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  
  if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN" && user.role !== "AUDITOR") {
    redirect("/dashboard")
  }
  
  return <>{children}</>
}
