import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "El nombre de la empresa requiere mínimo 2 caracteres."),
  isActive: z.boolean().default(true)
});

export const branchSchema = z.object({
  name: z.string().min(2, "El nombre de sucursal requiere mínimo 2 caracteres."),
  companyId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  isActive: z.boolean().default(true)
});
