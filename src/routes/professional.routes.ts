import { Router } from "express";
import { Role } from "@prisma/client";

import { professionalController } from "../controllers/professional.controller";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/me",
  authenticate,
  authorize(Role.PROFESSIONAL),
  professionalController.getMe
);

router.get(
  "/",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  professionalController.getAll
);

router.post(
  "/",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  professionalController.create
);

router.post(
  "/:id/companies",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  professionalController.assignCompany
);

router.delete(
  "/:id/companies/:companyId",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  professionalController.removeCompanyAssignment
);

router.get(
  "/:id",
  authenticate,
  professionalController.getById
);

router.put(
  "/:id",
  authenticate,
  professionalController.update
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    Role.SUPERADMIN,
    Role.OWNER,
    Role.ADMIN
  ),
  professionalController.delete
);

export default router;