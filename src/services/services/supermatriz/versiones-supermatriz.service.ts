import { EstadoVersionSupermatriz } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DatosVersionSupermatriz } from "../../types/supermatriz.types";
import { comoJsonPrisma } from "../../utils/supermatriz";

export const servicioVersionesSupermatriz = {
  obtenerTodas: () =>
    prisma.versionSupermatriz.findMany({
      include: {
        _count: {
          select: { tareas: true, cambios: true },
        },
      },
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    }),

  obtenerPorId: (id: number) =>
    prisma.versionSupermatriz.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tareas: true, cambios: true },
        },
        cambios: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    }),

  crear: async (
    data: DatosVersionSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      if (data.estado === EstadoVersionSupermatriz.VIGENTE) {
        await tx.versionSupermatriz.updateMany({
          where: { estado: EstadoVersionSupermatriz.VIGENTE },
          data: { estado: EstadoVersionSupermatriz.CERRADA },
        });
      }

      const version = await tx.versionSupermatriz.create({
        data,
      });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: version.id,
          tipoEntidad: "VersionSupermatriz",
          entidadId: version.id,
          accion: "CREAR",
          descripcion: `Creación de la versión ${version.nombre}.`,
          datosDespues: comoJsonPrisma(version),
          usuarioId,
        },
      });

      return version;
    }),

  actualizar: async (
    id: number,
    data: DatosVersionSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior = await tx.versionSupermatriz.findUniqueOrThrow({
        where: { id },
      });

      if (data.estado === EstadoVersionSupermatriz.VIGENTE) {
        await tx.versionSupermatriz.updateMany({
          where: {
            estado: EstadoVersionSupermatriz.VIGENTE,
            id: { not: id },
          },
          data: { estado: EstadoVersionSupermatriz.CERRADA },
        });
      }

      const actualizada = await tx.versionSupermatriz.update({
        where: { id },
        data,
      });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad: "VersionSupermatriz",
          entidadId: id,
          accion: "ACTUALIZAR",
          descripcion: `Actualización de la versión ${actualizada.nombre}.`,
          datosAntes: comoJsonPrisma(anterior),
          datosDespues: comoJsonPrisma(actualizada),
          usuarioId,
        },
      });

      return actualizada;
    }),
};
