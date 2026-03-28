// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client'; // Importamos Role para evitar desfases
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_para_firmar_tokens_sis_2026';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extraemos companyId. En un SaaS, esto vendría si es una invitación.
    const { email, password, name, companyId, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El correo ya está registrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        companyId: companyId || null,
        role: (role as Role) || 'USER' // Aseguramos que el rol sea válido
      }
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al registrar.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    // El Payload del token ahora incluye companyId para facilitar el filtrado en el front
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        companyId: user.companyId 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId, // Match perfecto con tu AuthContext
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
};