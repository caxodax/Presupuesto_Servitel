import { z } from "zod";

export const budgetSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  branchId: z.string().min(1, "Sucursal obligatoria"),
  initialDate: z.string().min(1, "Fecha inicial obligatoria"),
  endDate: z.string().min(1, "Fecha final obligatoria"),
  amountLimitUSD: z.coerce.number().min(0, "El límite presupuestario no puede ser negativo"),
});

export const allocationSchema = z.object({
  budgetId: z.string().min(1, "Contexto de presupuesto requerido"),
  categoryId: z.string().min(1, "Categoría destino requerida"),
  subcategoryId: z.string().optional().nullable(),
  amountUSD: z.coerce.number().min(0, "Monto asignado inválido"),
});

export const adjustmentSchema = z.object({
  allocationId: z.string().min(1, "Asignación objetivo requerida"),
  amountUSD: z.coerce.number().refine((val) => val !== 0, "El ajuste no puede ser cero"),
  reason: z.string().min(5, "Debes indicar la razón del ajuste"),
});
