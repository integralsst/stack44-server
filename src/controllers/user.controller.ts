import { Request, Response } from "express";
import {
  Prisma,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";
import {
  canAssignRole,
  canManageTargetRole,
  isClientRole,
  isInternalRole,
} from "../utils/access";

const publicUserSelect = {
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
      profession: true,
      professionalRole: true,
      isActive: true,
    },
  },
} satisfies Prisma.UserSelect;

function normalizeEmail(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseRole(value: unknown): Role | null {
  return Object.values(Role).includes(value as Role)
    ? (value as Role)
    : null;
}

async function validateCompany(
  companyId: string
): Promise<boolean> {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return Boolean(company);
}

async function validateProfessional(
  professionalId: string,
  currentUserId?: string
) {
  const professional =
    await prisma.professional.findUnique({
      where: {
        id: professionalId,
      },
      select: {
        id: true,
        isActive: true,
        userId: true,
      },
    });

  if (!professional || !professional.isActive) {
    return {
      valid: false,
      error:
        "El perfil profesional no existe o está inactivo.",
    };
  }

  if (
    professional.userId &&
    professional.userId !== currentUserId
  ) {
    return {
      valid: false,
      error:
        "El profesional ya está relacionado con otro usuario.",
    };
  }

  return {
    valid: true,
    professional,
  };
}

function canManageUser(
  actor: Express.AuthenticatedUser,
  target: {
    id: string;
    role: Role;
    companyId: string | null;
  }
): boolean {
  if (actor.userId === target.id) {
    return true;
  }

  if (actor.role === Role.CLIENT_ADMIN) {
    return (
      target.companyId === actor.companyId &&
      target.role === Role.CLIENT_USER
    );
  }

  return (
    isInternalRole(actor.role) &&
    canManageTargetRole(actor.role, target.role)
  );
}

export const userController = {
  getAll: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const search = normalizeString(req.query.search);
      const includeInactive =
        req.query.includeInactive === "true";

      const where: Prisma.UserWhereInput = {};

      if (req.user.role === Role.CLIENT_ADMIN) {
        where.companyId = req.user.companyId;
      } else if (!isInternalRole(req.user.role)) {
        where.id = req.user.userId;
      }

      if (!includeInactive) {
        where.isActive = true;
      }

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(users);
    } catch (error) {
      console.error("[USER-GET-ALL]", error);

      res.status(500).json({
        error: "Error al obtener usuarios.",
      });
    }
  },

  getById: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      const target = await prisma.user.findUnique({
        where: {
          id,
        },
        select: publicUserSelect,
      });

      if (!target) {
        res.status(404).json({
          error: "Usuario no encontrado.",
        });
        return;
      }

      if (!canManageUser(req.user, target)) {
        res.status(403).json({
          error: "No tienes acceso a este usuario.",
        });
        return;
      }

      res.json(target);
    } catch (error) {
      console.error("[USER-GET-BY-ID]", error);

      res.status(500).json({
        error: "Error al consultar el usuario.",
      });
    }
  },

  create: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const name = normalizeString(req.body.name);
      const email = normalizeEmail(req.body.email);
      const password =
        typeof req.body.password === "string"
          ? req.body.password
          : "";

      let role = parseRole(req.body.role) ?? Role.USER;
      let companyId: string | null =
        normalizeString(req.body.companyId) || null;

      const professionalId =
        normalizeString(req.body.professionalId) || null;

      if (!name || !email || !password) {
        res.status(400).json({
          error:
            "Nombre, correo y contraseña son obligatorios.",
        });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({
          error:
            "La contraseña debe tener mínimo 8 caracteres.",
        });
        return;
      }

      if (req.user.role === Role.CLIENT_ADMIN) {
        role = Role.CLIENT_USER;
        companyId = req.user.companyId;
      } else if (
        !canAssignRole(req.user.role, role)
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para asignar ese rol.",
        });
        return;
      }

      if (isClientRole(role)) {
        if (!companyId) {
          res.status(400).json({
            error:
              "Los usuarios cliente deben pertenecer a una empresa.",
          });
          return;
        }

        if (!(await validateCompany(companyId))) {
          res.status(400).json({
            error:
              "La empresa seleccionada no existe o está inactiva.",
          });
          return;
        }
      }

      if (role === Role.PROFESSIONAL) {
        companyId = null;

        if (!professionalId) {
          res.status(400).json({
            error:
              "Debes seleccionar un perfil profesional.",
          });
          return;
        }

        const validation =
          await validateProfessional(professionalId);

        if (!validation.valid) {
          res.status(400).json({
            error: validation.error,
          });
          return;
        }
      } else if (
        companyId &&
        !(await validateCompany(companyId))
      ) {
        res.status(400).json({
          error:
            "La empresa seleccionada no existe o está inactiva.",
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      const createdUser =
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              role,
              companyId,
              isActive:
                typeof req.body.isActive === "boolean"
                  ? req.body.isActive
                  : true,
            },
          });

          if (
            role === Role.PROFESSIONAL &&
            professionalId
          ) {
            await tx.professional.update({
              where: {
                id: professionalId,
              },
              data: {
                userId: user.id,
              },
            });
          }

          return tx.user.findUniqueOrThrow({
            where: {
              id: user.id,
            },
            select: publicUserSelect,
          });
        });

      res.status(201).json(createdUser);
    } catch (error) {
      console.error("[USER-CREATE]", error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "El correo ya está en uso o el profesional ya tiene un usuario.",
        });
        return;
      }

      res.status(500).json({
        error: "Error al crear usuario.",
      });
    }
  },

  update: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      const target = await prisma.user.findUnique({
        where: {
          id,
        },
        include: {
          professional: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!target) {
        res.status(404).json({
          error: "Usuario no encontrado.",
        });
        return;
      }

      if (!canManageUser(req.user, target)) {
        res.status(403).json({
          error:
            "No tienes permiso para editar este usuario.",
        });
        return;
      }

      const isSelf = req.user.userId === target.id;

      const finalRole =
        parseRole(req.body.role) ?? target.role;

      let finalCompanyId =
        req.body.companyId !== undefined
          ? normalizeString(req.body.companyId) || null
          : target.companyId;

      const requestedProfessionalId =
        req.body.professionalId !== undefined
          ? normalizeString(req.body.professionalId) || null
          : target.professional?.id ?? null;

      if (!isSelf) {
        if (
          req.user.role === Role.CLIENT_ADMIN &&
          finalRole !== Role.CLIENT_USER
        ) {
          res.status(403).json({
            error:
              "Un administrador cliente solo puede gestionar usuarios CLIENT_USER.",
          });
          return;
        }

        if (
          req.user.role !== Role.CLIENT_ADMIN &&
          !canAssignRole(req.user.role, finalRole)
        ) {
          res.status(403).json({
            error:
              "No tienes permiso para asignar ese rol.",
          });
          return;
        }
      }

      if (
        isSelf &&
        (req.body.role !== undefined ||
          req.body.companyId !== undefined ||
          req.body.isActive !== undefined ||
          req.body.professionalId !== undefined)
      ) {
        res.status(403).json({
          error:
            "No puedes cambiar tu propio rol, empresa, estado o perfil profesional.",
        });
        return;
      }

      if (req.user.role === Role.CLIENT_ADMIN) {
        finalCompanyId = req.user.companyId;
      }

      if (isClientRole(finalRole)) {
        if (!finalCompanyId) {
          res.status(400).json({
            error:
              "Los usuarios cliente deben pertenecer a una empresa.",
          });
          return;
        }

        if (!(await validateCompany(finalCompanyId))) {
          res.status(400).json({
            error:
              "La empresa seleccionada no existe o está inactiva.",
          });
          return;
        }
      }

      if (finalRole === Role.PROFESSIONAL) {
        finalCompanyId = null;

        if (!requestedProfessionalId) {
          res.status(400).json({
            error:
              "Debes seleccionar un perfil profesional.",
          });
          return;
        }

        const validation =
          await validateProfessional(
            requestedProfessionalId,
            target.id
          );

        if (!validation.valid) {
          res.status(400).json({
            error: validation.error,
          });
          return;
        }
      } else if (
        finalCompanyId &&
        !(await validateCompany(finalCompanyId))
      ) {
        res.status(400).json({
          error:
            "La empresa seleccionada no existe o está inactiva.",
        });
        return;
      }

      const updateData: Prisma.UserUncheckedUpdateInput =
        {};

      if (req.body.name !== undefined) {
        const name = normalizeString(req.body.name);

        if (!name) {
          res.status(400).json({
            error: "El nombre no puede estar vacío.",
          });
          return;
        }

        updateData.name = name;
      }

      if (req.body.email !== undefined) {
        const email = normalizeEmail(req.body.email);

        if (!email) {
          res.status(400).json({
            error: "El correo no puede estar vacío.",
          });
          return;
        }

        updateData.email = email;
      }

      if (
        typeof req.body.password === "string" &&
        req.body.password.trim()
      ) {
        if (req.body.password.length < 8) {
          res.status(400).json({
            error:
              "La contraseña debe tener mínimo 8 caracteres.",
          });
          return;
        }

        updateData.password = await bcrypt.hash(
          req.body.password,
          10
        );
      }

      if (!isSelf) {
        updateData.role = finalRole;
        updateData.companyId = finalCompanyId;

        if (typeof req.body.isActive === "boolean") {
          updateData.isActive = req.body.isActive;
        }
      }

      const updatedUser =
        await prisma.$transaction(async (tx) => {
          if (
            target.professional &&
            (finalRole !== Role.PROFESSIONAL ||
              requestedProfessionalId !==
                target.professional.id)
          ) {
            await tx.professional.update({
              where: {
                id: target.professional.id,
              },
              data: {
                userId: null,
              },
            });
          }

          await tx.user.update({
            where: {
              id,
            },
            data: updateData,
          });

          if (
            finalRole === Role.PROFESSIONAL &&
            requestedProfessionalId
          ) {
            await tx.professional.update({
              where: {
                id: requestedProfessionalId,
              },
              data: {
                userId: id,
              },
            });
          }

          return tx.user.findUniqueOrThrow({
            where: {
              id,
            },
            select: publicUserSelect,
          });
        });

      res.json(updatedUser);
    } catch (error) {
      console.error("[USER-UPDATE]", error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "El correo ya está en uso o el profesional ya tiene un usuario.",
        });
        return;
      }

      res.status(500).json({
        error: "Error al actualizar usuario.",
      });
    }
  },

  delete: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      if (id === req.user.userId) {
        res.status(400).json({
          error: "No puedes eliminar tu propia cuenta.",
        });
        return;
      }

      const target = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!target) {
        res.status(404).json({
          error: "Usuario no encontrado.",
        });
        return;
      }

      if (!canManageUser(req.user, target)) {
        res.status(403).json({
          error:
            "No tienes permiso para eliminar este usuario.",
        });
        return;
      }

      if (target.role === Role.SUPERADMIN) {
        const superadminCount = await prisma.user.count({
          where: {
            role: Role.SUPERADMIN,
            isActive: true,
          },
        });

        if (superadminCount <= 1) {
          res.status(400).json({
            error:
              "No puedes eliminar el último SUPERADMIN activo.",
          });
          return;
        }
      }

      await prisma.user.delete({
        where: {
          id,
        },
      });

      res.json({
        message: "Usuario eliminado correctamente.",
      });
    } catch (error) {
      console.error("[USER-DELETE]", error);

      res.status(500).json({
        error: "Error al eliminar usuario.",
      });
    }
  },
};