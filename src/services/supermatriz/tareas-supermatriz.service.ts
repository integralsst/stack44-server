import {
  EstadoRegistro,
  EstadoVersionSupermatriz,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DatosTareaSupermatriz,
  FiltrosTareasSupermatriz,
} from "../../types/supermatriz.types";
import {
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";
import { incluirTareaSupermatriz } from "./supermatriz.selects";

async function validarRelaciones(
  tx: Prisma.TransactionClient,
  data: DatosTareaSupermatriz
): Promise<void> {
  const [version, aspecto, proceso, categorias] = await Promise.all([
    tx.versionSupermatriz.findUnique({
      where: { id: data.versionSupermatrizId },
    }),
    tx.aspecto.findFirst({
      where: {
        id: data.aspectoId,
        estado: EstadoRegistro.ACTIVO,
      },
      include: { planAccionEspecifico: true },
    }),
    tx.proceso.findFirst({
      where: {
        id: data.procesoId,
        estado: EstadoRegistro.ACTIVO,
      },
    }),
    tx.categoriaGestion.count({
      where: {
        id: { in: data.categoriaGestionIds },
        estado: EstadoRegistro.ACTIVO,
      },
    }),
  ]);

  if (!version) {
    throw new ErrorValidacionSupermatriz(
      "La versión seleccionada no existe."
    );
  }

  if (version.estado === EstadoVersionSupermatriz.CERRADA) {
    throw new ErrorValidacionSupermatriz(
      "No se pueden modificar filas de una versión cerrada."
    );
  }

  if (!aspecto || !aspecto.planAccionEspecifico) {
    throw new ErrorValidacionSupermatriz(
      "El aspecto debe existir, estar activo y tener un plan de acción específico."
    );
  }

  if (!proceso) {
    throw new ErrorValidacionSupermatriz(
      "El proceso seleccionado no existe o está inactivo."
    );
  }

  if (categorias !== data.categoriaGestionIds.length) {
    throw new ErrorValidacionSupermatriz(
      "Una o varias categorías de gestión no existen o están inactivas."
    );
  }
}

function construirWhere(
  filtros: FiltrosTareasSupermatriz
): Prisma.SupermatrizTareaWhereInput {
  const where: Prisma.SupermatrizTareaWhereInput = {
    estado: filtros.estado ?? EstadoRegistro.ACTIVO,
  };

  if (filtros.versionSupermatrizId) {
    where.versionSupermatrizId = filtros.versionSupermatrizId;
  }

  if (filtros.procesoId) {
    where.procesoId = filtros.procesoId;
  }

  if (filtros.categoriaGestionId) {
    where.categoriasGestion = {
      some: { categoriaGestionId: filtros.categoriaGestionId },
    };
  }

  const filtroAspecto: Prisma.AspectoWhereInput = {};

  if (filtros.estandarId) {
    filtroAspecto.estandarId = filtros.estandarId;
  }

  if (
    filtros.categoriaEstandarId ||
    filtros.cicloPhvaId ||
    filtros.grupoMinisterialId
  ) {
    filtroAspecto.estandar = {
      ...(filtros.categoriaEstandarId
        ? { categoriaEstandarId: filtros.categoriaEstandarId }
        : {}),
      ...(filtros.cicloPhvaId
        ? {
            categoriaEstandar: {
              cicloPhvaId: filtros.cicloPhvaId,
            },
          }
        : {}),
      ...(filtros.grupoMinisterialId
        ? {
            gruposMinisteriales: {
              some: {
                grupoMinisterialId: filtros.grupoMinisterialId,
              },
            },
          }
        : {}),
    };
  }

  if (Object.keys(filtroAspecto).length > 0) {
    where.aspecto = filtroAspecto;
  }

  if (filtros.busqueda) {
    where.OR = [
      { codigo: { contains: filtros.busqueda } },
      { proceso: { nombre: { contains: filtros.busqueda } } },
      { aspecto: { nombre: { contains: filtros.busqueda } } },
      {
        aspecto: {
          planAccionEspecifico: {
            is: {
              descripcion: { contains: filtros.busqueda },
            },
          },
        },
      },
      {
        aspecto: {
          estandar: { nombre: { contains: filtros.busqueda } },
        },
      },
    ];
  }

  return where;
}

export const servicioTareasSupermatriz = {
  obtenerTodas: async (filtros: FiltrosTareasSupermatriz) => {
    const where = construirWhere(filtros);
    const skip = (filtros.pagina - 1) * filtros.limite;

    const [items, total] = await Promise.all([
      prisma.supermatrizTarea.findMany({
        where,
        include: incluirTareaSupermatriz,
        orderBy: [
          { versionSupermatrizId: "desc" },
          { orden: "asc" },
          { id: "asc" },
        ],
        skip,
        take: filtros.limite,
      }),
      prisma.supermatrizTarea.count({ where }),
    ]);

    return {
      items,
      paginacion: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / filtros.limite)),
      },
    };
  },

  obtenerPorId: (id: number) =>
    prisma.supermatrizTarea.findUnique({
      where: { id },
      include: incluirTareaSupermatriz,
    }),

  crear: async (data: DatosTareaSupermatriz, usuarioId: string) =>
    prisma.$transaction(async (tx) => {
      await validarRelaciones(tx, data);

      const tarea = await tx.supermatrizTarea.create({
        data: {
          versionSupermatrizId: data.versionSupermatrizId,
          aspectoId: data.aspectoId,
          procesoId: data.procesoId,
          codigo: data.codigo,
          orden: data.orden,
          ejecucion: data.ejecucion,
          fundamentosSoportes: data.fundamentosSoportes,
          responsableActividad: data.responsableActividad,
          metasEstandar: data.metasEstandar,
          recursosAdministrativos: data.recursosAdministrativos,
          estado: data.estado,
          categoriasGestion: {
            create: data.categoriaGestionIds.map(
              (categoriaGestionId) => ({ categoriaGestionId })
            ),
          },
        },
        include: incluirTareaSupermatriz,
      });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: data.versionSupermatrizId,
          tipoEntidad: "SupermatrizTarea",
          entidadId: tarea.id,
          accion: "CREAR",
          descripcion: `Creación de la fila ${tarea.codigo ?? tarea.id}.`,
          datosDespues: comoJsonPrisma(tarea),
          usuarioId,
        },
      });

      return tarea;
    }),

  actualizar: async (
    id: number,
    data: DatosTareaSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior = await tx.supermatrizTarea.findUniqueOrThrow({
        where: { id },
        include: incluirTareaSupermatriz,
      });

      await validarRelaciones(tx, data);

      await tx.supermatrizTareaCategoriaGestion.deleteMany({
        where: { supermatrizTareaId: id },
      });

      await tx.supermatrizTarea.update({
        where: { id },
        data: {
          versionSupermatrizId: data.versionSupermatrizId,
          aspectoId: data.aspectoId,
          procesoId: data.procesoId,
          codigo: data.codigo,
          orden: data.orden,
          ejecucion: data.ejecucion,
          fundamentosSoportes: data.fundamentosSoportes,
          responsableActividad: data.responsableActividad,
          metasEstandar: data.metasEstandar,
          recursosAdministrativos: data.recursosAdministrativos,
          estado: data.estado,
          categoriasGestion: {
            create: data.categoriaGestionIds.map(
              (categoriaGestionId) => ({ categoriaGestionId })
            ),
          },
        },
      });

      const actualizada = await tx.supermatrizTarea.findUniqueOrThrow({
        where: { id },
        include: incluirTareaSupermatriz,
      });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: data.versionSupermatrizId,
          tipoEntidad: "SupermatrizTarea",
          entidadId: id,
          accion: "ACTUALIZAR",
          descripcion: `Actualización de la fila ${
            actualizada.codigo ?? actualizada.id
          }.`,
          datosAntes: comoJsonPrisma(anterior),
          datosDespues: comoJsonPrisma(actualizada),
          usuarioId,
        },
      });

      return actualizada;
    }),

  desactivar: async (id: number, usuarioId: string) =>
    prisma.$transaction(async (tx) => {
      const anterior = await tx.supermatrizTarea.findUniqueOrThrow({
        where: { id },
        include: incluirTareaSupermatriz,
      });

      const actualizada = await tx.supermatrizTarea.update({
        where: { id },
        data: { estado: EstadoRegistro.INACTIVO },
        include: incluirTareaSupermatriz,
      });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: actualizada.versionSupermatrizId,
          tipoEntidad: "SupermatrizTarea",
          entidadId: id,
          accion: "DESACTIVAR",
          descripcion: `Desactivación de la fila ${
            actualizada.codigo ?? actualizada.id
          }.`,
          datosAntes: comoJsonPrisma(anterior),
          datosDespues: comoJsonPrisma(actualizada),
          usuarioId,
        },
      });

      return actualizada;
    }),
};
