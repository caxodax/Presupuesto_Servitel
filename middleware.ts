import NextAuth from "next-auth"
import { authConfig } from "./src/lib/auth.config"

// Exponemos la funcionalidad del interceptor nativo de next auth
export default NextAuth(authConfig).auth

// Configuración de filtro del middleware: Cuidando que no intercepte imagenes/api publica
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
