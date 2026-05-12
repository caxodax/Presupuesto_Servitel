import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | string | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || num === '') return '0,00'
  const value = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(value)) return '0,00'
  
  // Forzamos locale de-DE para usar punto como miles y coma como decimales (estándar contable)
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'S/F'
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : date
  if (isNaN(d.getTime())) return 'Fecha Inválida'

  // Forzamos locale es-VE para consistencia absoluta entre servidor y cliente
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
