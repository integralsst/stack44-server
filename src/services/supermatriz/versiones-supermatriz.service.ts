import {
  EstadoVersionSupermatriz,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  DatosClonarVersion,
  DatosVersionSupermatriz,
} from "../../types/supermatriz.types";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

const incluirVersionDetalle = {
  clonadaDe: {
    select: {
      id: true,
      nombre: true,
    },
  },
  _count: {
    select: {
      tareas: true,
      cambios: true,
      ciclosPhva: true,
      categoriasEstandar: true,
      estandares: true,
      aspectos: true,
      procesos: true,
      palabrasClave: true,
      requisitosNormativos: true,
    },
  },
} satisfies Prisma.VersionSupermatrizInclude;

export const servicioVersionesSupermatriz = {
  obtenerTodas: () =>
    prisma.versionSupermatriz.findMany({
      include: incluirVersionDetalle,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    }),

  obtenerPorId: (id: number) =>
    prisma.versionSupermatriz.findUnique({
      where: {
        id,
      },
      include: {
        ...incluirVersionDetalle,
        cambios: {
          include: {
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
          take: 100,
        },
      },
    }),

  crear: async (
    data: DatosVersionSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const version =
        await tx.versionSupermatriz.create({
          data: {
            ...data,
            estado:
              EstadoVersionSupermatriz.BORRADOR,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId:
            version.id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: version.id,
          accion: "CREAR",
          descripcion: `Creación de la versión borrador ${version.nombre}.`,
          datosDespues:
            comoJsonPrisma(version),
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
      await asegurarVersionBorrador(
        tx,
        id
      );

      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      const actualizada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data,
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "ACTUALIZAR",
          descripcion: `Actualización de los datos de la versión ${actualizada.nombre}.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(actualizada),
          usuarioId,
        },
      });

      return actualizada;
    }),

  publicar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        id
      );

      const tareasActivas =
        await tx.supermatrizTarea.findMany({
          where: {
            versionSupermatrizId: id,
            estado: "ACTIVO",
          },
          include: {
            categoriasGestion: true,
            proceso: true,
            aspecto: {
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
            },
          },
        });

      if (tareasActivas.length === 0) {
        throw new ErrorValidacionSupermatriz(
          "No se puede publicar una versión sin filas activas."
        );
      }

      const filaInconsistente =
        tareasActivas.find(
          (tarea) =>
            tarea.proceso.estado !== "ACTIVO" ||
            tarea.aspecto.estado !== "ACTIVO" ||
            tarea.aspecto.planAccionEspecifico?.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.categoriaEstandar.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.categoriaEstandar.cicloPhva.estado !==
              "ACTIVO" ||
            tarea.categoriasGestion.length === 0
        );

      if (filaInconsistente) {
        throw new ErrorValidacionSupermatriz(
          `La fila ${
            filaInconsistente.codigo ??
            filaInconsistente.id
          } tiene relaciones inactivas o incompletas.`
        );
      }

      const estandaresSinGrupo =
        await tx.estandar.count({
          where: {
            versionSupermatrizId: id,
            estado: "ACTIVO",
            gruposMinisteriales: {
              none: {},
            },
          },
        });

      if (estandaresSinGrupo > 0) {
        throw new ErrorValidacionSupermatriz(
          "Todos los estándares activos deben estar clasificados en al menos un grupo de 7, 21 o 60 estándares."
        );
      }

      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      await tx.versionSupermatriz.updateMany({
        where: {
          estado:
            EstadoVersionSupermatriz.VIGENTE,
          id: {
            not: id,
          },
        },
        data: {
          estado:
            EstadoVersionSupermatriz.CERRADA,
        },
      });

      const publicada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoVersionSupermatriz.VIGENTE,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "PUBLICAR",
          descripcion: `La versión ${publicada.nombre} fue publicada como vigente.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(publicada),
          usuarioId,
        },
      });

      return publicada;
    }),

  cerrar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      if (
        anterior.estado ===
        EstadoVersionSupermatriz.CERRADA
      ) {
        return anterior;
      }

      const cerrada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoVersionSupermatriz.CERRADA,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "CERRAR",
          descripcion: `La versión ${cerrada.nombre} fue cerrada.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(cerrada),
          usuarioId,
        },
      });

      return cerrada;
    }),

  clonar: async (
    id: number,
    data: DatosClonarVersion,
    usuarioId: string
  ) =>
    prisma.$transaction(
      async (tx) => {
        const origen =
          await tx.versionSupermatriz.findUniqueOrThrow(
            {
              where: {
                id,
              },
              include: {
                ciclosPhva: {
                  orderBy: {
                    orden: "asc",
                  },
                },
                categoriasEstandar: {
                  orderBy: {
                    orden: "asc",
                  },
                },
                estandares: {
                  include: {
                    gruposMinisteriales:
                      true,
                  },
                  orderBy: {
                    orden: "asc",
                  },
                },
                aspectos: {
                  include: {
                    planAccionEspecifico:
                      true,
                    configuracion: true,
                    configuracionVigencia:
                      true,
                    configuracionTareaCotidiana:
                      true,
                    configuracionEvidencia:
                      true,
                    configuracionRevision:
                      true,
                    palabrasClave: {
                      include: {
                        palabraClave: true,
                      },
                    },
                    requisitosNormativos: {
                      include: {
                        requisitoNormativo:
                          true,
                      },
                    },
                    reglasAprobacion: true,
                    vigencias: true,
                  },
                  orderBy: {
                    orden: "asc",
                  },
                },
                procesos: true,
                palabrasClave: true,
                requisitosNormativos: true,
                tareas: {
                  include: {
                    categoriasGestion:
                      true,
                  },
                  orderBy: {
                    orden: "asc",
                  },
                },
              },
            }
          );

        const nueva =
          await tx.versionSupermatriz.create({
            data: {
              clonadaDeId: origen.id,
              nombre: data.nombre,
              descripcion:
                data.descripcion ??
                `Clon de ${origen.nombre}.`,
              estado:
                EstadoVersionSupermatriz.BORRADOR,
              vigenteDesde:
                data.vigenteDesde,
              vigenteHasta:
                data.vigenteHasta,
            },
          });

        const ciclos = new Map<
          number,
          number
        >();
        const categorias = new Map<
          number,
          number
        >();
        const estandares = new Map<
          number,
          number
        >();
        const aspectos = new Map<
          number,
          number
        >();
        const procesos = new Map<
          number,
          number
        >();
        const palabrasClave = new Map<
          number,
          number
        >();
        const requisitosNormativos = new Map<
          number,
          number
        >();

        for (
          const ciclo of origen.ciclosPhva
        ) {
          const creado =
            await tx.cicloPhva.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                codigo: ciclo.codigo,
                nombre: ciclo.nombre,
                orden: ciclo.orden,
                porcentajeEsperado:
                  ciclo.porcentajeEsperado,
                estado: ciclo.estado,
              },
            });

          ciclos.set(
            ciclo.id,
            creado.id
          );
        }

        for (
          const categoria of origen.categoriasEstandar
        ) {
          const cicloPhvaId =
            ciclos.get(
              categoria.cicloPhvaId
            );

          if (!cicloPhvaId) {
            throw new Error(
              "No fue posible clonar la categoría: ciclo PHVA faltante."
            );
          }

          const creada =
            await tx.categoriaEstandar.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                cicloPhvaId,
                codigo: categoria.codigo,
                nombre: categoria.nombre,
                descripcion:
                  categoria.descripcion,
                orden: categoria.orden,
                porcentajeEsperado:
                  categoria.porcentajeEsperado,
                estado: categoria.estado,
              },
            });

          categorias.set(
            categoria.id,
            creada.id
          );
        }

        for (
          const estandar of origen.estandares
        ) {
          const categoriaEstandarId =
            categorias.get(
              estandar.categoriaEstandarId
            );

          if (!categoriaEstandarId) {
            throw new Error(
              "No fue posible clonar el estándar: categoría faltante."
            );
          }

          const creado =
            await tx.estandar.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                categoriaEstandarId,
                codigo: estandar.codigo,
                nombre: estandar.nombre,
                descripcion:
                  estandar.descripcion,
                orden: estandar.orden,
                calificacionMinisterialEsperada:
                  estandar.calificacionMinisterialEsperada,
                estado: estandar.estado,
                gruposMinisteriales: {
                  create:
                    estandar.gruposMinisteriales.map(
                      (grupo) => ({
                        grupoMinisterialId:
                          grupo.grupoMinisterialId,
                      })
                    ),
                },
              },
            });

          estandares.set(
            estandar.id,
            creado.id
          );
        }

        for (
          const palabra of origen.palabrasClave
        ) {
          const creada =
            await tx.palabraClave.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                nombre: palabra.nombre,
              },
            });

          palabrasClave.set(
            palabra.id,
            creada.id
          );
        }

        for (
          const requisito of origen.requisitosNormativos
        ) {
          const creado =
            await tx.requisitoNormativo.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                clave: requisito.clave,
                norma: requisito.norma,
                articulo:
                  requisito.articulo,
                descripcion:
                  requisito.descripcion,
                estado: requisito.estado,
              },
            });

          requisitosNormativos.set(
            requisito.id,
            creado.id
          );
        }

        for (
          const aspecto of origen.aspectos
        ) {
          const estandarId =
            estandares.get(
              aspecto.estandarId
            );

          if (!estandarId) {
            throw new Error(
              "No fue posible clonar el aspecto: estándar faltante."
            );
          }

          const creado =
            await tx.aspecto.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                estandarId,
                codigo: aspecto.codigo,
                nombre: aspecto.nombre,
                descripcion:
                  aspecto.descripcion,
                orden: aspecto.orden,
                estado: aspecto.estado,
                ...(aspecto.planAccionEspecifico
                  ? {
                      planAccionEspecifico:
                        {
                          create: {
                            descripcion:
                              aspecto
                                .planAccionEspecifico
                                .descripcion,
                            estado:
                              aspecto
                                .planAccionEspecifico
                                .estado,
                          },
                        },
                    }
                  : {}),
                ...(aspecto.configuracion
                  ? {
                      configuracion: {
                        create: {
                          esEvergreen:
                            aspecto
                              .configuracion
                              .esEvergreen,
                          bloqueEvergreen:
                            aspecto
                              .configuracion
                              .bloqueEvergreen,
                          documentoActualizacionPeriodica:
                            aspecto
                              .configuracion
                              .documentoActualizacionPeriodica,
                          tareaEjecucionCotidiana:
                            aspecto
                              .configuracion
                              .tareaEjecucionCotidiana,
                          incluirInformeEstadoTareas:
                            aspecto
                              .configuracion
                              .incluirInformeEstadoTareas,
                          permiteNoAplica:
                            aspecto
                              .configuracion
                              .permiteNoAplica,
                          estado:
                            aspecto
                              .configuracion
                              .estado,
                        },
                      },
                    }
                  : {}),
                ...(aspecto.configuracionVigencia
                  ? {
                      configuracionVigencia:
                        {
                          create: {
                            tipoFechaBase:
                              aspecto
                                .configuracionVigencia
                                .tipoFechaBase,
                            fuentePeriodicidad:
                              aspecto
                                .configuracionVigencia
                                .fuentePeriodicidad,
                            cantidad:
                              aspecto
                                .configuracionVigencia
                                .cantidad,
                            unidad:
                              aspecto
                                .configuracionVigencia
                                .unidad,
                            diasAlertaPrevia:
                              aspecto
                                .configuracionVigencia
                                .diasAlertaPrevia,
                            permiteFechaManual:
                              aspecto
                                .configuracionVigencia
                                .permiteFechaManual,
                            mesFechaFija:
                              aspecto
                                .configuracionVigencia
                                .mesFechaFija,
                            diaFechaFija:
                              aspecto
                                .configuracionVigencia
                                .diaFechaFija,
                            descripcionRegla:
                              aspecto
                                .configuracionVigencia
                                .descripcionRegla,
                            estado:
                              aspecto
                                .configuracionVigencia
                                .estado,
                          },
                        },
                    }
                  : {}),
                ...(aspecto.configuracionTareaCotidiana
                  ? {
                      configuracionTareaCotidiana:
                        {
                          create: {
                            cantidadObjetivo:
                              aspecto
                                .configuracionTareaCotidiana
                                .cantidadObjetivo,
                            unidad:
                              aspecto
                                .configuracionTareaCotidiana
                                .unidad,
                            descripcion:
                              aspecto
                                .configuracionTareaCotidiana
                                .descripcion,
                            estado:
                              aspecto
                                .configuracionTareaCotidiana
                                .estado,
                          },
                        },
                    }
                  : {}),
                ...(aspecto.configuracionEvidencia
                  ? {
                      configuracionEvidencia:
                        {
                          create: {
                            requiereEvidencia:
                              aspecto
                                .configuracionEvidencia
                                .requiereEvidencia,
                            descripcionEvidencia:
                              aspecto
                                .configuracionEvidencia
                                .descripcionEvidencia,
                            visibleClienteDefault:
                              aspecto
                                .configuracionEvidencia
                                .visibleClienteDefault,
                            estado:
                              aspecto
                                .configuracionEvidencia
                                .estado,
                          },
                        },
                    }
                  : {}),
                ...(aspecto.configuracionRevision
                  ? {
                      configuracionRevision:
                        {
                          create: {
                            requiereRevisionTecnica:
                              aspecto
                                .configuracionRevision
                                .requiereRevisionTecnica,
                            observaciones:
                              aspecto
                                .configuracionRevision
                                .observaciones,
                            estado:
                              aspecto
                                .configuracionRevision
                                .estado,
                          },
                        },
                    }
                  : {}),
                palabrasClave: {
                  create:
                    aspecto.palabrasClave.map(
                      (item) => {
                        const palabraClaveId =
                          palabrasClave.get(
                            item.palabraClaveId
                          );

                        if (!palabraClaveId) {
                          throw new Error(
                            "No fue posible clonar una palabra clave."
                          );
                        }

                        return {
                          palabraClaveId,
                        };
                      }
                    ),
                },
                requisitosNormativos: {
                  create:
                    aspecto.requisitosNormativos.map(
                      (item) => {
                        const requisitoNormativoId =
                          requisitosNormativos.get(
                            item.requisitoNormativoId
                          );

                        if (!requisitoNormativoId) {
                          throw new Error(
                            "No fue posible clonar un requisito normativo."
                          );
                        }

                        return {
                          requisitoNormativoId,
                        };
                      }
                    ),
                },
                reglasAprobacion: {
                  create:
                    aspecto.reglasAprobacion.map(
                      (regla) => ({
                        modalidad:
                          regla.modalidad,
                        tipoActividad:
                          regla.tipoActividad,
                        criterio:
                          regla.criterio,
                        requiereAprobacion:
                          regla.requiereAprobacion,
                        vigenteDesde:
                          regla.vigenteDesde,
                        vigenteHasta:
                          regla.vigenteHasta,
                        estado:
                          regla.estado,
                      })
                    ),
                },
                vigencias: {
                  create:
                    aspecto.vigencias.map(
                      (vigencia) => ({
                        vigenteDesde:
                          vigencia.vigenteDesde,
                        vigenteHasta:
                          vigencia.vigenteHasta,
                        motivoDesactivacion:
                          vigencia.motivoDesactivacion,
                        estado:
                          vigencia.estado,
                      })
                    ),
                },
              },
            });

          aspectos.set(
            aspecto.id,
            creado.id
          );
        }

        for (
          const proceso of origen.procesos
        ) {
          const creado =
            await tx.proceso.create({
              data: {
                versionSupermatrizId:
                  nueva.id,
                codigo: proceso.codigo,
                nombre: proceso.nombre,
                descripcion:
                  proceso.descripcion,
                estado: proceso.estado,
              },
            });

          procesos.set(
            proceso.id,
            creado.id
          );
        }

        for (
          const tarea of origen.tareas
        ) {
          const aspectoId =
            aspectos.get(
              tarea.aspectoId
            );
          const procesoId =
            procesos.get(
              tarea.procesoId
            );

          if (
            !aspectoId ||
            !procesoId
          ) {
            throw new Error(
              "No fue posible clonar una fila: relaciones faltantes."
            );
          }

          await tx.supermatrizTarea.create({
            data: {
              versionSupermatrizId:
                nueva.id,
              aspectoId,
              procesoId,
              codigo: tarea.codigo,
              orden: tarea.orden,
              ejecucion:
                tarea.ejecucion,
              fundamentosSoportes:
                tarea.fundamentosSoportes,
              responsableActividad:
                tarea.responsableActividad,
              metasEstandar:
                tarea.metasEstandar,
              recursosAdministrativos:
                tarea.recursosAdministrativos,
              estado: tarea.estado,
              categoriasGestion: {
                create:
                  tarea.categoriasGestion.map(
                    (categoria) => ({
                      categoriaGestionId:
                        categoria.categoriaGestionId,
                    })
                  ),
              },
            },
          });
        }

        await tx.historialCambioSupermatriz.create({
          data: {
            versionSupermatrizId:
              nueva.id,
            tipoEntidad:
              "VersionSupermatriz",
            entidadId: nueva.id,
            accion: "CLONAR",
            descripcion: `La versión ${nueva.nombre} fue clonada desde ${origen.nombre}.`,
            datosDespues:
              comoJsonPrisma({
                versionOrigenId:
                  origen.id,
                versionNuevaId:
                  nueva.id,
              }),
            usuarioId,
          },
        });

        return tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id: nueva.id,
            },
            include:
              incluirVersionDetalle,
          }
        );
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      }
    ),
};
