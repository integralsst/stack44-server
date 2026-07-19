import {
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  FiltrosHistorialSupermatriz,
} from "../../types/supermatriz.types";

function construirWhere(
  filtros: FiltrosHistorialSupermatriz
): Prisma.HistorialCambioSupermatrizWhereInput {
  const where: Prisma.HistorialCambioSupermatrizWhereInput =
    {};

  if (
    filtros.versionSupermatrizId
  ) {
    where.versionSupermatrizId =
      filtros.versionSupermatrizId;
  }

  if (filtros.tipoEntidad) {
    where.tipoEntidad =
      filtros.tipoEntidad;
  }

  if (filtros.accion) {
    where.accion =
      filtros.accion;
  }

  return where;
}

export const servicioHistorialSupermatriz = {
  obtenerTodos: async (
    filtros: FiltrosHistorialSupermatriz
  ) => {
    const where =
      construirWhere(filtros);

    const skip =
      (filtros.pagina - 1) *
      filtros.limite;

    const [items, total] =
      await Promise.all([
        prisma.historialCambioSupermatriz.findMany(
          {
            where,
            include: {
              versionSupermatriz: {
                select: {
                  id: true,
                  nombre: true,
                  estado: true,
                },
              },
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  correo: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: filtros.limite,
          }
        ),
        prisma.historialCambioSupermatriz.count(
          {
            where,
          }
        ),
      ]);

    return {
      items,
      paginacion: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total,
        totalPaginas: Math.max(
          1,
          Math.ceil(
            total / filtros.limite
          )
        ),
      },
    };
  },
};
