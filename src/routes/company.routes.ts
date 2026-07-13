import { Router } from "express";
import { RolUsuario } from "@prisma/client";

import {
  controladorEmpresa,
} from "../controllers/company.controller";

import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesInternos = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

// Consultar empresas visibles para el usuario autenticado
router.get(
  "/",
  autenticar,
  controladorEmpresa.obtenerTodas
);

// Consultar una empresa por ID
router.get(
  "/:id",
  autenticar,
  controladorEmpresa.obtenerPorId
);

// Crear empresa
router.post(
  "/",
  autenticar,
  autorizar(...rolesInternos),
  controladorEmpresa.crear
);

// Actualizar empresa
router.put(
  "/:id",
  autenticar,
  autorizar(...rolesInternos),
  controladorEmpresa.actualizar
);

// Desactivar empresa
router.delete(
  "/:id",
  autenticar,
  autorizar(...rolesInternos),
  controladorEmpresa.eliminar
);

export default router;
