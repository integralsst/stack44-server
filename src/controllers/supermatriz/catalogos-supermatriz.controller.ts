import type { Request, Response } from "express";

import { servicioCatalogosSupermatriz } from "../../services/supermatriz/catalogos-supermatriz.service";
import { responderErrorSupermatriz } from "../../utils/supermatriz";

export const controladorCatalogosSupermatriz = {
  obtenerTodos: async (req: Request, res: Response): Promise<void> => {
    try {
      const incluirInactivos =
        req.query.incluirInactivos === "true" ||
        req.query.includeInactive === "true";

      const catalogos =
        await servicioCatalogosSupermatriz.obtenerTodos(
          incluirInactivos
        );

      res.json(catalogos);
    } catch (error) {
      responderErrorSupermatriz(res, error, "CATALOGOS");
    }
  },

  obtenerResumen: async (_req: Request, res: Response): Promise<void> => {
    try {
      const resumen =
        await servicioCatalogosSupermatriz.obtenerResumen();

      res.json(resumen);
    } catch (error) {
      responderErrorSupermatriz(res, error, "RESUMEN");
    }
  },
};
