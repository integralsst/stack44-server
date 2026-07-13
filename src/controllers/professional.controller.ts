import { Request, Response } from "express";
import {
  IdentificationType,
  Prisma,
  Role,
} from "@prisma/client";

import { prisma } from "../lib/prisma";
import { isInternalRole } from "../utils/access";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const normalizedValue = normalizeString(value);
  return normalizedValue || null;
}

function normalizeEmail(value: unknown): string {
  const email = normalizeString(value).toLowerCase();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new ValidationError(
      "El correo electrónico no es válido."
    );
  }

  return email;
}

function nullableDate(value: unknown): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("La fecha no es válida.");
  }

  return date;
}

const professionalSelect = {
  id: true,
  identificationType: true,
  identificationNumber: true,
  firstNames: true,
  lastNames: true,
  position: true,
  profession: true,
  professionalRole: true,
  email: true,
  phone: true,
  address: true,
  isActive: true,
  userId: true,
  createdAt: true,
  updatedAt: true,

  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  },

  companyAssignments: {
    include: {
      company: {
        select: {
          id: true,
          name: true,
          taxId: true,
          mainCity: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.ProfessionalSelect;

async function validateUserForProfessional(
  userId: string,
  professionalId?: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      professional: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    return {
      valid: false,
      error: "El usuario seleccionado no existe.",
    };
  }

  if (user.role !== Role.PROFESSIONAL) {
    return {
      valid: false,
      error:
        "El usuario seleccionado debe tener rol PROFESSIONAL.",
    };
  }

  if (
    user.professional &&
    user.professional.id !== professionalId
  ) {
    return {
      valid: false,
      error:
        "El usuario ya está relacionado con otro profesional.",
    };
  }

  return {
    valid: true,
  };
}

export const professionalController = {
  // ====================================================
  // OBTENER TODOS LOS PROFESIONALES
  // ====================================================

  getAll: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const search = normalizeString(req.query.search);
      const companyId = normalizeString(
        req.query.companyId
      );

      const includeInactive =
        req.query.includeInactive === "true";

      const where: Prisma.ProfessionalWhereInput = {};

      if (!includeInactive) {
        where.isActive = true;
      }

      if (companyId) {
        where.companyAssignments = {
          some: {
            companyId,
            isActive: true,
          },
        };
      }

      if (search) {
        where.OR = [
          {
            firstNames: {
              contains: search,
            },
          },
          {
            lastNames: {
              contains: search,
            },
          },
          {
            identificationNumber: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
          {
            profession: {
              contains: search,
            },
          },
          {
            professionalRole: {
              contains: search,
            },
          },
        ];
      }

      const professionals =
        await prisma.professional.findMany({
          where,
          select: professionalSelect,
          orderBy: [
            {
              lastNames: "asc",
            },
            {
              firstNames: "asc",
            },
          ],
        });

      res.json(professionals);
    } catch (error) {
      console.error(
        "[PROFESSIONAL-GET-ALL]",
        error
      );

      res.status(500).json({
        error: "Error al obtener profesionales.",
      });
    }
  },

  // ====================================================
  // OBTENER PERFIL DEL PROFESIONAL AUTENTICADO
  // ====================================================

  getMe: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user?.professionalId) {
        res.status(404).json({
          error:
            "El usuario no tiene un perfil profesional relacionado.",
        });
        return;
      }

      const professional =
        await prisma.professional.findUnique({
          where: {
            id: req.user.professionalId,
          },
          select: professionalSelect,
        });

      if (!professional) {
        res.status(404).json({
          error: "Perfil profesional no encontrado.",
        });
        return;
      }

      res.json(professional);
    } catch (error) {
      console.error("[PROFESSIONAL-ME]", error);

      res.status(500).json({
        error:
          "Error al consultar el perfil profesional.",
      });
    }
  },

  // ====================================================
  // OBTENER PROFESIONAL POR ID
  // ====================================================

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

      const hasAccess =
        isInternalRole(req.user.role) ||
        req.user.professionalId === id;

      if (!hasAccess) {
        res.status(403).json({
          error:
            "No tienes acceso a este perfil profesional.",
        });
        return;
      }

      const professional =
        await prisma.professional.findUnique({
          where: {
            id,
          },
          select: professionalSelect,
        });

      if (!professional) {
        res.status(404).json({
          error: "Profesional no encontrado.",
        });
        return;
      }

      res.json(professional);
    } catch (error) {
      console.error(
        "[PROFESSIONAL-GET-BY-ID]",
        error
      );

      res.status(500).json({
        error: "Error al obtener el profesional.",
      });
    }
  },

  // ====================================================
  // CREAR PROFESIONAL
  // ====================================================

  create: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const identificationType =
        req.body
          .identificationType as IdentificationType;

      const identificationNumber = normalizeString(
        req.body.identificationNumber
      );

      const firstNames = normalizeString(
        req.body.firstNames
      );

      const lastNames = normalizeString(
        req.body.lastNames
      );

      const email = normalizeEmail(req.body.email);

      const userId =
        normalizeString(req.body.userId) || null;

      if (
        !Object.values(IdentificationType).includes(
          identificationType
        )
      ) {
        throw new ValidationError(
          "El tipo de identificación no es válido."
        );
      }

      if (!identificationNumber) {
        throw new ValidationError(
          "El número de identificación es obligatorio."
        );
      }

      if (!firstNames) {
        throw new ValidationError(
          "Los nombres son obligatorios."
        );
      }

      if (!lastNames) {
        throw new ValidationError(
          "Los apellidos son obligatorios."
        );
      }

      if (!email) {
        throw new ValidationError(
          "El correo electrónico es obligatorio."
        );
      }

      if (userId) {
        const validation =
          await validateUserForProfessional(userId);

        if (!validation.valid) {
          throw new ValidationError(
            validation.error ?? "Usuario no válido."
          );
        }
      }

      const professional =
        await prisma.professional.create({
          data: {
            identificationType,
            identificationNumber,
            firstNames,
            lastNames,

            position: nullableString(
              req.body.position
            ),

            profession: nullableString(
              req.body.profession
            ),

            professionalRole: nullableString(
              req.body.professionalRole
            ),

            email,

            phone: nullableString(req.body.phone),

            address: nullableString(
              req.body.address
            ),

            userId,

            isActive:
              typeof req.body.isActive === "boolean"
                ? req.body.isActive
                : true,
          },
          select: professionalSelect,
        });

      res.status(201).json(professional);
    } catch (error) {
      console.error(
        "[PROFESSIONAL-CREATE]",
        error
      );

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "Ya existe un profesional con esa identificación, correo o usuario.",
        });
        return;
      }

      res.status(500).json({
        error: "Error al crear el profesional.",
      });
    }
  },

  // ====================================================
  // ACTUALIZAR PROFESIONAL
  // ====================================================

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

      const current =
        await prisma.professional.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            userId: true,
          },
        });

      if (!current) {
        res.status(404).json({
          error: "Profesional no encontrado.",
        });
        return;
      }

      const isInternal = isInternalRole(
        req.user.role
      );

      const isOwnProfile =
        req.user.professionalId === id;

      if (!isInternal && !isOwnProfile) {
        res.status(403).json({
          error:
            "No tienes permiso para editar este profesional.",
        });
        return;
      }

      const data: Prisma.ProfessionalUncheckedUpdateInput =
        {};

      // Nombres: campo obligatorio, nunca puede recibir null.
      if (req.body.firstNames !== undefined) {
        const firstNames = normalizeString(
          req.body.firstNames
        );

        if (!firstNames) {
          throw new ValidationError(
            "Los nombres no pueden estar vacíos."
          );
        }

        data.firstNames = firstNames;
      }

      // Apellidos: campo obligatorio, nunca puede recibir null.
      if (req.body.lastNames !== undefined) {
        const lastNames = normalizeString(
          req.body.lastNames
        );

        if (!lastNames) {
          throw new ValidationError(
            "Los apellidos no pueden estar vacíos."
          );
        }

        data.lastNames = lastNames;
      }

      // Celular: campo opcional, puede ser string o null.
      if (req.body.phone !== undefined) {
        data.phone = nullableString(req.body.phone);
      }

      // Dirección: campo opcional, puede ser string o null.
      if (req.body.address !== undefined) {
        data.address = nullableString(
          req.body.address
        );
      }

      // Correo: campo obligatorio.
      if (req.body.email !== undefined) {
        const email = normalizeEmail(
          req.body.email
        );

        if (!email) {
          throw new ValidationError(
            "El correo no puede estar vacío."
          );
        }

        data.email = email;
      }

      // Estos campos solo pueden ser modificados
      // por administradores internos.
      if (isInternal) {
        if (
          req.body.identificationType !== undefined
        ) {
          const identificationType =
            req.body
              .identificationType as IdentificationType;

          if (
            !Object.values(
              IdentificationType
            ).includes(identificationType)
          ) {
            throw new ValidationError(
              "Tipo de identificación inválido."
            );
          }

          data.identificationType =
            identificationType;
        }

        if (
          req.body.identificationNumber !== undefined
        ) {
          const identificationNumber =
            normalizeString(
              req.body.identificationNumber
            );

          if (!identificationNumber) {
            throw new ValidationError(
              "El número de identificación no puede estar vacío."
            );
          }

          data.identificationNumber =
            identificationNumber;
        }

        if (req.body.position !== undefined) {
          data.position = nullableString(
            req.body.position
          );
        }

        if (req.body.profession !== undefined) {
          data.profession = nullableString(
            req.body.profession
          );
        }

        if (
          req.body.professionalRole !== undefined
        ) {
          data.professionalRole = nullableString(
            req.body.professionalRole
          );
        }

        if (
          typeof req.body.isActive === "boolean"
        ) {
          data.isActive = req.body.isActive;
        }

        if (req.body.userId !== undefined) {
          const userId =
            normalizeString(req.body.userId) ||
            null;

          if (userId) {
            const validation =
              await validateUserForProfessional(
                userId,
                id
              );

            if (!validation.valid) {
              throw new ValidationError(
                validation.error ??
                  "Usuario no válido."
              );
            }
          }

          data.userId = userId;
        }
      }

      const professional =
        await prisma.professional.update({
          where: {
            id,
          },
          data,
          select: professionalSelect,
        });

      res.json(professional);
    } catch (error) {
      console.error(
        "[PROFESSIONAL-UPDATE]",
        error
      );

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          res.status(409).json({
            error:
              "La identificación, el correo o el usuario ya están en uso.",
          });
          return;
        }

        if (error.code === "P2025") {
          res.status(404).json({
            error: "Profesional no encontrado.",
          });
          return;
        }
      }

      res.status(500).json({
        error:
          "Error al actualizar el profesional.",
      });
    }
  },

  // ====================================================
  // DESACTIVAR PROFESIONAL
  // ====================================================

  delete: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const professional =
        await prisma.professional.update({
          where: {
            id,
          },
          data: {
            isActive: false,
          },
          select: professionalSelect,
        });

      res.json({
        message:
          "Profesional desactivado correctamente.",
        professional,
      });
    } catch (error) {
      console.error(
        "[PROFESSIONAL-DELETE]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error: "Profesional no encontrado.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al desactivar el profesional.",
      });
    }
  },

  // ====================================================
  // ASIGNAR EMPRESA AL PROFESIONAL
  // ====================================================

  assignCompany: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const professionalId = String(
        req.params.id
      );

      const companyId = normalizeString(
        req.body.companyId
      );

      if (!companyId) {
        throw new ValidationError(
          "Debes seleccionar una empresa."
        );
      }

      const [professional, company] =
        await Promise.all([
          prisma.professional.findFirst({
            where: {
              id: professionalId,
              isActive: true,
            },
            select: {
              id: true,
            },
          }),

          prisma.company.findFirst({
            where: {
              id: companyId,
              isActive: true,
            },
            select: {
              id: true,
            },
          }),
        ]);

      if (!professional) {
        throw new ValidationError(
          "El profesional no existe o está inactivo."
        );
      }

      if (!company) {
        throw new ValidationError(
          "La empresa no existe o está inactiva."
        );
      }

      const startDate = nullableDate(
        req.body.startDate
      );

      const endDate = nullableDate(
        req.body.endDate
      );

      if (
        startDate &&
        endDate &&
        endDate < startDate
      ) {
        throw new ValidationError(
          "La fecha final no puede ser anterior a la fecha inicial."
        );
      }

      const assignment =
        await prisma.companyProfessional.upsert({
          where: {
            companyId_professionalId: {
              companyId,
              professionalId,
            },
          },

          update: {
            assignmentRole: nullableString(
              req.body.assignmentRole
            ),
            startDate,
            endDate,
            isActive: true,
          },

          create: {
            companyId,
            professionalId,
            assignmentRole: nullableString(
              req.body.assignmentRole
            ),
            startDate,
            endDate,
            isActive: true,
          },

          include: {
            company: true,
            professional: true,
          },
        });

      res.status(201).json(assignment);
    } catch (error) {
      console.error(
        "[PROFESSIONAL-ASSIGN-COMPANY]",
        error
      );

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al asignar el profesional a la empresa.",
      });
    }
  },

  // ====================================================
  // DESACTIVAR ASIGNACIÓN CON EMPRESA
  // ====================================================

  removeCompanyAssignment: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const professionalId = String(
        req.params.id
      );

      const companyId = String(
        req.params.companyId
      );

      const assignment =
        await prisma.companyProfessional.update({
          where: {
            companyId_professionalId: {
              companyId,
              professionalId,
            },
          },

          data: {
            isActive: false,
            endDate: new Date(),
          },
        });

      res.json({
        message:
          "Asignación desactivada correctamente.",
        assignment,
      });
    } catch (error) {
      console.error(
        "[PROFESSIONAL-REMOVE-COMPANY]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error: "Asignación no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al desactivar la asignación.",
      });
    }
  },
};