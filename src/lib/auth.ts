import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(provider: string, options: { email?: any, password?: any, redirectTo?: string }) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: options.email,
    password: options.password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut(options?: { redirectTo?: string }) {
  const supabase = createClient()
  await supabase.auth.signOut()
  
  if (options?.redirectTo) {
    redirect(options.redirectTo)
  }
}

// Mantenemos una exportación 'auth' para compatibilidad conceptual, 
// apuntando a nuestro nuevo sistema de sesión.
export { getSession as auth } from "./permissions"
