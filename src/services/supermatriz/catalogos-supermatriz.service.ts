import { createHash } from "node:crypto";

import {
  EstadoRegistro,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DatosAspecto,
  DatosCategoriaEstandar,
  DatosCicloPhva,
  DatosEstandar,
  DatosProceso,
} from "../../types/supermatriz.types";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

const incluirAspectoCompleto = {
  planAccionEspecifico: true,
  configuracion: true,
  configuracionVigencia: true,
  configuracionTareaCotidiana: true,
  configuracionEvidencia: true,
  configuracionRevision: true,
  palabrasClave: {
    include: {
      palabraClave: true,
    },
  },
  requisitosNormativos: {
    include: {
      requisitoNormativo: true,
    },
  },
  reglasAprobacion: true,
  estandar: {
    include: {
      categoriaEstandar: {
        include: {
          cicloPhva: true,
        },
      },
      gruposMinisteriales: {
        include: {
          grupoMinisterial: true,
        },
      },
    },
  },
} satisfies Prisma.AspectoInclude;

async function registrarCambio(
  tx: Prisma.TransactionClient,
  data: {
    versionSupermatrizId: number;
    tipoEntidad: string;
    entidadId: number;
    accion: string;
    descripcion: string;
    datosAntes?: unknown;
    datosDespues?: unknown;
    usuarioId: string;
  }
): Promise<void> {
  await tx.historialCambioSupermatriz.create({
    data: {
      versionSupermatrizId:
        data.versionSupermatrizId,
      tipoEntidad: data.tipoEntidad,
      entidadId: data.entidadId,
      accion: data.accion,
      descripcion: data.descripcion,
      datosAntes:
        data.datosAntes === undefined
          ? undefined
          : comoJsonPrisma(data.datosAntes),
      datosDespues:
        data.datosDespues === undefined
          ? undefined
          : comoJsonPrisma(data.datosDespues),
      usuarioId: data.usuarioId,
    },
  });
}

async function validarCicloDeVersion(
  tx: Prisma.TransactionClient,
  cicloPhvaId: number,
  versionSupermatrizId: number
): Promise<void> {
  const existe = await tx.cicloPhva.count({
    where: {
      id: cicloPhvaId,
      versionSupermatrizId,
    },
  });

  if (!existe) {
    throw new ErrorValidacionSupermatriz(
      "El ciclo PHVA no pertenece a la versión seleccionada."
    );
  }
}

async function validarCategoriaDeVersion(
  tx: Prisma.TransactionClient,
  categoriaEstandarId: number,
  versionSupermatrizId: number
): Promise<void> {
  const existe =
    await tx.categoriaEstandar.count({
      where: {
        id: categoriaEstandarId,
        versionSupermatrizId,
      },
    });

  if (!existe) {
    throw new ErrorValidacionSupermatriz(
      "La categoría del estándar no pertenece a la versión seleccionada."
    );
  }
}

async function validarEstandarDeVersion(
  tx: Prisma.TransactionClient,
  estandarId: number,
  versionSupermatrizId: number
): Promise<void> {
  const existe = await tx.estandar.count({
    where: {
      id: estandarId,
      versionSupermatrizId,
    },
  });

  if (!existe) {
    throw new ErrorValidacionSupermatriz(
      "El estándar no pertenece a la versión seleccionada."
    );
  }
}

type EntidadConCodigo =
  | "categoriaEstandar"
  | "estandar"
  | "proceso"
  | "aspecto";

async function validarCodigoUnico(
  tx: Prisma.TransactionClient,
  entidad: EntidadConCodigo,
  versionSupermatrizId: number,
  codigo: string | null,
  excluirId?: number
): Promise<void> {
  if (!codigo) return;

  const where = {
    versionSupermatrizId,
    codigo,
    ...(excluirId
      ? {
          id: {
            not: excluirId,
          },
        }
      : {}),
  };

  const cantidad =
    entidad === "categoriaEstandar"
      ? await tx.categoriaEstandar.count({ where })
      : entidad === "estandar"
        ? await tx.estandar.count({ where })
        : entidad === "proceso"
          ? await tx.proceso.count({ where })
          : await tx.aspecto.count({ where });

  if (cantidad > 0) {
    throw new ErrorValidacionSupermatriz(
      `El código ${codigo} ya existe dentro de la versión.`
    );
  }
}


function claveRequisitoNormativo(
  norma: string,
  articulo: string | null
): string {
  return createHash("sha256")
    .update(
      `${norma.trim().toLowerCase()}|${(articulo ?? "")
        .trim()
        .toLowerCase()}`
    )
    .digest("hex");
}


export const servicioCatalogosSupermatriz = {
  obtenerTodos: async (
    versionSupermatrizId?: number,
    incluirInactivos = false
  ) => {
    const filtroEstado = incluirInactivos
      ? {}
      : { estado: EstadoRegistro.ACTIVO };

    const filtroVersion = versionSupermatrizId
      ? { versionSupermatrizId }
      : {};

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
        where: {
          ...filtroVersion,
          ...filtroEstado,
        },
        orderBy: {
          orden: "asc",
        },
      }),
      prisma.categoriaEstandar.findMany({
        where: {
          ...filtroVersion,
          ...filtroEstado,
        },
        include: {
          cicloPhva: true,
        },
        orderBy: [
          {
            cicloPhva: {
              orden: "asc",
            },
          },
          {
            orden: "asc",
          },
        ],
      }),
      prisma.estandar.findMany({
        where: {
          ...filtroVersion,
          ...filtroEstado,
        },
        include: {
          categoriaEstandar: {
            include: {
              cicloPhva: true,
            },
          },
          gruposMinisteriales: {
            include: {
              grupoMinisterial: true,
            },
          },
          _count: {
            select: {
              aspectos: true,
            },
          },
        },
        orderBy: [
          {
            categoriaEstandar: {
              orden: "asc",
            },
          },
          {
            orden: "asc",
          },
        ],
      }),
      prisma.proceso.findMany({
        where: {
          ...filtroVersion,
          ...filtroEstado,
        },
        include: {
          _count: {
            select: {
              tareas: {
                where: {
                  estado: EstadoRegistro.ACTIVO,
                },
              },
            },
          },
        },
        orderBy: {
          nombre: "asc",
        },
      }),
      prisma.aspecto.findMany({
        where: {
          ...filtroVersion,
          ...filtroEstado,
        },
        include: incluirAspectoCompleto,
        orderBy: [
          {
            estandar: {
              orden: "asc",
            },
          },
          {
            orden: "asc",
          },
        ],
      }),
      prisma.categoriaGestion.findMany({
        where: filtroEstado,
        orderBy: {
          id: "asc",
        },
      }),
      prisma.grupoMinisterial.findMany({
        where: filtroEstado,
        orderBy: {
          id: "asc",
        },
      }),
      prisma.versionSupermatriz.findMany({
        include: {
          _count: {
            select: {
              tareas: true,
              cambios: true,
              ciclosPhva: true,
              estandares: true,
              aspectos: true,
              procesos: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
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
      tareas,
      aspectos,
      procesos,
    ] = await Promise.all([
      prisma.versionSupermatriz.count(),
      prisma.supermatrizTarea.count(),
      prisma.aspecto.count(),
      prisma.proceso.count(),
    ]);

    return {
      versiones,
      tareas,
      aspectos,
      procesos,
    };
  },

  crearCiclo: async (
    data: DatosCicloPhva,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );

      const registro =
        await tx.cicloPhva.create({
          data,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "CicloPhva",
        entidadId: registro.id,
        accion: "CREAR",
        descripcion: `Creación del ciclo PHVA ${registro.nombre}.`,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  actualizarCiclo: async (
    id: number,
    data: DatosCicloPhva,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );

      const anterior =
        await tx.cicloPhva.findUniqueOrThrow({
          where: {
            id,
          },
        });

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "El ciclo no pertenece a la versión seleccionada."
        );
      }

      const registro =
        await tx.cicloPhva.update({
          where: {
            id,
          },
          data,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "CicloPhva",
        entidadId: id,
        accion: "ACTUALIZAR",
        descripcion: `Actualización del ciclo PHVA ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  desactivarCiclo: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.cicloPhva.findUniqueOrThrow({
          where: {
            id,
          },
        });

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const categoriasActivas =
        await tx.categoriaEstandar.count({
          where: {
            cicloPhvaId: id,
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (categoriasActivas > 0) {
        throw new ErrorValidacionSupermatriz(
          "No puedes desactivar el ciclo mientras tenga categorías activas."
        );
      }

      const registro =
        await tx.cicloPhva.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          anterior.versionSupermatrizId,
        tipoEntidad: "CicloPhva",
        entidadId: id,
        accion: "DESACTIVAR",
        descripcion: `Desactivación del ciclo PHVA ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  crearCategoria: async (
    data: DatosCategoriaEstandar,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCicloDeVersion(
        tx,
        data.cicloPhvaId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "categoriaEstandar",
        data.versionSupermatrizId,
        data.codigo
      );

      const registro =
        await tx.categoriaEstandar.create({
          data,
          include: {
            cicloPhva: true,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad:
          "CategoriaEstandar",
        entidadId: registro.id,
        accion: "CREAR",
        descripcion: `Creación de la categoría ${registro.nombre}.`,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  actualizarCategoria: async (
    id: number,
    data: DatosCategoriaEstandar,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCicloDeVersion(
        tx,
        data.cicloPhvaId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "categoriaEstandar",
        data.versionSupermatrizId,
        data.codigo,
        id
      );

      const anterior =
        await tx.categoriaEstandar.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "La categoría no pertenece a la versión seleccionada."
        );
      }

      const registro =
        await tx.categoriaEstandar.update({
          where: {
            id,
          },
          data,
          include: {
            cicloPhva: true,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad:
          "CategoriaEstandar",
        entidadId: id,
        accion: "ACTUALIZAR",
        descripcion: `Actualización de la categoría ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  desactivarCategoria: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.categoriaEstandar.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const estandaresActivos =
        await tx.estandar.count({
          where: {
            categoriaEstandarId: id,
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (estandaresActivos > 0) {
        throw new ErrorValidacionSupermatriz(
          "No puedes desactivar la categoría mientras tenga estándares activos."
        );
      }

      const registro =
        await tx.categoriaEstandar.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          anterior.versionSupermatrizId,
        tipoEntidad:
          "CategoriaEstandar",
        entidadId: id,
        accion: "DESACTIVAR",
        descripcion: `Desactivación de la categoría ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  crearEstandar: async (
    data: DatosEstandar,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCategoriaDeVersion(
        tx,
        data.categoriaEstandarId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "estandar",
        data.versionSupermatrizId,
        data.codigo
      );

      const cantidadGrupos =
        await tx.grupoMinisterial.count({
          where: {
            id: {
              in: data.grupoMinisterialIds,
            },
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (
        cantidadGrupos !==
        data.grupoMinisterialIds.length
      ) {
        throw new ErrorValidacionSupermatriz(
          "Uno o varios grupos ministeriales no existen."
        );
      }

      const registro =
        await tx.estandar.create({
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            categoriaEstandarId:
              data.categoriaEstandarId,
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            orden: data.orden,
            calificacionMinisterialEsperada:
              data.calificacionMinisterialEsperada,
            estado: data.estado,
            gruposMinisteriales: {
              create:
                data.grupoMinisterialIds.map(
                  (grupoMinisterialId) => ({
                    grupoMinisterialId,
                  })
                ),
            },
          },
          include: {
            categoriaEstandar: {
              include: {
                cicloPhva: true,
              },
            },
            gruposMinisteriales: {
              include: {
                grupoMinisterial: true,
              },
            },
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Estandar",
        entidadId: registro.id,
        accion: "CREAR",
        descripcion: `Creación del estándar ${registro.nombre}.`,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  actualizarEstandar: async (
    id: number,
    data: DatosEstandar,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCategoriaDeVersion(
        tx,
        data.categoriaEstandarId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "estandar",
        data.versionSupermatrizId,
        data.codigo,
        id
      );

      const anterior =
        await tx.estandar.findUniqueOrThrow({
          where: {
            id,
          },
          include: {
            gruposMinisteriales: true,
          },
        });

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "El estándar no pertenece a la versión seleccionada."
        );
      }

      await tx.estandarGrupoMinisterial.deleteMany(
        {
          where: {
            estandarId: id,
          },
        }
      );

      const registro =
        await tx.estandar.update({
          where: {
            id,
          },
          data: {
            categoriaEstandarId:
              data.categoriaEstandarId,
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            orden: data.orden,
            calificacionMinisterialEsperada:
              data.calificacionMinisterialEsperada,
            estado: data.estado,
            gruposMinisteriales: {
              create:
                data.grupoMinisterialIds.map(
                  (grupoMinisterialId) => ({
                    grupoMinisterialId,
                  })
                ),
            },
          },
          include: {
            categoriaEstandar: {
              include: {
                cicloPhva: true,
              },
            },
            gruposMinisteriales: {
              include: {
                grupoMinisterial: true,
              },
            },
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Estandar",
        entidadId: id,
        accion: "ACTUALIZAR",
        descripcion: `Actualización del estándar ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  desactivarEstandar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.estandar.findUniqueOrThrow({
          where: {
            id,
          },
        });

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const aspectosActivos =
        await tx.aspecto.count({
          where: {
            estandarId: id,
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (aspectosActivos > 0) {
        throw new ErrorValidacionSupermatriz(
          "No puedes desactivar el estándar mientras tenga aspectos activos."
        );
      }

      const registro =
        await tx.estandar.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          anterior.versionSupermatrizId,
        tipoEntidad: "Estandar",
        entidadId: id,
        accion: "DESACTIVAR",
        descripcion: `Desactivación del estándar ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  crearProceso: async (
    data: DatosProceso,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "proceso",
        data.versionSupermatrizId,
        data.codigo
      );

      const registro =
        await tx.proceso.create({
          data,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Proceso",
        entidadId: registro.id,
        accion: "CREAR",
        descripcion: `Creación del proceso ${registro.nombre}.`,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  actualizarProceso: async (
    id: number,
    data: DatosProceso,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "proceso",
        data.versionSupermatrizId,
        data.codigo,
        id
      );

      const anterior =
        await tx.proceso.findUniqueOrThrow({
          where: {
            id,
          },
        });

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "El proceso no pertenece a la versión seleccionada."
        );
      }

      const registro =
        await tx.proceso.update({
          where: {
            id,
          },
          data,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Proceso",
        entidadId: id,
        accion: "ACTUALIZAR",
        descripcion: `Actualización del proceso ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  desactivarProceso: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.proceso.findUniqueOrThrow({
          where: {
            id,
          },
        });

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const filasActivas =
        await tx.supermatrizTarea.count({
          where: {
            procesoId: id,
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (filasActivas > 0) {
        throw new ErrorValidacionSupermatriz(
          "No puedes desactivar el proceso mientras tenga filas activas."
        );
      }

      const registro =
        await tx.proceso.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          anterior.versionSupermatrizId,
        tipoEntidad: "Proceso",
        entidadId: id,
        accion: "DESACTIVAR",
        descripcion: `Desactivación del proceso ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  crearAspecto: async (
    data: DatosAspecto,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarEstandarDeVersion(
        tx,
        data.estandarId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "aspecto",
        data.versionSupermatrizId,
        data.codigo
      );

      const registro =
        await tx.aspecto.create({
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            estandarId: data.estandarId,
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            orden: data.orden,
            estado: data.estado,
            planAccionEspecifico: {
              create: {
                descripcion:
                  data.planAccionEspecifico,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
            configuracion: {
              create: {
                ...data.configuracion,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
            configuracionVigencia: {
              create: {
                ...data.configuracionVigencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
            configuracionEvidencia: {
              create: {
                ...data.configuracionEvidencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
            configuracionRevision: {
              create: {
                ...data.configuracionRevision,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
            ...(data.configuracionTareaCotidiana
              ? {
                  configuracionTareaCotidiana:
                    {
                      create: {
                        ...data.configuracionTareaCotidiana,
                        estado:
                          EstadoRegistro.ACTIVO,
                      },
                    },
                }
              : {}),
          },
          include: incluirAspectoCompleto,
        });

      for (
        const nombre of data.palabrasClave
      ) {
        const palabra =
          await tx.palabraClave.upsert({
            where: {
              versionSupermatrizId_nombre: {
                versionSupermatrizId:
                  data.versionSupermatrizId,
                nombre,
              },
            },
            update: {},
            create: {
              versionSupermatrizId:
                data.versionSupermatrizId,
              nombre,
            },
          });

        await tx.aspectoPalabraClave.create({
          data: {
            aspectoId: registro.id,
            palabraClaveId:
              palabra.id,
          },
        });
      }

      for (
        const requisito of data.requisitosNormativos
      ) {
        const clave =
          claveRequisitoNormativo(
            requisito.norma,
            requisito.articulo
          );

        const registroRequisito =
          await tx.requisitoNormativo.upsert({
            where: {
              versionSupermatrizId_clave: {
                versionSupermatrizId:
                  data.versionSupermatrizId,
                clave,
              },
            },
            update: {
              norma: requisito.norma,
              articulo:
                requisito.articulo,
              descripcion:
                requisito.descripcion,
              estado:
                EstadoRegistro.ACTIVO,
            },
            create: {
              versionSupermatrizId:
                data.versionSupermatrizId,
              clave,
              norma: requisito.norma,
              articulo:
                requisito.articulo,
              descripcion:
                requisito.descripcion,
              estado:
                EstadoRegistro.ACTIVO,
            },
          });

        await tx.aspectoRequisitoNormativo.create(
          {
            data: {
              aspectoId: registro.id,
              requisitoNormativoId:
                registroRequisito.id,
            },
          }
        );
      }

      for (
        const regla of data.reglasAprobacion
      ) {
        await tx.reglaAprobacionGestion.create(
          {
            data: {
              aspectoId: registro.id,
              modalidad: regla.modalidad,
              tipoActividad:
                regla.tipoActividad,
              criterio: regla.criterio,
              requiereAprobacion:
                regla.requiereAprobacion,
              estado:
                EstadoRegistro.ACTIVO,
            },
          }
        );
      }

      const completo =
        await tx.aspecto.findUniqueOrThrow({
          where: {
            id: registro.id,
          },
          include: incluirAspectoCompleto,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Aspecto",
        entidadId: registro.id,
        accion: "CREAR",
        descripcion: `Creación del aspecto ${registro.nombre}.`,
        datosDespues: completo,
        usuarioId,
      });

      return completo;
    }),

  actualizarAspecto: async (
    id: number,
    data: DatosAspecto,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );
      await validarEstandarDeVersion(
        tx,
        data.estandarId,
        data.versionSupermatrizId
      );
      await validarCodigoUnico(
        tx,
        "aspecto",
        data.versionSupermatrizId,
        data.codigo,
        id
      );

      const anterior =
        await tx.aspecto.findUniqueOrThrow({
          where: {
            id,
          },
          include: incluirAspectoCompleto,
        });

      if (
        anterior.versionSupermatrizId !==
        data.versionSupermatrizId
      ) {
        throw new ErrorValidacionSupermatriz(
          "El aspecto no pertenece a la versión seleccionada."
        );
      }

      await tx.aspecto.update({
        where: {
          id,
        },
        data: {
          estandarId: data.estandarId,
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion,
          orden: data.orden,
          estado: data.estado,
          planAccionEspecifico: {
            upsert: {
              update: {
                descripcion:
                  data.planAccionEspecifico,
                estado:
                  EstadoRegistro.ACTIVO,
              },
              create: {
                descripcion:
                  data.planAccionEspecifico,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
          },
          configuracion: {
            upsert: {
              update: {
                ...data.configuracion,
                estado:
                  EstadoRegistro.ACTIVO,
              },
              create: {
                ...data.configuracion,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
          },
          configuracionVigencia: {
            upsert: {
              update: {
                ...data.configuracionVigencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
              create: {
                ...data.configuracionVigencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
          },
          configuracionEvidencia: {
            upsert: {
              update: {
                ...data.configuracionEvidencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
              create: {
                ...data.configuracionEvidencia,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
          },
          configuracionRevision: {
            upsert: {
              update: {
                ...data.configuracionRevision,
                estado:
                  EstadoRegistro.ACTIVO,
              },
              create: {
                ...data.configuracionRevision,
                estado:
                  EstadoRegistro.ACTIVO,
              },
            },
          },
        },
      });

      if (data.configuracionTareaCotidiana) {
        await tx.configuracionTareaCotidiana.upsert(
          {
            where: {
              aspectoId: id,
            },
            update: {
              ...data.configuracionTareaCotidiana,
              estado:
                EstadoRegistro.ACTIVO,
            },
            create: {
              aspectoId: id,
              ...data.configuracionTareaCotidiana,
              estado:
                EstadoRegistro.ACTIVO,
            },
          }
        );
      } else {
        await tx.configuracionTareaCotidiana.deleteMany(
          {
            where: {
              aspectoId: id,
            },
          }
        );
      }

      await tx.aspectoPalabraClave.deleteMany(
        {
          where: {
            aspectoId: id,
          },
        }
      );

      for (
        const nombre of data.palabrasClave
      ) {
        const palabra =
          await tx.palabraClave.upsert({
            where: {
              versionSupermatrizId_nombre: {
                versionSupermatrizId:
                  data.versionSupermatrizId,
                nombre,
              },
            },
            update: {},
            create: {
              versionSupermatrizId:
                data.versionSupermatrizId,
              nombre,
            },
          });

        await tx.aspectoPalabraClave.create({
          data: {
            aspectoId: id,
            palabraClaveId:
              palabra.id,
          },
        });
      }

      await tx.aspectoRequisitoNormativo.deleteMany(
        {
          where: {
            aspectoId: id,
          },
        }
      );

      for (
        const requisito of data.requisitosNormativos
      ) {
        const clave =
          claveRequisitoNormativo(
            requisito.norma,
            requisito.articulo
          );

        const registroRequisito =
          await tx.requisitoNormativo.upsert({
            where: {
              versionSupermatrizId_clave: {
                versionSupermatrizId:
                  data.versionSupermatrizId,
                clave,
              },
            },
            update: {
              norma: requisito.norma,
              articulo:
                requisito.articulo,
              descripcion:
                requisito.descripcion,
              estado:
                EstadoRegistro.ACTIVO,
            },
            create: {
              versionSupermatrizId:
                data.versionSupermatrizId,
              clave,
              norma: requisito.norma,
              articulo:
                requisito.articulo,
              descripcion:
                requisito.descripcion,
              estado:
                EstadoRegistro.ACTIVO,
            },
          });

        await tx.aspectoRequisitoNormativo.create(
          {
            data: {
              aspectoId: id,
              requisitoNormativoId:
                registroRequisito.id,
            },
          }
        );
      }

      await tx.reglaAprobacionGestion.deleteMany(
        {
          where: {
            aspectoId: id,
          },
        }
      );

      for (
        const regla of data.reglasAprobacion
      ) {
        await tx.reglaAprobacionGestion.create(
          {
            data: {
              aspectoId: id,
              modalidad: regla.modalidad,
              tipoActividad:
                regla.tipoActividad,
              criterio: regla.criterio,
              requiereAprobacion:
                regla.requiereAprobacion,
              estado:
                EstadoRegistro.ACTIVO,
            },
          }
        );
      }

      const registro =
        await tx.aspecto.findUniqueOrThrow({
          where: {
            id,
          },
          include: incluirAspectoCompleto,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        tipoEntidad: "Aspecto",
        entidadId: id,
        accion: "ACTUALIZAR",
        descripcion: `Actualización del aspecto ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),

  desactivarAspecto: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.aspecto.findUniqueOrThrow({
          where: {
            id,
          },
          include: incluirAspectoCompleto,
        });

      await asegurarVersionBorrador(
        tx,
        anterior.versionSupermatrizId
      );

      const filasActivas =
        await tx.supermatrizTarea.count({
          where: {
            aspectoId: id,
            estado:
              EstadoRegistro.ACTIVO,
          },
        });

      if (filasActivas > 0) {
        throw new ErrorValidacionSupermatriz(
          "No puedes desactivar el aspecto mientras tenga filas activas."
        );
      }

      const registro =
        await tx.aspecto.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoRegistro.INACTIVO,
          },
          include: incluirAspectoCompleto,
        });

      await registrarCambio(tx, {
        versionSupermatrizId:
          anterior.versionSupermatrizId,
        tipoEntidad: "Aspecto",
        entidadId: id,
        accion: "DESACTIVAR",
        descripcion: `Desactivación del aspecto ${registro.nombre}.`,
        datosAntes: anterior,
        datosDespues: registro,
        usuarioId,
      });

      return registro;
    }),
};
