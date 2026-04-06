import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  companyId: z.string().min(1, "Tenant requerido obligatoriamente para aislar la data")
});

export const subcategorySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres requeridos"),
  categoryId: z.string().min(1, "Categoría padre requerida")
});
