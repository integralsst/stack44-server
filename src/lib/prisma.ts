import { PrismaClient } from "@prisma/client";

/*
 * Stack44 trabaja contra una base MySQL remota.
 * Las transacciones interactivas de Prisma tienen tiempos muy cortos
 * por defecto; en una conexión remota pueden cerrarse antes de terminar.
 *
 * Estas opciones se aplican a TODAS las transacciones del backend:
 * - maxWait: tiempo máximo para obtener una transacción.
 * - timeout: tiempo máximo para terminarla antes de revertirla.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    transactionOptions: {
      maxWait: 15_000,
      timeout: 45_000,
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
