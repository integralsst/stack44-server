import { Router } from "express";

import {
  controladorCatalogoSgsst,
} from "../../controllers/sgsst/catalogo-sgsst.controller";

import {
  authenticate as autenticar,
} from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/marcos",
  autenticar,
  controladorCatalogoSgsst.obtenerMarcos
);

router.get(
  "/marcos/:marcoId",
  autenticar,
  controladorCatalogoSgsst.obtenerMarcoPorId
);

router.get(
  "/perfiles/:perfilId/matriz",
  autenticar,
  controladorCatalogoSgsst.obtenerMatrizPorPerfil
);

export default router;
