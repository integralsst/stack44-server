import { Router } from "express";

import rutasCatalogo from "./sgsst/catalogo.routes";
import rutasConfiguracion from "./sgsst/configuracion.routes";
import rutasEvaluacion from "./sgsst/evaluacion.routes";
import rutasPlanesAccion from "./sgsst/plan-accion.routes";

const router = Router();

router.use("/catalogo", rutasCatalogo);
router.use(
  "/configuraciones",
  rutasConfiguracion
);
router.use(
  "/evaluaciones",
  rutasEvaluacion
);
router.use(
  "/planes-accion",
  rutasPlanesAccion
);

export default router;
