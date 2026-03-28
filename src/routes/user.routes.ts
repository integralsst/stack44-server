// src/routes/user.routes.ts
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.get('/', authenticate, userController.getAll);
router.post('/', authenticate, userController.create);
router.delete('/:id', authenticate, userController.delete);

export default router;