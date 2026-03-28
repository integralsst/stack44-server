// src/routes/company.routes.ts
import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { authenticate } from '../middlewares/auth.middleware'; // Ajusta esta ruta según tu proyecto

const router = Router();

// Todas las rutas base: /api/companies ahora están protegidas
router.post('/', authenticate, companyController.create);
router.get('/', authenticate, companyController.getAll);
router.get('/:id', authenticate, companyController.getById);
router.put('/:id', authenticate, companyController.update);
router.delete('/:id', authenticate, companyController.delete);

export default router;