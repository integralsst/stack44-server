import { Router } from "express";

import {
  controladorEvaluacionSgsst,
} from "../../controllers/sgsst/evaluacion-sgsst.controller";

import {
  authenticate as autenticar,
} from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  autenticar,
  controladorEvaluacionSgsst.obtenerTodas
);

router.post(
  "/",
  autenticar,
  controladorEvaluacionSgsst.crear
);

router.get(
  "/:id",
  autenticar,
  controladorEvaluacionSgsst.obtenerPorId
);

router.put(
  "/:id/items/:itemId",
  autenticar,
  controladorEvaluacionSgsst.actualizarItem
);

router.put(
  "/:id/items/:itemId/respuesta",
  autenticar,
  controladorEvaluacionSgsst.guardarRespuesta
);

router.post(
  "/:id/calcular",
  autenticar,
  controladorEvaluacionSgsst.calcular
);

router.post(
  "/:id/completar",
  autenticar,
  controladorEvaluacionSgsst.completar
);

router.post(
  "/:id/cerrar",
  autenticar,
  controladorEvaluacionSgsst.cerrar
);

export default router;
