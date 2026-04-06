import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "El nombre de la empresa requiere mínimo 2 caracteres."),
  isActive: z.boolean().default(true)
});

export const branchSchema = z.object({
  name: z.string().min(2, "El nombre de sucursal requiere mínimo 2 caracteres."),
  companyId: z.string().min(1, "Tenant de Empresa obligatorio."),
  isActive: z.boolean().default(true)
});
