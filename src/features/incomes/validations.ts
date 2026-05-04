import { z } from "zod";

export const incomeSchema = z.object({
  number: z.string().min(1, "El número de documento es obligatorio"),
  clientName: z.string().min(2, "Cliente requerido"),
  categoryId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  subcategoryId: z.union([z.string(), z.number(), z.null()]).optional().transform(v => v ? Number(v) : null),
  branchId: z.union([z.string(), z.number(), z.null()]).optional().transform(v => v ? Number(v) : null),
  amountUSD: z.coerce.number().min(0.01, "Monto inválido"),
  exchangeRate: z.coerce.number().min(0.0001, "Tasa inválida"),
  date: z.string().min(1, "Fecha requerida"),
  notes: z.string().optional(),
  incomeId: z.coerce.number().optional(),
});
