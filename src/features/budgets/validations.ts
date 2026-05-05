import { z } from "zod";

const numericId = z.union([z.string(), z.number()]).transform(v => Number(v));

export const budgetSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  branchId: numericId,
  initialDate: z.string().min(1, "Fecha inicial obligatoria"),
  endDate: z.string().min(1, "Fecha final obligatoria"),
  amountLimitUSD: z.coerce.number().min(0, "El límite presupuestario no puede ser negativo"),
});

export const allocationSchema = z.object({
  budgetId: numericId,
  categoryId: numericId.optional().nullable(),
  subcategoryId: z.union([z.string(), z.number()]).optional().nullable().transform(v => v ? Number(v) : null),
  accountId: z.union([z.string(), z.number()]).optional().nullable().transform(v => v ? Number(v) : null),
  amountUSD: z.coerce.number().min(0, "Monto asignado inválido"),
}).refine(data => data.categoryId || data.accountId, {
  message: "Debes seleccionar una Categoría o una Cuenta Contable",
  path: ["accountId"]
});

export const adjustmentSchema = z.object({
  allocationId: numericId,
  amountUSD: z.coerce.number().refine((val) => val !== 0, "El ajuste no puede ser cero"),
  reason: z.string().min(5, "Debes indicar la razón del ajuste"),
});
