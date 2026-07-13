import { Router } from "express";

import {
  controladorConfiguracionSgsst,
} from "../../controllers/sgsst/configuracion-sgsst.controller";

import {
  authenticate as autenticar,
} from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/empresa/:empresaId",
  autenticar,
  controladorConfiguracionSgsst.obtenerPorEmpresa
);

router.get(
  "/empresa/:empresaId/activa",
  autenticar,
  controladorConfiguracionSgsst.obtenerActiva
);

router.post(
  "/empresa/:empresaId",
  autenticar,
  controladorConfiguracionSgsst.crear
);

router.put(
  "/:id",
  autenticar,
  controladorConfiguracionSgsst.actualizar
);

export default router;
