import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";

interface AccessTokenPayload extends JwtPayload {
  userId: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no está configurado.");
  }

  return secret;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Token de autenticación no proporcionado.",
      });
      return;
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as AccessTokenPayload;

    if (!decoded.userId) {
      res.status(401).json({
        error: "Token inválido.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        professional: {
          select: {
            id: true,
            isActive: true,
          },
        },
        company: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        error: "El usuario asociado al token no existe.",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: "Tu cuenta está inactiva.",
      });
      return;
    }

    if (
      (user.role === Role.CLIENT_ADMIN ||
        user.role === Role.CLIENT_USER) &&
      user.company &&
      !user.company.isActive
    ) {
      res.status(403).json({
        error: "La empresa asociada a tu cuenta está inactiva.",
      });
      return;
    }

    if (
      user.role === Role.PROFESSIONAL &&
      user.professional &&
      !user.professional.isActive
    ) {
      res.status(403).json({
        error: "El perfil profesional está inactivo.",
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      professionalId: user.professional?.id ?? null,
    };

    next();
  } catch (error) {
    console.error("[AUTH-MIDDLEWARE]", error);

    res.status(401).json({
      error: "Token inválido o vencido.",
    });
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: "No autenticado.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "No tienes permisos para realizar esta acción.",
      });
      return;
    }

    next();
  };
};