import { Router } from "express";

import {
  controladorPlanAccion,
} from "../../controllers/sgsst/plan-accion.controller";

import {
  authenticate as autenticar,
} from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  autenticar,
  controladorPlanAccion.obtenerTodos
);

router.post(
  "/",
  autenticar,
  controladorPlanAccion.crear
);

router.put(
  "/:id",
  autenticar,
  controladorPlanAccion.actualizar
);

router.post(
  "/:id/avances",
  autenticar,
  controladorPlanAccion.registrarAvance
);

export default router;
