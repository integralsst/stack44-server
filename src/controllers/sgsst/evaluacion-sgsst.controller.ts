import {
  Request,
  Response,
} from "express";
import {
  EstadoAplicabilidad,
  EstadoCumplimiento,
  EstadoEvaluacion,
  Prisma,
  RolUsuario,
  TipoEvaluador,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  calcularEvaluacion,
} from "../../services/calificacion-sgsst.service";
import {
  filtroEmpresasPorUsuario,
  puedeAccederEmpresa,
  puedeGestionarEmpresaSgsst,
  resolverTipoEvaluador,
} from "../../utils/sgsst-access";
import { esRolInterno } from "../../utils/access";

class ErrorValidacion extends Error {}

function texto(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function textoOpcional(
  value: unknown
): string | null {
  const resultado = texto(value);
  return resultado || null;
}

function fechaOpcional(
  value: unknown
): Date | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const resultado = new Date(
    String(value)
  );

  if (
    Number.isNaN(resultado.getTime())
  ) {
    throw new ErrorValidacion(
      "La fecha no es válida."
    );
  }

  return resultado;
}

function enumValido<T extends string>(
  enumeracion: Record<string, T>,
  value: unknown
): value is T {
  return Object.values(enumeracion).includes(
    value as T
  );
}

const incluirResumenEvaluacion = {
  empresa: {
    select: {
      id: true,
      nit: true,
      nombre: true,
    },
  },
  configuracionSgsstEmpresa: {
    include: {
      marco: true,
      perfilAplicabilidad: true,
    },
  },
  creadoPorUsuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
  _count: {
    select: {
      itemsEvaluacion: true,
      calificacionesEstandares: true,
    },
  },
} satisfies Prisma.EvaluacionInclude;

const incluirItemMatriz = {
  profesionalResponsable: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,
    },
  },
  respuestas: {
    include: {
      respondidoPorUsuario: {
        select: {
          id: true,
          nombre: true,
          correo: true,
        },
      },
    },
  },
  requisito: {
    include: {
      proceso: true,
      frecuenciaActualizacion: true,
      bloqueDocumental: true,
      estandar: {
        include: {
          categoria: {
            include: {
              cicloPhva: true,
            },
          },
        },
      },
      areasGestion: {
        include: {
          areaGestion: true,
        },
      },
      rolesResponsables: {
        include: {
          rolResponsable: true,
        },
      },
      evidenciasRequeridas: {
        orderBy: {
          ordenVisualizacion: "asc",
        },
      },
      recursos: {
        orderBy: {
          ordenVisualizacion: "asc",
        },
      },
      palabrasClave: {
        include: {
          palabraClave: true,
        },
      },
      referenciasLegales: {
        include: {
          normaLegal: true,
        },
      },
    },
  },
  _count: {
    select: {
      planesAccion: true,
      documentosEvidencia: true,
    },
  },
} satisfies Prisma.ItemEvaluacionInclude;

async function obtenerEvaluacionConAcceso(
  evaluacionId: string,
  usuario: Express.UsuarioAutenticado
) {
  const evaluacion =
    await prisma.evaluacion.findUnique({
      where: { id: evaluacionId },
      select: {
        id: true,
        empresaId: true,
        estado: true,
      },
    });

  if (!evaluacion) {
    return {
      evaluacion: null,
      acceso: false,
    };
  }

  return {
    evaluacion,
    acceso: await puedeAccederEmpresa(
      usuario,
      evaluacion.empresaId
    ),
  };
}

export const controladorEvaluacionSgsst = {
  obtenerTodas: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const empresaId = texto(
        req.query.empresaId
      );

      const anio = Number(
        req.query.anioPeriodo
      );

      const where:
        Prisma.EvaluacionWhereInput = {
          empresa: filtroEmpresasPorUsuario(
            req.user
          ),
        };

      if (empresaId) {
        where.empresaId = empresaId;
      }

      if (
        Number.isInteger(anio) &&
        anio > 0
      ) {
        where.anioPeriodo = anio;
      }

      if (
        enumValido(
          EstadoEvaluacion,
          req.query.estado
        )
      ) {
        where.estado = req.query.estado;
      }

      const evaluaciones =
        await prisma.evaluacion.findMany({
          where,
          include:
            incluirResumenEvaluacion,
          orderBy: [
            { anioPeriodo: "desc" },
            { creadoEn: "desc" },
          ],
        });

      res.json(evaluaciones);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-LISTAR]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar las evaluaciones.",
      });
    }
  },

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const empresaId = texto(
        req.body.empresaId
      );

      const configuracionSgsstEmpresaId =
        texto(
          req.body
            .configuracionSgsstEmpresaId
        );

      const nombre = texto(req.body.nombre);

      const anioPeriodo = Number(
        req.body.anioPeriodo
      );

      if (
        !empresaId ||
        !configuracionSgsstEmpresaId ||
        !nombre ||
        !Number.isInteger(anioPeriodo)
      ) {
        throw new ErrorValidacion(
          "Empresa, configuración, nombre y año son obligatorios."
        );
      }

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para crear evaluaciones en esta empresa.",
        });
        return;
      }

      const configuracion =
        await prisma.configuracionSgsstEmpresa.findFirst({
          where: {
            id:
              configuracionSgsstEmpresaId,
            empresaId,
            activo: true,
          },
          include: {
            perfilAplicabilidad: true,
          },
        });

      if (!configuracion) {
        throw new ErrorValidacion(
          "La configuración seleccionada no existe, no pertenece a la empresa o está inactiva."
        );
      }

      const aplicabilidades =
        await prisma.requisitoAplicabilidad.findMany({
          where: {
            perfilAplicabilidadId:
              configuracion.perfilAplicabilidadId,
            requisito: {
              activo: true,
              estandar: {
                activo: true,
                categoria: {
                  activo: true,
                },
              },
            },
          },
          select: {
            requisitoId: true,
          },
        });

      if (aplicabilidades.length === 0) {
        throw new ErrorValidacion(
          "El perfil seleccionado todavía no tiene requisitos asociados."
        );
      }

      const usuarioId =
        req.user.usuarioId;

      const profesionalId =
        req.user.rol ===
        RolUsuario.PROFESIONAL
          ? req.user.profesionalId
          : null;

      const evaluacion =
        await prisma.$transaction(
          async (tx) => {
            const creada =
              await tx.evaluacion.create({
                data: {
                  empresaId,
                  configuracionSgsstEmpresaId,
                  creadoPorUsuarioId:
                    usuarioId,
                  nombre,
                  anioPeriodo,
                  estado:
                    EstadoEvaluacion.EN_PROGRESO,
                  iniciadaEn: new Date(),
                  notas: textoOpcional(
                    req.body.notas
                  ),
                },
              });

            await tx.itemEvaluacion.createMany({
              data: aplicabilidades.map(
                (aplicabilidad) => ({
                  evaluacionId: creada.id,
                  requisitoId:
                    aplicabilidad.requisitoId,
                  profesionalResponsableId:
                    profesionalId,
                })
              ),
            });

            return tx.evaluacion.findUniqueOrThrow({
              where: { id: creada.id },
              include:
                incluirResumenEvaluacion,
            });
          }
        );

      res.status(201).json(evaluacion);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-CREAR]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible crear la evaluación.",
      });
    }
  },

  obtenerPorId: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const id = String(req.params.id);

      const acceso =
        await obtenerEvaluacionConAcceso(
          id,
          req.user
        );

      if (!acceso.evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (!acceso.acceso) {
        res.status(403).json({
          error:
            "No tienes acceso a esta evaluación.",
        });
        return;
      }

      const evaluacion =
        await prisma.evaluacion.findUnique({
          where: { id },
          include: {
            ...incluirResumenEvaluacion,
            itemsEvaluacion: {
              include:
                incluirItemMatriz,
            },
            calificacionesEstandares: {
              include: {
                estandar: {
                  include: {
                    categoria: {
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

      if (!evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      evaluacion.itemsEvaluacion.sort(
        (a, b) => {
          const cicloA =
            a.requisito.estandar.categoria
              .cicloPhva.ordenVisualizacion;
          const cicloB =
            b.requisito.estandar.categoria
              .cicloPhva.ordenVisualizacion;

          if (cicloA !== cicloB) {
            return cicloA - cicloB;
          }

          const categoriaA =
            a.requisito.estandar.categoria
              .ordenVisualizacion;
          const categoriaB =
            b.requisito.estandar.categoria
              .ordenVisualizacion;

          if (categoriaA !== categoriaB) {
            return categoriaA - categoriaB;
          }

          const estandarA =
            a.requisito.estandar
              .ordenVisualizacion;
          const estandarB =
            b.requisito.estandar
              .ordenVisualizacion;

          if (estandarA !== estandarB) {
            return estandarA - estandarB;
          }

          return (
            a.requisito.ordenVisualizacion -
            b.requisito.ordenVisualizacion
          );
        }
      );

      res.json(evaluacion);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-DETALLE]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar la evaluación.",
      });
    }
  },

  actualizarItem: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const evaluacionId = String(
        req.params.id
      );

      const itemId = String(
        req.params.itemId
      );

      const acceso =
        await obtenerEvaluacionConAcceso(
          evaluacionId,
          req.user
        );

      if (!acceso.evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (
        !acceso.acceso ||
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          acceso.evaluacion.empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para modificar esta evaluación.",
        });
        return;
      }

      if (
        acceso.evaluacion.estado ===
        EstadoEvaluacion.CERRADA
      ) {
        res.status(409).json({
          error:
            "La evaluación está cerrada y no puede modificarse.",
        });
        return;
      }

      const item =
        await prisma.itemEvaluacion.findFirst({
          where: {
            id: itemId,
            evaluacionId,
          },
        });

      if (!item) {
        res.status(404).json({
          error:
            "Ítem de evaluación no encontrado.",
        });
        return;
      }

      const data:
        Prisma.ItemEvaluacionUncheckedUpdateInput =
          {};

      if (
        req.body.estadoAplicabilidad !==
        undefined
      ) {
        if (
          !enumValido(
            EstadoAplicabilidad,
            req.body.estadoAplicabilidad
          )
        ) {
          throw new ErrorValidacion(
            "Estado de aplicabilidad inválido."
          );
        }

        data.estadoAplicabilidad =
          req.body.estadoAplicabilidad;
      }

      if (
        req.body.estadoCumplimiento !==
        undefined
      ) {
        if (
          !enumValido(
            EstadoCumplimiento,
            req.body.estadoCumplimiento
          )
        ) {
          throw new ErrorValidacion(
            "Estado de cumplimiento inválido."
          );
        }

        data.estadoCumplimiento =
          req.body.estadoCumplimiento;

        data.evaluadoEn =
          req.body.estadoCumplimiento ===
          EstadoCumplimiento.PENDIENTE
            ? null
            : new Date();
      }

      if (
        req.body.observaciones !==
        undefined
      ) {
        data.observaciones =
          textoOpcional(
            req.body.observaciones
          );
      }

      if (
        req.body.fechaLimite !== undefined
      ) {
        data.fechaLimite =
          fechaOpcional(
            req.body.fechaLimite
          );
      }

      if (
        req.body.profesionalResponsableId !==
        undefined
      ) {
        const profesionalId = texto(
          req.body
            .profesionalResponsableId
        );

        if (!profesionalId) {
          data.profesionalResponsableId =
            null;
        } else {
          const asignado =
            await prisma.empresaProfesional.findFirst({
              where: {
                empresaId:
                  acceso.evaluacion
                    .empresaId,
                profesionalId,
                activo: true,
                profesional: {
                  activo: true,
                },
              },
              select: { id: true },
            });

          if (!asignado) {
            throw new ErrorValidacion(
              "El profesional responsable no está asignado a la empresa."
            );
          }

          data.profesionalResponsableId =
            profesionalId;
        }
      }

      const actualizado =
        await prisma.itemEvaluacion.update({
          where: { id: itemId },
          data,
          include: incluirItemMatriz,
        });

      res.json(actualizado);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-ITEM]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible actualizar el ítem de evaluación.",
      });
    }
  },

  guardarRespuesta: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const evaluacionId = String(
        req.params.id
      );

      const itemId = String(
        req.params.itemId
      );

      const acceso =
        await obtenerEvaluacionConAcceso(
          evaluacionId,
          req.user
        );

      if (!acceso.evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (!acceso.acceso) {
        res.status(403).json({
          error:
            "No tienes acceso a esta evaluación.",
        });
        return;
      }

      if (
        acceso.evaluacion.estado ===
        EstadoEvaluacion.CERRADA
      ) {
        res.status(409).json({
          error:
            "La evaluación está cerrada.",
        });
        return;
      }

      const item =
        await prisma.itemEvaluacion.findFirst({
          where: {
            id: itemId,
            evaluacionId,
          },
          select: { id: true },
        });

      if (!item) {
        res.status(404).json({
          error:
            "Ítem de evaluación no encontrado.",
        });
        return;
      }

      if (
        !enumValido(
          EstadoCumplimiento,
          req.body.estadoCumplimiento
        )
      ) {
        throw new ErrorValidacion(
          "Estado de cumplimiento inválido."
        );
      }

      const tipoSolicitado =
        enumValido(
          TipoEvaluador,
          req.body.tipoEvaluador
        )
          ? req.body.tipoEvaluador
          : undefined;

      const tipoEvaluador =
        resolverTipoEvaluador(
          req.user,
          tipoSolicitado
        );

      const usuarioId =
        req.user.usuarioId;

      const profesionalId =
        req.user.rol ===
        RolUsuario.PROFESIONAL
          ? req.user.profesionalId
          : undefined;

      const respuesta =
        await prisma.$transaction(
          async (tx) => {
            const guardada =
              await tx.respuestaEvaluacion.upsert({
                where: {
                  itemEvaluacionId_tipoEvaluador:
                    {
                      itemEvaluacionId:
                        itemId,
                      tipoEvaluador,
                    },
                },
                update: {
                  estadoCumplimiento:
                    req.body
                      .estadoCumplimiento,
                  observaciones:
                    textoOpcional(
                      req.body
                        .observaciones
                    ),
                  respondidoPorUsuarioId:
                    usuarioId,
                  respondidoEn:
                    new Date(),
                },
                create: {
                  itemEvaluacionId:
                    itemId,
                  tipoEvaluador,
                  estadoCumplimiento:
                    req.body
                      .estadoCumplimiento,
                  observaciones:
                    textoOpcional(
                      req.body
                        .observaciones
                    ),
                  respondidoPorUsuarioId:
                    usuarioId,
                },
                include: {
                  respondidoPorUsuario: {
                    select: {
                      id: true,
                      nombre: true,
                      correo: true,
                    },
                  },
                },
              });

            if (
              tipoEvaluador !==
              TipoEvaluador.EMPRESA
            ) {
              await tx.itemEvaluacion.update({
                where: { id: itemId },
                data: {
                  estadoCumplimiento:
                    req.body
                      .estadoCumplimiento,
                  observaciones:
                    textoOpcional(
                      req.body
                        .observaciones
                    ),
                  evaluadoEn:
                    req.body
                      .estadoCumplimiento ===
                    EstadoCumplimiento.PENDIENTE
                      ? null
                      : new Date(),
                  profesionalResponsableId:
                    profesionalId,
                },
              });
            }

            return guardada;
          }
        );

      res.json(respuesta);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-RESPUESTA]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible guardar la respuesta.",
      });
    }
  },

  calcular: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const id = String(req.params.id);

      const acceso =
        await obtenerEvaluacionConAcceso(
          id,
          req.user
        );

      if (!acceso.evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (!acceso.acceso) {
        res.status(403).json({
          error:
            "No tienes acceso a esta evaluación.",
        });
        return;
      }

      const tipoSolicitado =
        enumValido(
          TipoEvaluador,
          req.body.tipoEvaluador
        )
          ? req.body.tipoEvaluador
          : undefined;

      const tipoEvaluador =
        resolverTipoEvaluador(
          req.user,
          tipoSolicitado
        );

      const resumen =
        await calcularEvaluacion(
          id,
          tipoEvaluador
        );

      res.json(resumen);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-CALCULAR]",
        error
      );

      if (
        error instanceof Error &&
        error.message ===
          "EVALUACION_NO_ENCONTRADA"
      ) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible calcular la evaluación.",
      });
    }
  },

  completar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      const id = String(req.params.id);

      const acceso =
        await obtenerEvaluacionConAcceso(
          id,
          req.user
        );

      if (!acceso.evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          acceso.evaluacion.empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para completar esta evaluación.",
        });
        return;
      }

      const pendientes =
        await prisma.itemEvaluacion.count({
          where: {
            evaluacionId: id,
            estadoAplicabilidad: {
              not:
                EstadoAplicabilidad.NO_APLICA,
            },
            estadoCumplimiento:
              EstadoCumplimiento.PENDIENTE,
          },
        });

      if (pendientes > 0) {
        res.status(409).json({
          error:
            `La evaluación tiene ${pendientes} ítems pendientes.`,
          pendientes,
        });
        return;
      }

      const tipoEvaluador =
        resolverTipoEvaluador(req.user);

      const calificacion =
        await calcularEvaluacion(
          id,
          tipoEvaluador
        );

      const evaluacion =
        await prisma.evaluacion.update({
          where: { id },
          data: {
            estado:
              EstadoEvaluacion.COMPLETADA,
          },
          include:
            incluirResumenEvaluacion,
        });

      res.json({
        evaluacion,
        calificacion,
      });
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-COMPLETAR]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible completar la evaluación.",
      });
    }
  },

  cerrar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado.",
        });
        return;
      }

      if (!esRolInterno(req.user.rol)) {
        res.status(403).json({
          error:
            "Solo un usuario interno puede cerrar definitivamente una evaluación.",
        });
        return;
      }

      const id = String(req.params.id);

      const evaluacion =
        await prisma.evaluacion.findUnique({
          where: { id },
        });

      if (!evaluacion) {
        res.status(404).json({
          error:
            "Evaluación no encontrada.",
        });
        return;
      }

      if (
        evaluacion.estado !==
        EstadoEvaluacion.COMPLETADA
      ) {
        res.status(409).json({
          error:
            "La evaluación debe estar completada antes de cerrarse.",
        });
        return;
      }

      const cerrada =
        await prisma.evaluacion.update({
          where: { id },
          data: {
            estado:
              EstadoEvaluacion.CERRADA,
            cerradaEn: new Date(),
          },
          include:
            incluirResumenEvaluacion,
        });

      res.json(cerrada);
    } catch (error) {
      console.error(
        "[EVALUACION-SGSST-CERRAR]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible cerrar la evaluación.",
      });
    }
  },
};
