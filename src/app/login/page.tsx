"use client"

import { useFormState, useFormStatus } from "react-dom"
import { authenticate } from "@/app/actions/auth"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full mt-4 bg-indigo-600 text-white rounded-md py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98]"
    >
      {pending ? "Iniciando..." : "Ingresar a mi cuenta"}
    </button>
  )
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50/50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-[380px] rounded-xl border bg-white dark:bg-zinc-900 border-border dark:border-zinc-800 p-8 shadow-[0_4px_40px_rgba(0,0,0,0.02)]">
        
        <div className="flex flex-col space-y-2 text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">SaaS Presupuesto</h1>
            <p className="text-sm text-muted-foreground text-balance">
                Autentíquese para continuar
            </p>
        </div>
        
        <form action={dispatch} className="flex flex-col gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none block" htmlFor="email">
                Correo Empresarial
            </label>
            <input 
               id="email"
               name="email"
               type="email" 
               required
               className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
               placeholder="admin@empresa.com" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none block" htmlFor="password">
                Contraseña
            </label>
            <div className="relative">
              <input 
                 id="password"
                 name="password"
                 type={showPassword ? "text" : "password"} 
                 required
                 className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow pr-10" 
                 placeholder="••••••••" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <SubmitButton />
          
          {errorMessage && (
            <p className="text-sm text-rose-500 mt-2 text-center font-medium bg-rose-50 dark:bg-rose-500/10 p-2 rounded-md">
                {errorMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
