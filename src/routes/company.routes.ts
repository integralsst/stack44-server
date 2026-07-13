import { Router } from "express";
import { Role } from "@prisma/client";

import { companyController } from "../controllers/company.controller";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  companyController.getAll
);

router.get(
  "/:id",
  authenticate,
  companyController.getById
);

router.post(
  "/",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  companyController.create
);

router.put(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  companyController.update
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  companyController.delete
);

export default router;