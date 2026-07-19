import {
  EstadoRegistro,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DatosTareaSupermatriz,
  FiltrosTareasSupermatriz,
} from "../../types/supermatriz.types";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorConflictoSupermatriz,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";
import { incluirTareaSupermatriz } from "./supermatriz.selects";

async function validarRelaciones(
  tx: Prisma.TransactionClient,
  data: DatosTareaSupermatriz
): Promise<void> {
  await asegurarVersionBorrador(
    tx,
    data.versionSupermatrizId
  );

  if (data.categoriaGestionIds.length === 0) {
    throw new ErrorValidacionSupermatriz(
      "La fila debe tener al menos una categoría de gestión."
    );
  }

  const [aspecto, proceso, categorias] =
    await Promise.all([
      tx.aspecto.findFirst({
        where: {
          id: data.aspectoId,
          versionSupermatrizId:
            data.versionSupermatrizId,
          estado:
            EstadoRegistro.ACTIVO,
        },
        include: {
          planAccionEspecifico: true,
          estandar: {
            include: {
              categoriaEstandar: {
                include: {
                  cicloPhva: true,
                },
              },
            },
          },
        },
      }),
      tx.proceso.findFirst({
        where: {
          id: data.procesoId,
          versionSupermatrizId:
            data.versionSupermatrizId,
          estado:
            EstadoRegistro.ACTIVO,
        },
      }),
      tx.categoriaGestion.count({
        where: {
          id: {
            in: data.categoriaGestionIds,
          },
          estado:
            EstadoRegistro.ACTIVO,
        },
      }),
    ]);

  if (
    !aspecto ||
    !aspecto.planAccionEspecifico ||
    aspecto.planAccionEspecifico.estado !==
      EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "El aspecto debe pertenecer a la versión, estar activo y tener un plan de acción activo."
    );
  }

  if (
    aspecto.estandar.estado !==
      EstadoRegistro.ACTIVO ||
    aspecto.estandar.categoriaEstandar.estado !==
      EstadoRegistro.ACTIVO ||
    aspecto.estandar.categoriaEstandar.cicloPhva.estado !==
      EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "El aspecto pertenece a una estructura PHVA inactiva."
    );
  }

  if (!proceso) {
    throw new ErrorValidacionSupermatriz(
      "El proceso debe pertenecer a la versión y estar activo."
    );
  }

  if (
    categorias !==
    data.categoriaGestionIds.length
  ) {
    throw new ErrorValidacionSupermatriz(
      "Una o varias categorías de gestión no existen o están inactivas."
    );
  }
}

async function validarCodigoTareaUnico(
  tx: Prisma.TransactionClient,
  versionSupermatrizId: number,
  codigo: string | null,
  excluirId?: number
): Promise<void> {
  if (!codigo) return;

  const cantidad =
    await tx.supermatrizTarea.count({
      where: {
        versionSupermatrizId,
        codigo,
        ...(excluirId
          ? {
              id: {
                not: excluirId,
              },
            }
          : {}),
      },
    });

  if (cantidad > 0) {
    throw new ErrorValidacionSupermatriz(
      `El código ${codigo} ya existe en la versión seleccionada.`
    );
  }
}

async function validarRelacionTareaUnica(
  tx: Prisma.TransactionClient,
  data: DatosTareaSupermatriz,
  excluirId?: number
): Promise<void> {
  const existente =
    await tx.supermatrizTarea.findFirst({
      where: {
        versionSupermatrizId:
          data.versionSupermatrizId,
        aspectoId: data.aspectoId,
        procesoId: data.procesoId,
        ...(excluirId
          ? {
              id: {
                not: excluirId,
              },
            }
          : {}),
      },
      select: {
        id: true,
        codigo: true,
        estado: true,
      },
    });

  if (!existente) return;

  throw new ErrorConflictoSupermatriz(
    existente.estado === EstadoRegistro.INACTIVO
      ? "Ya existe una fila inactiva que relaciona este aspecto con este proceso. Reactívala o edítala en lugar de crear una nueva."
      : "Ya existe una fila que relaciona este aspecto con este proceso dentro de la versión seleccionada. Abre la fila existente y edítala en lugar de crear otra.",
    "FILA_RELACION_DUPLICADA",
    {
      tareaId: existente.id,
      codigo: existente.codigo,
      estado: existente.estado,
    }
  );
}


function construirWhere(
  filtros: FiltrosTareasSupermatriz
): Prisma.SupermatrizTareaWhereInput {
  const where: Prisma.SupermatrizTareaWhereInput =
    {
      estado:
        filtros.estado ??
        EstadoRegistro.ACTIVO,
    };

  if (
    filtros.versionSupermatrizId
  ) {
    where.versionSupermatrizId =
      filtros.versionSupermatrizId;
  }

  if (filtros.procesoId) {
    where.procesoId =
      filtros.procesoId;
  }

  if (
    filtros.categoriaGestionId
  ) {
    where.categoriasGestion = {
      some: {
        categoriaGestionId:
          filtros.categoriaGestionId,
      },
    };
  }

  const filtroAspecto: Prisma.AspectoWhereInput =
    {};

  if (filtros.estandarId) {
    filtroAspecto.estandarId =
      filtros.estandarId;
  }

  if (
    filtros.categoriaEstandarId ||
    filtros.cicloPhvaId ||
    filtros.grupoMinisterialId
  ) {
    filtroAspecto.estandar = {
      ...(filtros.categoriaEstandarId
        ? {
            categoriaEstandarId:
              filtros.categoriaEstandarId,
          }
        : {}),
      ...(filtros.cicloPhvaId
        ? {
            categoriaEstandar: {
              cicloPhvaId:
                filtros.cicloPhvaId,
            },
          }
        : {}),
      ...(filtros.grupoMinisterialId
        ? {
            gruposMinisteriales: {
              some: {
                grupoMinisterialId:
                  filtros.grupoMinisterialId,
              },
            },
          }
        : {}),
    };
  }

  if (
    Object.keys(filtroAspecto)
      .length > 0
  ) {
    where.aspecto =
      filtroAspecto;
  }

  if (filtros.busqueda) {
    where.OR = [
      {
        codigo: {
          contains:
            filtros.busqueda,
        },
      },
      {
        proceso: {
          nombre: {
            contains:
              filtros.busqueda,
          },
        },
      },
      {
        aspecto: {
          nombre: {
            contains:
              filtros.busqueda,
          },
        },
      },
      {
        aspecto: {
          planAccionEspecifico: {
            is: {
              descripcion: {
                contains:
                  filtros.busqueda,
              },
            },
          },
        },
      },
      {
        aspecto: {
          estandar: {
            nombre: {
              contains:
                filtros.busqueda,
            },
          },
        },
      },
    ];
  }

  return where;
}

export const servicioTareasSupermatriz = {
  obtenerTodas: async (
    filtros: FiltrosTareasSupermatriz
  ) => {
    const where =
      construirWhere(filtros);
    const skip =
      (filtros.pagina - 1) *
      filtros.limite;

    const [items, total] =
      await Promise.all([
        prisma.supermatrizTarea.findMany(
          {
            where,
            include:
              incluirTareaSupermatriz,
            orderBy: [
              {
                versionSupermatrizId:
                  "desc",
              },
              {
                orden: "asc",
              },
              {
                id: "asc",
              },
            ],
            skip,
            take: filtros.limite,
          }
        ),
        prisma.supermatrizTarea.count({
          where,
        }),
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

  obtenerPorId: (id: number) =>
    prisma.supermatrizTarea.findUnique({
      where: {
        id,
      },
      include:
        incluirTareaSupermatriz,
    }),

  crear: async (
    data: DatosTareaSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await validarRelaciones(
        tx,
        data
      );
      await validarCodigoTareaUnico(
        tx,
        data.versionSupermatrizId,
        data.codigo
      );
      await validarRelacionTareaUnica(
        tx,
        data
      );

      const tarea =
        await tx.supermatrizTarea.create({
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            aspectoId: data.aspectoId,
            procesoId: data.procesoId,
            codigo: data.codigo,
            orden: data.orden,
            ejecucion: data.ejecucion,
            fundamentosSoportes:
              data.fundamentosSoportes,
            responsableActividad:
              data.responsableActividad,
            metasEstandar:
              data.metasEstandar,
            recursosAdministrativos:
              data.recursosAdministrativos,
            estado: data.estado,
            categoriasGestion: {
              create:
                data.categoriaGestionIds.map(
                  (
                    categoriaGestionId
                  ) => ({
                    categoriaGestionId,
                  })
                ),
            },
          },
          include:
            incluirTareaSupermatriz,
        });

      await tx.historialCambioSupermatriz.create(
        {
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            tipoEntidad:
              "SupermatrizTarea",
            entidadId: tarea.id,
            accion: "CREAR",
            descripcion: `Creación de la fila ${
              tarea.codigo ??
              tarea.id
            }.`,
            datosDespues:
              comoJsonPrisma(tarea),
            usuarioId,
          },
        }
      );

      return tarea;
    }),

  actualizar: async (
    id: number,
    data: DatosTareaSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.supermatrizTarea.findUniqueOrThrow(
          {
            where: {
              id,
            },
            include:
              incluirTareaSupermatriz,
          }
        );

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "No se puede mover una fila a otra versión. Clona o crea una fila nueva."
        );
      }

      await validarRelaciones(
        tx,
        data
      );
      await validarCodigoTareaUnico(
        tx,
        data.versionSupermatrizId,
        data.codigo,
        id
      );
      await validarRelacionTareaUnica(
        tx,
        data,
        id
      );

      await tx.supermatrizTareaCategoriaGestion.deleteMany(
        {
          where: {
            supermatrizTareaId: id,
          },
        }
      );

      await tx.supermatrizTarea.update({
        where: {
          id,
        },
        data: {
          aspectoId: data.aspectoId,
          procesoId: data.procesoId,
          codigo: data.codigo,
          orden: data.orden,
          ejecucion: data.ejecucion,
          fundamentosSoportes:
            data.fundamentosSoportes,
          responsableActividad:
            data.responsableActividad,
          metasEstandar:
            data.metasEstandar,
          recursosAdministrativos:
            data.recursosAdministrativos,
          estado: data.estado,
          categoriasGestion: {
            create:
              data.categoriaGestionIds.map(
                (
                  categoriaGestionId
                ) => ({
                  categoriaGestionId,
                })
              ),
          },
        },
      });

      const actualizada =
        await tx.supermatrizTarea.findUniqueOrThrow(
          {
            where: {
              id,
            },
            include:
              incluirTareaSupermatriz,
          }
        );

      await tx.historialCambioSupermatriz.create(
        {
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            tipoEntidad:
              "SupermatrizTarea",
            entidadId: id,
            accion: "ACTUALIZAR",
            descripcion: `Actualización de la fila ${
              actualizada.codigo ??
              actualizada.id
            }.`,
            datosAntes:
              comoJsonPrisma(anterior),
            datosDespues:
              comoJsonPrisma(
                actualizada
              ),
            usuarioId,
          },
        }
      );

      return actualizada;
    }),

  desactivar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.supermatrizTarea.findUniqueOrThrow(
          {
            where: {
              id,
            },
            include:
              incluirTareaSupermatriz,
          }
        );

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const actualizada =
        await tx.supermatrizTarea.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
          include:
            incluirTareaSupermatriz,
        });

      await tx.historialCambioSupermatriz.create(
        {
          data: {
            versionSupermatrizId:
              actualizada.versionSupermatrizId,
            tipoEntidad:
              "SupermatrizTarea",
            entidadId: id,
            accion: "DESACTIVAR",
            descripcion: `Desactivación de la fila ${
              actualizada.codigo ??
              actualizada.id
            }.`,
            datosAntes:
              comoJsonPrisma(anterior),
            datosDespues:
              comoJsonPrisma(
                actualizada
              ),
            usuarioId,
          },
        }
      );

      return actualizada;
    }),
};
