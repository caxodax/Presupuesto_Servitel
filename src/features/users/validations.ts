import { z } from "zod";

const numericId = z.union([z.string(), z.number()]).optional().nullable().transform(v => (v === "" || v === null || v === undefined) ? null : Number(v));

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATOR', 'AUDITOR', 'VIEWER'], { errorMap: () => ({ message: "Rol inválido" }) }),
  companyId: numericId,
  branchId: numericId,
}).refine((data) => {
  if (data.role !== "SUPER_ADMIN" && !data.companyId) {
    return false;
  }
  if (data.role === "OPERATOR" && !data.branchId) {
    return false;
  }
  return true;
}, {
  message: "Los usuarios deben pertenecer a una Empresa, y los Operadores obligatoriamente a una Sucursal.",
  path: ["companyId"],
});
