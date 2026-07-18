import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorCatalogosSupermatriz } from "../controllers/supermatriz/catalogos-supermatriz.controller";
import { controladorTareasSupermatriz } from "../controllers/supermatriz/tareas-supermatriz.controller";
import { controladorVersionesSupermatriz } from "../controllers/supermatriz/versiones-supermatriz.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
];

const rolesEdicion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

router.use(autenticar);

router.get(
  "/catalogos",
  autorizar(...rolesLectura),
  controladorCatalogosSupermatriz.obtenerTodos
);

router.get(
  "/resumen",
  autorizar(...rolesLectura),
  controladorCatalogosSupermatriz.obtenerResumen
);

router.get(
  "/versiones",
  autorizar(...rolesLectura),
  controladorVersionesSupermatriz.obtenerTodas
);

router.get(
  "/versiones/:id",
  autorizar(...rolesLectura),
  controladorVersionesSupermatriz.obtenerPorId
);

router.post(
  "/versiones",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.crear
);

router.put(
  "/versiones/:id",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.actualizar
);

router.get(
  "/tareas",
  autorizar(...rolesLectura),
  controladorTareasSupermatriz.obtenerTodas
);

router.get(
  "/tareas/:id",
  autorizar(...rolesLectura),
  controladorTareasSupermatriz.obtenerPorId
);

router.post(
  "/tareas",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.crear
);

router.put(
  "/tareas/:id",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.actualizar
);

router.delete(
  "/tareas/:id",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.eliminar
);

export default router;
