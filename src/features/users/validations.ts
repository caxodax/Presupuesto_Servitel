import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: "Rol inválido" }) }),
  companyId: z.string().optional().nullable().transform(v => v === "" ? null : v),
  branchId: z.string().optional().nullable().transform(v => v === "" ? null : v),
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
