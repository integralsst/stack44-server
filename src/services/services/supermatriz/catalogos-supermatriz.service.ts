import { EstadoRegistro } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export const servicioCatalogosSupermatriz = {
  obtenerTodos: async (incluirInactivos = false) => {
    const filtroEstado = incluirInactivos
      ? undefined
      : EstadoRegistro.ACTIVO;

    const [
      ciclosPhva,
      categoriasEstandar,
      estandares,
      procesos,
      aspectos,
      categoriasGestion,
      gruposMinisteriales,
      versiones,
    ] = await Promise.all([
      prisma.cicloPhva.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        orderBy: { orden: "asc" },
      }),
      prisma.categoriaEstandar.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        include: { cicloPhva: true },
        orderBy: [{ cicloPhvaId: "asc" }, { orden: "asc" }],
      }),
      prisma.estandar.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        include: {
          categoriaEstandar: {
            include: { cicloPhva: true },
          },
          gruposMinisteriales: {
            include: { grupoMinisterial: true },
          },
        },
        orderBy: [
          { categoriaEstandarId: "asc" },
          { orden: "asc" },
        ],
      }),
      prisma.proceso.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        orderBy: { nombre: "asc" },
      }),
      prisma.aspecto.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        include: {
          planAccionEspecifico: true,
          configuracion: true,
          configuracionVigencia: true,
          configuracionTareaCotidiana: true,
          configuracionEvidencia: true,
          configuracionRevision: true,
          estandar: {
            include: {
              categoriaEstandar: {
                include: { cicloPhva: true },
              },
            },
          },
        },
        orderBy: [{ estandarId: "asc" }, { orden: "asc" }],
      }),
      prisma.categoriaGestion.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        orderBy: { nombre: "asc" },
      }),
      prisma.grupoMinisterial.findMany({
        where: filtroEstado ? { estado: filtroEstado } : {},
        orderBy: { porcentajeEvaluable: "asc" },
      }),
      prisma.versionSupermatriz.findMany({
        orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { tareas: true },
          },
        },
      }),
    ]);

    return {
      ciclosPhva,
      categoriasEstandar,
      estandares,
      procesos,
      aspectos,
      categoriasGestion,
      gruposMinisteriales,
      versiones,
    };
  },

  obtenerResumen: async () => {
    const [
      versiones,
      tareasActivas,
      aspectosActivos,
      procesosActivos,
      estandaresActivos,
    ] = await Promise.all([
      prisma.versionSupermatriz.count(),
      prisma.supermatrizTarea.count({
        where: { estado: EstadoRegistro.ACTIVO },
      }),
      prisma.aspecto.count({
        where: { estado: EstadoRegistro.ACTIVO },
      }),
      prisma.proceso.count({
        where: { estado: EstadoRegistro.ACTIVO },
      }),
      prisma.estandar.count({
        where: { estado: EstadoRegistro.ACTIVO },
      }),
    ]);

    return {
      versiones,
      tareasActivas,
      aspectosActivos,
      procesosActivos,
      estandaresActivos,
    };
  },
};
