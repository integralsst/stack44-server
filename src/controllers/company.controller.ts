import { Request, Response } from "express";
import {
  Prisma,
  RiskClass,
  Role,
} from "@prisma/client";

import { prisma } from "../lib/prisma";
import { isInternalRole } from "../utils/access";

class ValidationError extends Error {}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

function nullableEmail(value: unknown): string | null {
  const email = nullableString(value);

  if (!email) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(`Correo inválido: ${email}`);
  }

  return email.toLowerCase();
}

function nullableDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("La fecha proporcionada no es válida.");
  }

  return date;
}

function nonNegativeInteger(
  value: unknown,
  fieldName: string
): number {
  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 0
  ) {
    throw new ValidationError(
      `${fieldName} debe ser un número entero mayor o igual a cero.`
    );
  }

  return numberValue;
}

function buildCompanyData(
  body: Record<string, unknown>,
  partial = false
): Prisma.CompanyUncheckedUpdateInput {
  const data: Prisma.CompanyUncheckedUpdateInput = {};

  if (!partial || body.name !== undefined) {
    const name = normalizeString(body.name);

    if (!name) {
      throw new ValidationError(
        "La razón social es obligatoria."
      );
    }

    data.name = name;
  }

  if (!partial || body.taxId !== undefined) {
    const taxId = normalizeString(body.taxId);

    if (!taxId) {
      throw new ValidationError("El NIT es obligatorio.");
    }

    data.taxId = taxId;
  }

  const stringFields = [
    "mainAddress",
    "mainCity",
    "economicActivityCode",
    "economicActivityDescription",
    "companyDescription",
    "managerName",
    "sstContactName",
  ] as const;

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      data[field] = nullableString(body[field]);
    }
  }

  const emailFields = [
    "companyEmail",
    "managerEmail",
    "sstContactEmail",
  ] as const;

  for (const field of emailFields) {
    if (body[field] !== undefined) {
      data[field] = nullableEmail(body[field]);
    }
  }

  if (body.startDate !== undefined) {
    data.startDate = nullableDate(body.startDate);
  }

  if (body.mainRiskClass !== undefined) {
    if (
      body.mainRiskClass === null ||
      body.mainRiskClass === ""
    ) {
      data.mainRiskClass = null;
    } else if (
      Object.values(RiskClass).includes(
        body.mainRiskClass as RiskClass
      )
    ) {
      data.mainRiskClass =
        body.mainRiskClass as RiskClass;
    } else {
      throw new ValidationError(
        "La clase de riesgo debe ser I, II, III, IV o V."
      );
    }
  }

  if (body.agreedSstVisits !== undefined) {
    data.agreedSstVisits = nonNegativeInteger(
      body.agreedSstVisits,
      "Las visitas SST"
    );
  }

  if (body.agreedEmergencyVisits !== undefined) {
    data.agreedEmergencyVisits = nonNegativeInteger(
      body.agreedEmergencyVisits,
      "Las visitas de emergencias"
    );
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError(
        "El estado de la empresa debe ser verdadero o falso."
      );
    }

    data.isActive = body.isActive;
  }

  return data;
}

async function canAccessCompany(
  user: Express.AuthenticatedUser,
  companyId: string
): Promise<boolean> {
  if (isInternalRole(user.role)) {
    return true;
  }

  if (user.companyId === companyId) {
    return true;
  }

  if (
    user.role === Role.PROFESSIONAL &&
    user.professionalId
  ) {
    const assignment =
      await prisma.companyProfessional.findFirst({
        where: {
          companyId,
          professionalId: user.professionalId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

    return Boolean(assignment);
  }

  return false;
}

export const companyController = {
  create: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const data = buildCompanyData(req.body, false);

      const company = await prisma.company.create({
        data: data as Prisma.CompanyUncheckedCreateInput,
      });

      res.status(201).json(company);
    } catch (error) {
      console.error("[COMPANY-CREATE]", error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error: "Ya existe una empresa con ese NIT.",
        });
        return;
      }

      res.status(500).json({
        error: "Error al crear la empresa.",
      });
    }
  },

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

      const filters: Prisma.CompanyWhereInput[] = [];

      if (!isInternalRole(req.user.role)) {
        filters.push({
          isActive: true,
        });
      } else if (!includeInactive) {
        filters.push({
          isActive: true,
        });
      }

      if (search) {
        filters.push({
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              taxId: {
                contains: search,
              },
            },
            {
              mainCity: {
                contains: search,
              },
            },
          ],
        });
      }

      if (!isInternalRole(req.user.role)) {
        if (
          req.user.role === Role.PROFESSIONAL &&
          req.user.professionalId
        ) {
          filters.push({
            professionalAssignments: {
              some: {
                professionalId:
                  req.user.professionalId,
                isActive: true,
              },
            },
          });
        } else if (req.user.companyId) {
          filters.push({
            id: req.user.companyId,
          });
        } else {
          filters.push({
            id: "__NO_COMPANY__",
          });
        }
      }

      const companies = await prisma.company.findMany({
        where: {
          AND: filters,
        },
        include: {
          _count: {
            select: {
              users: true,
              professionalAssignments: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json(companies);
    } catch (error) {
      console.error("[COMPANY-GET-ALL]", error);

      res.status(500).json({
        error: "Error al obtener las empresas.",
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

      const allowed = await canAccessCompany(
        req.user,
        id
      );

      if (!allowed) {
        res.status(403).json({
          error:
            "No tienes acceso a esta empresa.",
        });
        return;
      }

      const company = await prisma.company.findUnique({
        where: {
          id,
        },
        include: {
          professionalAssignments: {
            where: {
              isActive: true,
            },
            include: {
              professional: {
                select: {
                  id: true,
                  firstNames: true,
                  lastNames: true,
                  email: true,
                  phone: true,
                  profession: true,
                  professionalRole: true,
                  isActive: true,
                },
              },
            },
          },
          _count: {
            select: {
              users: true,
              professionalAssignments: true,
            },
          },
        },
      });

      if (!company) {
        res.status(404).json({
          error: "Empresa no encontrada.",
        });
        return;
      }

      res.json(company);
    } catch (error) {
      console.error("[COMPANY-GET-BY-ID]", error);

      res.status(500).json({
        error: "Error al obtener la empresa.",
      });
    }
  },

  update: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = buildCompanyData(req.body, true);

      const company = await prisma.company.update({
        where: {
          id,
        },
        data,
      });

      res.json(company);
    } catch (error) {
      console.error("[COMPANY-UPDATE]", error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          res.status(409).json({
            error: "Ya existe una empresa con ese NIT.",
          });
          return;
        }

        if (error.code === "P2025") {
          res.status(404).json({
            error: "Empresa no encontrada.",
          });
          return;
        }
      }

      res.status(500).json({
        error: "Error al actualizar la empresa.",
      });
    }
  },

  delete: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const company = await prisma.company.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });

      res.json({
        message: "Empresa desactivada correctamente.",
        company,
      });
    } catch (error) {
      console.error("[COMPANY-DELETE]", error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error: "Empresa no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error: "Error al desactivar la empresa.",
      });
    }
  },
};