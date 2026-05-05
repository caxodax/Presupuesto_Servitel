import { z } from "zod";

export const invoiceSchema = z.object({
  number: z.string()
    .min(1, "El número de factura o documento es obligatorio")
    .max(50, "El identificador es demasiado largo"),
  supplierName: z.string()
    .min(2, "La razón social del proveedor debe tener al menos 2 caracteres")
    .max(100, "Nombre de proveedor demasiado largo"),
  allocationId: z.union([z.string(), z.number()])
    .transform(v => Number(v))
    .refine(v => v > 0, "Debe seleccionar un destino de presupuesto válido"),
  amountUSD: z.coerce.number()
    .min(0.01, "El monto debe ser mayor a cero")
    .max(1000000, "Monto excede el límite operativo permitido"),
  exchangeRate: z.coerce.number()
    .min(0.0001, "La tasa de cambio es inválida")
    .max(2000, "Tasa de cambio fuera de rango lógico"),
  date: z.string()
    .min(1, "La fecha contable es obligatoria")
    .refine(v => !isNaN(Date.parse(v)), "Fecha inválida"),
  accountId: z.union([z.string(), z.number()]).optional().nullable().transform(v => v ? Number(v) : null),
  invoiceId: z.coerce.number().optional(),
});
