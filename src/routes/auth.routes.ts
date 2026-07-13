import { Router } from "express";

import {
  getMe as obtenerMiSesion,
  login as iniciarSesion,
  register as registrar,
} from "../controllers/auth.controller";

import {
  authenticate as autenticar,
} from "../middlewares/auth.middleware";

const router = Router();

// Rutas principales en español
router.post("/registrar", registrar);
router.post("/iniciar-sesion", iniciarSesion);
router.get("/mi-sesion", autenticar, obtenerMiSesion);

// Alias temporales para no romper el frontend actual
router.post("/register", registrar);
router.post("/login", iniciarSesion);
router.get("/me", autenticar, obtenerMiSesion);

export default router;
