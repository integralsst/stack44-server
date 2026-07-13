import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no está configurado.");
  }

  return secret;
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
}

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);
    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!name || !email || !password) {
      res.status(400).json({
        error: "Nombre, correo y contraseña son obligatorios.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: "La contraseña debe tener mínimo 8 caracteres.",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      res.status(409).json({
        error: "El correo ya está registrado.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER",
        companyId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Usuario creado exitosamente.",
      user,
    });
  } catch (error) {
    console.error("[AUTH-REGISTER]", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: "El correo ya está registrado.",
      });
      return;
    }

    res.status(500).json({
      error: "Error interno del servidor al registrar.",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const email = normalizeEmail(req.body.email);

    const password =
      typeof req.body.password === "string"
        ? req.body.password
        : "";

    if (!email || !password) {
      res.status(400).json({
        error: "Correo y contraseña son obligatorios.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            taxId: true,
            isActive: true,
          },
        },
        professional: {
          select: {
            id: true,
            firstNames: true,
            lastNames: true,
            professionalRole: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        error: "Credenciales inválidas.",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: "Tu cuenta se encuentra inactiva.",
      });
      return;
    }

    if (user.company && !user.company.isActive) {
      res.status(403).json({
        error: "La empresa asociada se encuentra inactiva.",
      });
      return;
    }

    if (user.professional && !user.professional.isActive) {
      res.status(403).json({
        error: "El perfil profesional se encuentra inactivo.",
      });
      return;
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      res.status(401).json({
        error: "Credenciales inválidas.",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        professionalId: user.professional?.id ?? null,
      },
      getJwtSecret(),
      {
        expiresIn: "24h",
      }
    );

    res.json({
      message: "Login exitoso.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        professionalId: user.professional?.id ?? null,
        company: user.company,
        professional: user.professional,
      },
    });
  } catch (error) {
    console.error("[AUTH-LOGIN]", error);

    res.status(500).json({
      error: "Error interno del servidor al iniciar sesión.",
    });
  }
};

export const getMe = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "No autenticado.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            taxId: true,
            isActive: true,
          },
        },
        professional: {
          select: {
            id: true,
            firstNames: true,
            lastNames: true,
            identificationNumber: true,
            professionalRole: true,
            profession: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        error: "Usuario no encontrado.",
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("[AUTH-ME]", error);

    res.status(500).json({
      error: "Error al consultar la sesión.",
    });
  }
};