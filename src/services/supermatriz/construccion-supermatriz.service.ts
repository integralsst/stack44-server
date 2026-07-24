import { createHash } from "node:crypto";

import {
  EstadoRegistro,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DatosAspectoConstructor,
  DatosConstruccionFila,
  ReferenciaConstructor,
} from "../../types/construccion-supermatriz.types";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorConflictoSupermatriz,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";
import {
  incluirTareaSupermatriz,
} from "./supermatriz.selects";

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

interface IdsCreados {
  cicloPhvaId: number | null;
  categoriaEstandarId: number | null;
  estandarId: number | null;
  aspectoId: number | null;
  procesoId: number | null;
}

async function registrarCambio(
  tx: Prisma.TransactionClient,
  data: {
    versionSupermatrizId: number;
    tipoEntidad: string;
    entidadId: number;
    accion: string;
    descripcion: string;
    usuarioId: string;
    datosAntes?: unknown;
    datosDespues?: unknown;
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
      usuarioId: data.usuarioId,
      datosAntes:
        data.datosAntes === undefined
          ? undefined
          : comoJsonPrisma(
              data.datosAntes
            ),
      datosDespues:
        data.datosDespues === undefined
          ? undefined
          : comoJsonPrisma(
              data.datosDespues
            ),
    },
  });
}

function claveRequisitoNormativo(
  norma: string,
  articulo: string | null
): string {
  return createHash("sha256")
    .update(
      `${norma.trim().toLowerCase()}|${(
        articulo ?? ""
      )
        .trim()
        .toLowerCase()}`
    )
    .digest("hex");
}

async function validarCodigoUnico(
  tx: Prisma.TransactionClient,
  entidad:
    | "categoriaEstandar"
    | "estandar"
    | "aspecto"
    | "proceso",
  versionSupermatrizId: number,
  codigo: string | null
): Promise<void> {
  if (!codigo) return;

  const where = {
    versionSupermatrizId,
    codigo,
  };

  const cantidad =
    entidad === "categoriaEstandar"
      ? await tx.categoriaEstandar.count({
          where,
        })
      : entidad === "estandar"
        ? await tx.estandar.count({
            where,
          })
        : entidad === "aspecto"
          ? await tx.aspecto.count({
              where,
            })
          : await tx.proceso.count({
              where,
            });

  if (cantidad > 0) {
    throw new ErrorValidacionSupermatriz(
      `El código ${codigo} ya existe dentro de la versión.`
    );
  }
}

async function obtenerAspectoExistente(
  tx: Prisma.TransactionClient,
  id: number,
  versionSupermatrizId: number
) {
  const aspecto = await tx.aspecto.findFirst({
    where: {
      id,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    include: incluirAspectoCompleto,
  });

  if (
    !aspecto ||
    !aspecto.planAccionEspecifico ||
    aspecto.planAccionEspecifico.estado !==
      EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "El aspecto existente debe pertenecer a la versión, estar activo y tener un plan de acción activo."
    );
  }

  if (
    aspecto.estandar.estado !==
      EstadoRegistro.ACTIVO ||
    aspecto.estandar.categoriaEstandar
      .estado !== EstadoRegistro.ACTIVO ||
    aspecto.estandar.categoriaEstandar
      .cicloPhva.estado !==
      EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "El aspecto existente pertenece a una estructura PHVA inactiva."
    );
  }

  return aspecto;
}

async function obtenerEstandarExistente(
  tx: Prisma.TransactionClient,
  id: number,
  versionSupermatrizId: number
) {
  const estandar = await tx.estandar.findFirst({
    where: {
      id,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    include: {
      categoriaEstandar: {
        include: {
          cicloPhva: true,
        },
      },
      gruposMinisteriales: true,
    },
  });

  if (
    !estandar ||
    estandar.categoriaEstandar.estado !==
      EstadoRegistro.ACTIVO ||
    estandar.categoriaEstandar.cicloPhva
      .estado !== EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "El estándar existente debe pertenecer a la versión y tener activa toda su ruta PHVA."
    );
  }

  return estandar;
}

async function obtenerCategoriaExistente(
  tx: Prisma.TransactionClient,
  id: number,
  versionSupermatrizId: number
) {
  const categoria =
    await tx.categoriaEstandar.findFirst({
      where: {
        id,
        versionSupermatrizId,
        estado: EstadoRegistro.ACTIVO,
      },
      include: {
        cicloPhva: true,
      },
    });

  if (
    !categoria ||
    categoria.cicloPhva.estado !==
      EstadoRegistro.ACTIVO
  ) {
    throw new ErrorValidacionSupermatriz(
      "La categoría existente debe pertenecer a la versión y tener un ciclo PHVA activo."
    );
  }

  return categoria;
}

async function obtenerCicloExistente(
  tx: Prisma.TransactionClient,
  id: number,
  versionSupermatrizId: number
) {
  const ciclo = await tx.cicloPhva.findFirst({
    where: {
      id,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
  });

  if (!ciclo) {
    throw new ErrorValidacionSupermatriz(
      "El ciclo PHVA existente no pertenece a la versión o está inactivo."
    );
  }

  return ciclo;
}

async function obtenerProcesoExistente(
  tx: Prisma.TransactionClient,
  id: number,
  versionSupermatrizId: number
) {
  const proceso = await tx.proceso.findFirst({
    where: {
      id,
      versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
  });

  if (!proceso) {
    throw new ErrorValidacionSupermatriz(
      "El proceso existente no pertenece a la versión o está inactivo."
    );
  }

  return proceso;
}

async function crearAspecto(
  tx: Prisma.TransactionClient,
  versionSupermatrizId: number,
  estandarId: number,
  data: DatosAspectoConstructor,
  usuarioId: string
) {
  await validarCodigoUnico(
    tx,
    "aspecto",
    versionSupermatrizId,
    data.codigo
  );

  const registro = await tx.aspecto.create({
    data: {
      versionSupermatrizId,
      estandarId,
      codigo: data.codigo,
      nombre: data.nombre,
      descripcion: data.descripcion,
      orden: data.orden,
      estado: data.estado,
      planAccionEspecifico: {
        create: {
          descripcion:
            data.planAccionEspecifico,
          estado: EstadoRegistro.ACTIVO,
        },
      },
      configuracion: {
        create: {
          ...data.configuracion,
          estado: EstadoRegistro.ACTIVO,
        },
      },
      configuracionVigencia: {
        create: {
          ...data.configuracionVigencia,
          estado: EstadoRegistro.ACTIVO,
        },
      },
      configuracionEvidencia: {
        create: {
          ...data.configuracionEvidencia,
          estado: EstadoRegistro.ACTIVO,
        },
      },
      configuracionRevision: {
        create: {
          ...data.configuracionRevision,
          estado: EstadoRegistro.ACTIVO,
        },
      },
      ...(data.configuracionTareaCotidiana
        ? {
            configuracionTareaCotidiana: {
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

  for (const nombre of data.palabrasClave) {
    const palabra = await tx.palabraClave.upsert({
      where: {
        versionSupermatrizId_nombre: {
          versionSupermatrizId,
          nombre,
        },
      },
      update: {},
      create: {
        versionSupermatrizId,
        nombre,
      },
    });

    await tx.aspectoPalabraClave.create({
      data: {
        aspectoId: registro.id,
        palabraClaveId: palabra.id,
      },
    });
  }

  for (
    const requisito of data.requisitosNormativos
  ) {
    const clave = claveRequisitoNormativo(
      requisito.norma,
      requisito.articulo
    );

    const registroRequisito =
      await tx.requisitoNormativo.upsert({
        where: {
          versionSupermatrizId_clave: {
            versionSupermatrizId,
            clave,
          },
        },
        update: {
          norma: requisito.norma,
          articulo: requisito.articulo,
          descripcion: requisito.descripcion,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          versionSupermatrizId,
          clave,
          norma: requisito.norma,
          articulo: requisito.articulo,
          descripcion: requisito.descripcion,
          estado: EstadoRegistro.ACTIVO,
        },
      });

    await tx.aspectoRequisitoNormativo.create({
      data: {
        aspectoId: registro.id,
        requisitoNormativoId:
          registroRequisito.id,
      },
    });
  }

  for (const regla of data.reglasAprobacion) {
    await tx.reglaAprobacionGestion.create({
      data: {
        aspectoId: registro.id,
        modalidad: regla.modalidad,
        tipoActividad: regla.tipoActividad,
        criterio: regla.criterio,
        requiereAprobacion:
          regla.requiereAprobacion,
        estado: EstadoRegistro.ACTIVO,
      },
    });
  }

  const completo =
    await tx.aspecto.findUniqueOrThrow({
      where: {
        id: registro.id,
      },
      include: incluirAspectoCompleto,
    });

  await registrarCambio(tx, {
    versionSupermatrizId,
    tipoEntidad: "Aspecto",
    entidadId: completo.id,
    accion: "CREAR",
    descripcion: `Creación del aspecto ${completo.nombre} desde el constructor inverso.`,
    datosDespues: completo,
    usuarioId,
  });

  return completo;
}

async function validarCategoriasGestion(
  tx: Prisma.TransactionClient,
  ids: number[]
): Promise<void> {
  if (ids.length === 0) {
    throw new ErrorValidacionSupermatriz(
      "La fila debe tener al menos una categoría de gestión."
    );
  }

  const unicos = [...new Set(ids)];

  if (unicos.length !== ids.length) {
    throw new ErrorValidacionSupermatriz(
      "Las categorías de gestión no pueden repetirse."
    );
  }

  const cantidad = await tx.categoriaGestion.count({
    where: {
      id: {
        in: ids,
      },
      estado: EstadoRegistro.ACTIVO,
    },
  });

  if (cantidad !== ids.length) {
    throw new ErrorValidacionSupermatriz(
      "Una o varias categorías de gestión no existen o están inactivas."
    );
  }
}

async function validarCodigoFila(
  tx: Prisma.TransactionClient,
  versionSupermatrizId: number,
  codigo: string | null,
  excluirId?: number
): Promise<void> {
  if (!codigo) return;

  const cantidad = await tx.supermatrizTarea.count({
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

async function validarRelacionFila(
  tx: Prisma.TransactionClient,
  versionSupermatrizId: number,
  aspectoId: number,
  procesoId: number,
  excluirId?: number
): Promise<void> {
  const existente =
    await tx.supermatrizTarea.findFirst({
      where: {
        versionSupermatrizId,
        aspectoId,
        procesoId,
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
      : "Ya existe una fila que relaciona este aspecto con este proceso dentro de la versión seleccionada.",
    "FILA_RELACION_DUPLICADA",
    {
      tareaId: existente.id,
      codigo: existente.codigo,
      estado: existente.estado,
    }
  );
}

function exigirReferencia<TData>(
  value:
    | ReferenciaConstructor<TData>
    | undefined,
  label: string
): ReferenciaConstructor<TData> {
  if (!value) {
    throw new ErrorValidacionSupermatriz(
      `${label} es obligatorio para completar la ruta nueva.`
    );
  }

  return value;
}

export const servicioConstruccionSupermatriz = {
  guardar: async (
    data: DatosConstruccionFila,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        data.versionSupermatrizId
      );

      const creados: IdsCreados = {
        cicloPhvaId: null,
        categoriaEstandarId: null,
        estandarId: null,
        aspectoId: null,
        procesoId: null,
      };

      let aspectoId: number;

      if (data.aspecto.modo === "EXISTENTE") {
        const aspecto =
          await obtenerAspectoExistente(
            tx,
            data.aspecto.id,
            data.versionSupermatrizId
          );
        aspectoId = aspecto.id;
      } else {
        const referenciaEstandar =
          exigirReferencia(
            data.estandar,
            "El estándar"
          );

        let estandarId: number;

        if (
          referenciaEstandar.modo ===
          "EXISTENTE"
        ) {
          const estandar =
            await obtenerEstandarExistente(
              tx,
              referenciaEstandar.id,
              data.versionSupermatrizId
            );
          estandarId = estandar.id;
        } else {
          const referenciaCategoria =
            exigirReferencia(
              data.categoria,
              "La categoría"
            );

          let categoriaEstandarId: number;

          if (
            referenciaCategoria.modo ===
            "EXISTENTE"
          ) {
            const categoria =
              await obtenerCategoriaExistente(
                tx,
                referenciaCategoria.id,
                data.versionSupermatrizId
              );
            categoriaEstandarId =
              categoria.id;
          } else {
            const referenciaCiclo =
              exigirReferencia(
                data.ciclo,
                "El ciclo PHVA"
              );

            let cicloPhvaId: number;

            if (
              referenciaCiclo.modo ===
              "EXISTENTE"
            ) {
              const ciclo =
                await obtenerCicloExistente(
                  tx,
                  referenciaCiclo.id,
                  data.versionSupermatrizId
                );
              cicloPhvaId = ciclo.id;
            } else {
              const ciclo =
                await tx.cicloPhva.create({
                  data: {
                    versionSupermatrizId:
                      data.versionSupermatrizId,
                    ...referenciaCiclo.datos,
                  },
                });

              creados.cicloPhvaId = ciclo.id;
              cicloPhvaId = ciclo.id;

              await registrarCambio(tx, {
                versionSupermatrizId:
                  data.versionSupermatrizId,
                tipoEntidad: "CicloPhva",
                entidadId: ciclo.id,
                accion: "CREAR",
                descripcion: `Creación del ciclo PHVA ${ciclo.nombre} desde el constructor inverso.`,
                datosDespues: ciclo,
                usuarioId,
              });
            }

            await validarCodigoUnico(
              tx,
              "categoriaEstandar",
              data.versionSupermatrizId,
              referenciaCategoria.datos.codigo
            );

            const categoria =
              await tx.categoriaEstandar.create({
                data: {
                  versionSupermatrizId:
                    data.versionSupermatrizId,
                  cicloPhvaId,
                  ...referenciaCategoria.datos,
                },
                include: {
                  cicloPhva: true,
                },
              });

            creados.categoriaEstandarId =
              categoria.id;
            categoriaEstandarId = categoria.id;

            await registrarCambio(tx, {
              versionSupermatrizId:
                data.versionSupermatrizId,
              tipoEntidad:
                "CategoriaEstandar",
              entidadId: categoria.id,
              accion: "CREAR",
              descripcion: `Creación de la categoría ${categoria.nombre} desde el constructor inverso.`,
              datosDespues: categoria,
              usuarioId,
            });
          }

          const grupos =
            referenciaEstandar.datos
              .grupoMinisterialIds;
          const cantidadGrupos =
            await tx.grupoMinisterial.count({
              where: {
                id: {
                  in: grupos,
                },
                estado: EstadoRegistro.ACTIVO,
              },
            });

          if (
            cantidadGrupos !== grupos.length
          ) {
            throw new ErrorValidacionSupermatriz(
              "Uno o varios grupos ministeriales no existen o están inactivos."
            );
          }

          await validarCodigoUnico(
            tx,
            "estandar",
            data.versionSupermatrizId,
            referenciaEstandar.datos.codigo
          );

          const estandar = await tx.estandar.create({
            data: {
              versionSupermatrizId:
                data.versionSupermatrizId,
              categoriaEstandarId,
              codigo:
                referenciaEstandar.datos.codigo,
              nombre:
                referenciaEstandar.datos.nombre,
              descripcion:
                referenciaEstandar.datos
                  .descripcion,
              orden:
                referenciaEstandar.datos.orden,
              calificacionMinisterialEsperada:
                referenciaEstandar.datos
                  .calificacionMinisterialEsperada,
              estado:
                referenciaEstandar.datos.estado,
              gruposMinisteriales: {
                create: grupos.map(
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

          creados.estandarId = estandar.id;
          estandarId = estandar.id;

          await registrarCambio(tx, {
            versionSupermatrizId:
              data.versionSupermatrizId,
            tipoEntidad: "Estandar",
            entidadId: estandar.id,
            accion: "CREAR",
            descripcion: `Creación del estándar ${estandar.nombre} desde el constructor inverso.`,
            datosDespues: estandar,
            usuarioId,
          });
        }

        const aspecto = await crearAspecto(
          tx,
          data.versionSupermatrizId,
          estandarId,
          data.aspecto.datos,
          usuarioId
        );

        creados.aspectoId = aspecto.id;
        aspectoId = aspecto.id;
      }

      let procesoId: number;

      if (data.proceso.modo === "EXISTENTE") {
        const proceso =
          await obtenerProcesoExistente(
            tx,
            data.proceso.id,
            data.versionSupermatrizId
          );
        procesoId = proceso.id;
      } else {
        await validarCodigoUnico(
          tx,
          "proceso",
          data.versionSupermatrizId,
          data.proceso.datos.codigo
        );

        const proceso = await tx.proceso.create({
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            ...data.proceso.datos,
          },
        });

        creados.procesoId = proceso.id;
        procesoId = proceso.id;

        await registrarCambio(tx, {
          versionSupermatrizId:
            data.versionSupermatrizId,
          tipoEntidad: "Proceso",
          entidadId: proceso.id,
          accion: "CREAR",
          descripcion: `Creación del proceso ${proceso.nombre} desde el constructor inverso.`,
          datosDespues: proceso,
          usuarioId,
        });
      }

      await validarCategoriasGestion(
        tx,
        data.fila.categoriaGestionIds
      );
      await validarCodigoFila(
        tx,
        data.versionSupermatrizId,
        data.fila.codigo,
        data.tareaId ?? undefined
      );
      await validarRelacionFila(
        tx,
        data.versionSupermatrizId,
        aspectoId,
        procesoId,
        data.tareaId ?? undefined
      );

      const datosFila = {
        aspectoId,
        procesoId,
        codigo: data.fila.codigo,
        orden: data.fila.orden,
        ejecucion: data.fila.ejecucion,
        fundamentosSoportes:
          data.fila.fundamentosSoportes,
        responsableActividad:
          data.fila.responsableActividad,
        metasEstandar:
          data.fila.metasEstandar,
        recursosAdministrativos:
          data.fila.recursosAdministrativos,
        estado: data.fila.estado,
      };

      let tarea;
      let operacion: "CREAR" | "ACTUALIZAR";

      if (data.tareaId) {
        const anterior =
          await tx.supermatrizTarea.findUniqueOrThrow(
            {
              where: {
                id: data.tareaId,
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
            "No se puede mover una fila a otra versión."
          );
        }

        await tx.supermatrizTareaCategoriaGestion.deleteMany(
          {
            where: {
              supermatrizTareaId:
                data.tareaId,
            },
          }
        );

        tarea = await tx.supermatrizTarea.update({
          where: {
            id: data.tareaId,
          },
          data: {
            ...datosFila,
            categoriasGestion: {
              create:
                data.fila.categoriaGestionIds.map(
                  (categoriaGestionId) => ({
                    categoriaGestionId,
                  })
                ),
            },
          },
          include: incluirTareaSupermatriz,
        });

        operacion = "ACTUALIZAR";

        await registrarCambio(tx, {
          versionSupermatrizId:
            data.versionSupermatrizId,
          tipoEntidad: "SupermatrizTarea",
          entidadId: tarea.id,
          accion: "ACTUALIZAR",
          descripcion: `Actualización de la fila ${
            tarea.codigo ?? tarea.id
          } mediante el constructor inverso.`,
          datosAntes: anterior,
          datosDespues: tarea,
          usuarioId,
        });
      } else {
        tarea = await tx.supermatrizTarea.create({
          data: {
            versionSupermatrizId:
              data.versionSupermatrizId,
            ...datosFila,
            categoriasGestion: {
              create:
                data.fila.categoriaGestionIds.map(
                  (categoriaGestionId) => ({
                    categoriaGestionId,
                  })
                ),
            },
          },
          include: incluirTareaSupermatriz,
        });

        operacion = "CREAR";

        await registrarCambio(tx, {
          versionSupermatrizId:
            data.versionSupermatrizId,
          tipoEntidad: "SupermatrizTarea",
          entidadId: tarea.id,
          accion: "CREAR",
          descripcion: `Creación de la fila ${
            tarea.codigo ?? tarea.id
          } mediante el constructor inverso.`,
          datosDespues: tarea,
          usuarioId,
        });
      }

      return {
        operacion,
        tarea,
        creados,
      };
    }),
};
