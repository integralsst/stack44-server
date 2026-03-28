import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const companyController = {
  // Crear una nueva empresa
  create: async (req: Request, res: Response) => {
    try {
      const { name, taxId } = req.body;
      const newCompany = await prisma.company.create({
        data: { name, taxId },
      });
      res.status(201).json(newCompany);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear la empresa' });
    }
  },

  // Obtener todas las empresas (Solo con conteo de usuarios)
  getAll: async (req: Request, res: Response) => {
    try {
      const companies = await prisma.company.findMany({
        include: {
          _count: {
            select: { users: true }, // Se eliminó 'contacts'
          },
        },
      });
      res.json(companies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener las empresas' });
    }
  },

  // Obtener una empresa por ID
  getById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const company = await prisma.company.findUnique({
        where: { id },
        include: { users: true },
      });
      
      if (!company) {
         res.status(404).json({ error: 'Empresa no encontrada' });
         return;
      }
      res.json(company);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener la empresa' });
    }
  },

  // Actualizar una empresa
  update: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name, taxId } = req.body;
      const updatedCompany = await prisma.company.update({
        where: { id },
        data: { name, taxId },
      });
      res.json(updatedCompany);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar la empresa' });
    }
  },

  // Eliminar una empresa
  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.company.delete({
        where: { id },
      });
      res.json({ message: 'Empresa eliminada correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la empresa' });
    }
  },
};