"use server"

import { signIn, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function logout() {
  await signOut({ redirectTo: "/login" })
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
    })
  } catch (error: any) {
    console.error("Error de autenticación:", error.message)
    if (error.message?.includes("Invalid login credentials") || error.message?.includes("Email not confirmed")) {
      return "Credenciales inválidas o cuenta no verificada."
    }
    return "Ocurrió un error inesperado al intentar iniciar sesión."
  }
  
  redirect("/dashboard")
}
