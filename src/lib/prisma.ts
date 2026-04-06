import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// En desarrollo, reusamos el cliente global de Prisma para prevenir el límite de conexiones por culpa del Fast Refresh de Next.js
if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
