import { Router } from "express";
import { Role } from "@prisma/client";

import { userController } from "../controllers/user.controller";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN,
    Role.CLIENT_ADMIN
  ),
  userController.getAll
);

router.get(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN,
    Role.CLIENT_ADMIN
  ),
  userController.getById
);

router.post(
  "/",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN,
    Role.CLIENT_ADMIN
  ),
  userController.create
);

router.put(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN,
    Role.CLIENT_ADMIN
  ),
  userController.update
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN,
    Role.CLIENT_ADMIN
  ),
  userController.delete
);

export default router;