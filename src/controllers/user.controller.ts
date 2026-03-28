// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { PrismaClient, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const userController = {
  // 1. Obtener usuarios
  getAll: async (req: Request, res: Response): Promise<void> => {
    try {
      const userReq = req.user;
      
      if (!userReq) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const whereClause: Prisma.UserWhereInput = userReq.role === 'SUPERADMIN' 
        ? {} 
        : { companyId: (userReq.companyId as string) || null };

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          company: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  },

  // 2. Crear un nuevo usuario
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role, companyId } = req.body;
      const userReq = req.user;

      if (!userReq) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const targetCompanyId: string | null = userReq.role === 'SUPERADMIN' 
        ? (companyId || null) 
        : ((userReq.companyId as string) || null);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'El correo ya está en uso' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const assignedRole: Role = Object.values(Role).includes(role as Role) 
        ? (role as Role) 
        : Role.USER;

      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: assignedRole,
          companyId: targetCompanyId
        },
        select: { id: true, name: true, email: true, role: true, companyId: true }
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  },

  // 3. Actualizar usuario
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { name, email, password, role } = req.body;
      const userReq = req.user;

      if (!userReq) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      
      if (!targetUser) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      // Verificación de aislamiento de datos
      if (userReq.role !== 'SUPERADMIN' && targetUser.companyId !== userReq.companyId) {
        res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
        return;
      }

      // Preparar el objeto de actualización
      const updateData: Prisma.UserUpdateInput = { name, email };

      // Solo actualiza el rol si se envía y es válido
      if (role && Object.values(Role).includes(role as Role)) {
        updateData.role = role as Role;
      }

      // Si se envía una nueva contraseña, se encripta. Si no, se ignora.
      if (password && password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, companyId: true, company: { select: { name: true } } }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  },

  // 4. Eliminar usuario
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const userReq = req.user;

      if (!userReq) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const userToDelete = await prisma.user.findUnique({ where: { id } });
      
      if (!userToDelete) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      if (userReq.role !== 'SUPERADMIN' && userToDelete.companyId !== userReq.companyId) {
        res.status(403).json({ error: 'No tienes permiso para eliminar este usuario' });
        return;
      }

      if (userToDelete.id === userReq.userId) {
         res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
         return;
      }

      await prisma.user.delete({ where: { id } });
      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  }
};