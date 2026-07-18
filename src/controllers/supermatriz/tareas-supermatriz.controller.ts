import {
  EstadoRegistro,
} from "@prisma/client";
import type { Request, Response } from "express";

import { servicioTareasSupermatriz } from "../../services/supermatriz/tareas-supermatriz.service";
import type {
  FiltrosTareasSupermatriz,
} from "../../types/supermatriz.types";
import {
  estadoRegistro,
  enteroOpcional,
  enteroRequerido,
  idsEnteros,
  normalizarTexto,
  responderErrorSupermatriz,
  textoOpcional,
} from "../../utils/supermatriz";

function construirFiltros(req: Request): FiltrosTareasSupermatriz {
  const pagina = Math.max(Number(req.query.pagina ?? req.query.page) || 1, 1);
  const limite = Math.min(
    Math.max(Number(req.query.limite ?? req.query.limit) || 25, 1),
    100
  );

  const estadoSolicitado = req.query.estado ?? req.query.status;

  return {
    versionSupermatrizId: enteroOpcional(
      req.query.versionSupermatrizId ?? req.query.versionId
    ),
    cicloPhvaId: enteroOpcional(req.query.cicloPhvaId),
    categoriaEstandarId: enteroOpcional(
      req.query.categoriaEstandarId
    ),
    estandarId: enteroOpcional(req.query.estandarId),
    procesoId: enteroOpcional(req.query.procesoId),
    categoriaGestionId: enteroOpcional(
      req.query.categoriaGestionId
    ),
    grupoMinisterialId: enteroOpcional(
      req.query.grupoMinisterialId
    ),
    estado: Object.values(EstadoRegistro).includes(
      estadoSolicitado as EstadoRegistro
    )
      ? (estadoSolicitado as EstadoRegistro)
      : EstadoRegistro.ACTIVO,
    busqueda: normalizarTexto(
      req.query.busqueda ?? req.query.search
    ),
    pagina,
    limite,
  };
}

function construirDatosTarea(body: Record<string, unknown>) {
  return {
    versionSupermatrizId: enteroRequerido(
      body.versionSupermatrizId ?? body.versionId,
      "La versión"
    ),
    aspectoId: enteroRequerido(
      body.aspectoId ?? body.aspectId,
      "El aspecto"
    ),
    procesoId: enteroRequerido(
      body.procesoId ?? body.processId,
      "El proceso"
    ),
    codigo: textoOpcional(body.codigo ?? body.code),
    orden: enteroRequerido(body.orden ?? body.order, "El orden", 0),
    ejecucion: textoOpcional(body.ejecucion ?? body.execution),
    fundamentosSoportes: textoOpcional(
      body.fundamentosSoportes ?? body.supports
    ),
    responsableActividad: textoOpcional(
      body.responsableActividad ?? body.suggestedResponsible
    ),
    metasEstandar: textoOpcional(body.metasEstandar ?? body.goal),
    recursosAdministrativos: textoOpcional(
      body.recursosAdministrativos ?? body.resources
    ),
    estado: estadoRegistro(body.estado ?? body.status),
    categoriaGestionIds: idsEnteros(
      body.categoriaGestionIds ?? body.managementCategoryIds
    ),
  };
}

export const controladorTareasSupermatriz = {
  obtenerTodas: async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await servicioTareasSupermatriz.obtenerTodas(
          construirFiltros(req)
        )
      );
    } catch (error) {
      responderErrorSupermatriz(res, error, "TAREAS-LISTAR");
    }
  },

  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    try {
      const tarea = await servicioTareasSupermatriz.obtenerPorId(
        Number(req.params.id)
      );

      if (!tarea) {
        res.status(404).json({ error: "Fila no encontrada." });
        return;
      }

      res.json(tarea);
    } catch (error) {
      responderErrorSupermatriz(res, error, "TAREAS-DETALLE");
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado." });
        return;
      }

      const tarea = await servicioTareasSupermatriz.crear(
        construirDatosTarea(req.body),
        req.user.usuarioId
      );

      res.status(201).json(tarea);
    } catch (error) {
      responderErrorSupermatriz(res, error, "TAREAS-CREAR");
    }
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado." });
        return;
      }

      const tarea = await servicioTareasSupermatriz.actualizar(
        Number(req.params.id),
        construirDatosTarea(req.body),
        req.user.usuarioId
      );

      res.json(tarea);
    } catch (error) {
      responderErrorSupermatriz(res, error, "TAREAS-ACTUALIZAR");
    }
  },

  eliminar: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado." });
        return;
      }

      const tarea = await servicioTareasSupermatriz.desactivar(
        Number(req.params.id),
        req.user.usuarioId
      );

      res.json({
        mensaje: "Fila desactivada correctamente.",
        tarea,
      });
    } catch (error) {
      responderErrorSupermatriz(res, error, "TAREAS-DESACTIVAR");
    }
  },
};
