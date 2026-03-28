// src/routes/company.routes.ts
import { Router } from 'express';
import { companyController } from '../controllers/company.controller';

const router = Router();

// Rutas base: /api/companies
router.post('/', companyController.create);
router.get('/', companyController.getAll);
router.get('/:id', companyController.getById);
router.put('/:id', companyController.update);
router.delete('/:id', companyController.delete);

export default router;