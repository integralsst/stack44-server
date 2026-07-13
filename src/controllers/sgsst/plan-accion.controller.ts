import {
  Request,
  Response,
} from "express";
import {
  EstadoAccion,
  Prisma,
  PrioridadAccion,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  filtroEmpresasPorUsuario,
  puedeGestionarEmpresaSgsst,
} from "../../utils/sgsst-access";

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

function porcentaje(
  value: unknown
): number {
  const numero = Number(value);

  if (
    !Number.isInteger(numero) ||
    numero < 0 ||
    numero > 100
  ) {
    throw new ErrorValidacion(
      "El porcentaje de avance debe estar entre 0 y 100."
    );
  }

  return numero;
}

const incluirPlan = {
  empresa: {
    select: {
      id: true,
      nit: true,
      nombre: true,
    },
  },
  requisito: {
    include: {
      estandar: true,
      proceso: true,
    },
  },
  itemEvaluacion: {
    select: {
      id: true,
      evaluacionId: true,
      estadoCumplimiento: true,
    },
  },
  usuarioResponsable: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
  profesionalResponsable: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,
    },
  },
  rolResponsable: true,
  avances: {
    orderBy: {
      registradoEn: "desc",
    },
    include: {
      registradoPorUsuario: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  _count: {
    select: {
      documentosEvidencia: true,
    },
  },
} satisfies Prisma.PlanAccionInclude;

export const controladorPlanAccion = {
  obtenerTodos: async (
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

      const evaluacionId = texto(
        req.query.evaluacionId
      );

      const where:
        Prisma.PlanAccionWhereInput = {
          empresa: filtroEmpresasPorUsuario(
            req.user
          ),
        };

      if (empresaId) {
        where.empresaId = empresaId;
      }

      if (evaluacionId) {
        where.itemEvaluacion = {
          evaluacionId,
        };
      }

      if (
        Object.values(
          EstadoAccion
        ).includes(
          req.query.estado as EstadoAccion
        )
      ) {
        where.estado =
          req.query.estado as EstadoAccion;
      }

      const planes =
        await prisma.planAccion.findMany({
          where,
          include: incluirPlan,
          orderBy: [
            { fechaLimite: "asc" },
            { creadoEn: "desc" },
          ],
        });

      res.json(planes);
    } catch (error) {
      console.error(
        "[PLAN-ACCION-LISTAR]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar los planes de acción.",
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

      const requisitoId = texto(
        req.body.requisitoId
      );

      const descripcion = texto(
        req.body.descripcion
      );

      if (
        !empresaId ||
        !requisitoId ||
        !descripcion
      ) {
        throw new ErrorValidacion(
          "Empresa, requisito y descripción son obligatorios."
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
            "No tienes permiso para crear planes de acción en esta empresa.",
        });
        return;
      }

      const itemEvaluacionId =
        texto(req.body.itemEvaluacionId) ||
        null;

      if (itemEvaluacionId) {
        const item =
          await prisma.itemEvaluacion.findFirst({
            where: {
              id: itemEvaluacionId,
              requisitoId,
              evaluacion: {
                empresaId,
              },
            },
            select: { id: true },
          });

        if (!item) {
          throw new ErrorValidacion(
            "El ítem de evaluación no corresponde a la empresa o requisito."
          );
        }
      }

      const prioridad =
        Object.values(
          PrioridadAccion
        ).includes(
          req.body
            .prioridad as PrioridadAccion
        )
          ? (req.body
              .prioridad as PrioridadAccion)
          : PrioridadAccion.MEDIA;

      const profesionalResponsableId =
        req.user.rol ===
        RolUsuario.PROFESIONAL
          ? req.user.profesionalId
          : texto(
              req.body
                .profesionalResponsableId
            ) || null;

      const plan =
        await prisma.planAccion.create({
          data: {
            empresaId,
            requisitoId,
            itemEvaluacionId,
            descripcion,
            prioridad,
            estado:
              EstadoAccion.PENDIENTE,
            fechaInicioPlanificada:
              fechaOpcional(
                req.body
                  .fechaInicioPlanificada
              ),
            fechaLimite: fechaOpcional(
              req.body.fechaLimite
            ),
            notas: textoOpcional(
              req.body.notas
            ),
            usuarioResponsableId:
              texto(
                req.body
                  .usuarioResponsableId
              ) || null,
            profesionalResponsableId,
            rolResponsableId:
              texto(
                req.body
                  .rolResponsableId
              ) || null,
            creadoPorUsuarioId:
              req.user.usuarioId,
          },
          include: incluirPlan,
        });

      res.status(201).json(plan);
    } catch (error) {
      console.error(
        "[PLAN-ACCION-CREAR]",
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
          "No fue posible crear el plan de acción.",
      });
    }
  },

  actualizar: async (
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

      const actual =
        await prisma.planAccion.findUnique({
          where: { id },
          select: {
            id: true,
            empresaId: true,
          },
        });

      if (!actual) {
        res.status(404).json({
          error:
            "Plan de acción no encontrado.",
        });
        return;
      }

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          actual.empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para actualizar este plan.",
        });
        return;
      }

      const data:
        Prisma.PlanAccionUncheckedUpdateInput =
          {};

      if (
        req.body.descripcion !== undefined
      ) {
        const descripcion = texto(
          req.body.descripcion
        );

        if (!descripcion) {
          throw new ErrorValidacion(
            "La descripción no puede estar vacía."
          );
        }

        data.descripcion = descripcion;
      }

      if (
        Object.values(
          PrioridadAccion
        ).includes(
          req.body
            .prioridad as PrioridadAccion
        )
      ) {
        data.prioridad =
          req.body
            .prioridad as PrioridadAccion;
      }

      if (
        Object.values(
          EstadoAccion
        ).includes(
          req.body.estado as EstadoAccion
        )
      ) {
        data.estado =
          req.body.estado as EstadoAccion;

        if (
          req.body.estado ===
          EstadoAccion.COMPLETADA
        ) {
          data.porcentajeAvance = 100;
          data.completadaEn = new Date();
        }
      }

      if (
        req.body.fechaInicioPlanificada !==
        undefined
      ) {
        data.fechaInicioPlanificada =
          fechaOpcional(
            req.body
              .fechaInicioPlanificada
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

      if (req.body.notas !== undefined) {
        data.notas = textoOpcional(
          req.body.notas
        );
      }

      const plan =
        await prisma.planAccion.update({
          where: { id },
          data,
          include: incluirPlan,
        });

      res.json(plan);
    } catch (error) {
      console.error(
        "[PLAN-ACCION-ACTUALIZAR]",
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
          "No fue posible actualizar el plan de acción.",
      });
    }
  },

  registrarAvance: async (
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

      const actual =
        await prisma.planAccion.findUnique({
          where: { id },
          select: {
            id: true,
            empresaId: true,
          },
        });

      if (!actual) {
        res.status(404).json({
          error:
            "Plan de acción no encontrado.",
        });
        return;
      }

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          actual.empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para registrar avances.",
        });
        return;
      }

      const nuevoPorcentaje =
        porcentaje(
          req.body.porcentajeAvance
        );

      const usuarioId =
        req.user.usuarioId;

      const plan =
        await prisma.$transaction(
          async (tx) => {
            await tx.avancePlanAccion.create({
              data: {
                planAccionId: id,
                registradoPorUsuarioId:
                  usuarioId,
                porcentajeAvance:
                  nuevoPorcentaje,
                notas: textoOpcional(
                  req.body.notas
                ),
              },
            });

            return tx.planAccion.update({
              where: { id },
              data: {
                porcentajeAvance:
                  nuevoPorcentaje,
                estado:
                  nuevoPorcentaje >= 100
                    ? EstadoAccion.COMPLETADA
                    : nuevoPorcentaje > 0
                      ? EstadoAccion.EN_PROGRESO
                      : EstadoAccion.PENDIENTE,
                completadaEn:
                  nuevoPorcentaje >= 100
                    ? new Date()
                    : null,
              },
              include: incluirPlan,
            });
          }
        );

      res.json(plan);
    } catch (error) {
      console.error(
        "[PLAN-ACCION-AVANCE]",
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
          "No fue posible registrar el avance.",
      });
    }
  },
};
