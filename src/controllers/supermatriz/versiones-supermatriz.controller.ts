import type { Request, Response } from "express";

import { servicioVersionesSupermatriz } from "../../services/supermatriz/versiones-supermatriz.service";
import {
  ErrorValidacionSupermatriz,
  estadoVersion,
  fechaOpcional,
  normalizarTexto,
  responderErrorSupermatriz,
  textoOpcional,
} from "../../utils/supermatriz";

function construirDatosVersion(body: Record<string, unknown>) {
  const nombre = normalizarTexto(body.nombre ?? body.name);

  if (!nombre) {
    throw new ErrorValidacionSupermatriz(
      "El nombre de la versión es obligatorio."
    );
  }

  const vigenteDesde = fechaOpcional(
    body.vigenteDesde ?? body.validFrom
  );
  const vigenteHasta = fechaOpcional(
    body.vigenteHasta ?? body.validUntil
  );

  if (
    vigenteDesde &&
    vigenteHasta &&
    vigenteHasta.getTime() < vigenteDesde.getTime()
  ) {
    throw new ErrorValidacionSupermatriz(
      "La fecha final no puede ser anterior a la fecha inicial."
    );
  }

  return {
    nombre,
    descripcion: textoOpcional(body.descripcion ?? body.description),
    estado: estadoVersion(body.estado ?? body.status),
    vigenteDesde,
    vigenteHasta,
  };
}

export const controladorVersionesSupermatriz = {
  obtenerTodas: async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json(await servicioVersionesSupermatriz.obtenerTodas());
    } catch (error) {
      responderErrorSupermatriz(res, error, "VERSIONES-LISTAR");
    }
  },

  obtenerPorId: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const version = await servicioVersionesSupermatriz.obtenerPorId(id);

      if (!version) {
        res.status(404).json({ error: "Versión no encontrada." });
        return;
      }

      res.json(version);
    } catch (error) {
      responderErrorSupermatriz(res, error, "VERSIONES-DETALLE");
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado." });
        return;
      }

      const version = await servicioVersionesSupermatriz.crear(
        construirDatosVersion(req.body),
        req.user.usuarioId
      );

      res.status(201).json(version);
    } catch (error) {
      responderErrorSupermatriz(res, error, "VERSIONES-CREAR");
    }
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "No autorizado." });
        return;
      }

      const version = await servicioVersionesSupermatriz.actualizar(
        Number(req.params.id),
        construirDatosVersion(req.body),
        req.user.usuarioId
      );

      res.json(version);
    } catch (error) {
      responderErrorSupermatriz(res, error, "VERSIONES-ACTUALIZAR");
    }
  },
};
