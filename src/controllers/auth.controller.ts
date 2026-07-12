// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'una_clave_larga_y_privada';

export const register = async (req: Request, res: Response): Promise<void> => {
  console.log(`[AUTH-REGISTER] Iniciando petición de registro para: ${req.body.email}`);
  try {
    const { email, password, name, companyId, role } = req.body;

    console.log(`[AUTH-REGISTER] Buscando si el usuario ${email} ya existe...`);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      console.warn(`[AUTH-REGISTER] Rechazado: El correo ${email} ya está registrado.`);
      res.status(400).json({ error: 'El correo ya está registrado.' });
      return;
    }

    console.log(`[AUTH-REGISTER] Encriptando contraseña...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log(`[AUTH-REGISTER] Creando usuario en la base de datos...`);
    const newUser = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        companyId: companyId || null,
        role: (role as Role) || 'USER'
      }
    });

    console.log(`[AUTH-REGISTER] Éxito: Usuario creado con ID: ${newUser.id}`);
    res.status(201).json({ message: 'Usuario creado exitosamente', userId: newUser.id });
  } catch (error: any) {
    console.error('[AUTH-REGISTER] ERROR CRÍTICO durante el registro:');
    console.error(error.message || error);
    console.error(error.stack); // Imprime la traza completa para Render
    res.status(500).json({ error: 'Error interno del servidor al registrar.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  console.log(`[AUTH-LOGIN] Iniciando petición de login para: ${req.body.email}`);
  try {
    const { email, password } = req.body;

    console.log(`[AUTH-LOGIN] Consultando usuario en Prisma...`);
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.warn(`[AUTH-LOGIN] Fallo: No se encontró el usuario ${email} en la base de datos.`);
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    console.log(`[AUTH-LOGIN] Usuario encontrado. Comparando contraseñas...`);
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.warn(`[AUTH-LOGIN] Fallo: La contraseña ingresada no coincide para ${email}.`);
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    console.log(`[AUTH-LOGIN] Contraseña válida. Generando token JWT...`);
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

    console.log(`[AUTH-LOGIN] Éxito: Login completado para ${email}. Enviando respuesta.`);
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('[AUTH-LOGIN] ERROR CRÍTICO durante el inicio de sesión:');
    console.error(error.message || error);
    console.error(error.stack); // Imprime la traza completa para Render
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
};