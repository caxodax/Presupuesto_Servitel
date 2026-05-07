import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  type: z.enum(["EXPENSE", "INCOME"]),
  companyId: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : null)
});

export const subcategorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  categoryId: z.union([z.string(), z.number()]).transform(v => Number(v))
});
