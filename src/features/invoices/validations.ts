import { z } from "zod";

export const invoiceSchema = z.object({
  number: z.string().min(1, "El número de factura es obligatorio"),
  supplierName: z.string().min(2, "Proveedor requerido"),
  allocationId: z.string().min(1, "Debes seleccionar una asignación"),
  amountUSD: z.coerce.number().min(0.01, "Monto inválido"),
  exchangeRate: z.coerce.number().min(0.0001, "Tasa inválida"),
  date: z.string().min(1, "Fecha requerida"),
});
