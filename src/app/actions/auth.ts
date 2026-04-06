"use server"

import { signIn, signOut } from "@/lib/auth"
import { AuthError } from "next-auth"

export async function logout() {
  await signOut({ redirectTo: "/login" })
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Credenciales inválidas."
        default:
          return "Ocurrió un error inesperado al intentar iniciar sesión."
      }
    }
    throw error
  }
}
