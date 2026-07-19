import type {
  Request,
  Response,
} from "express";

import { servicioHistorialSupermatriz } from "../../services/supermatriz/historial-supermatriz.service";
import {
  enteroOpcional,
  normalizarTexto,
  responderErrorSupermatriz,
} from "../../utils/supermatriz";

export const controladorHistorialSupermatriz = {
  obtenerTodos: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const pagina = Math.max(
        Number(req.query.pagina) || 1,
        1
      );

      const limite = Math.min(
        Math.max(
          Number(req.query.limite) ||
            25,
          1
        ),
        100
      );

      res.json(
        await servicioHistorialSupermatriz.obtenerTodos(
          {
            versionSupermatrizId:
              enteroOpcional(
                req.query
                  .versionSupermatrizId
              ),
            tipoEntidad:
              normalizarTexto(
                req.query.tipoEntidad
              ) || undefined,
            accion:
              normalizarTexto(
                req.query.accion
              ) || undefined,
            pagina,
            limite,
          }
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "HISTORIAL"
      );
    }
  },
};
