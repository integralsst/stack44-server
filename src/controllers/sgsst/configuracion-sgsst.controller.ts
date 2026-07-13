import {
  Request,
  Response,
} from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  puedeAccederEmpresa,
  puedeGestionarEmpresaSgsst,
} from "../../utils/sgsst-access";

class ErrorValidacion extends Error {}

function fecha(
  value: unknown,
  obligatoria = false
): Date | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (obligatoria) {
      throw new ErrorValidacion(
        "La fecha de vigencia es obligatoria."
      );
    }

    return null;
  }

  const resultado = new Date(
    String(value)
  );

  if (
    Number.isNaN(resultado.getTime())
  ) {
    throw new ErrorValidacion(
      "La fecha proporcionada no es válida."
    );
  }

  return resultado;
}

function textoOpcional(
  value: unknown
): string | null {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

const incluirConfiguracion = {
  empresa: {
    select: {
      id: true,
      nit: true,
      nombre: true,
      activo: true,
    },
  },
  marco: true,
  perfilAplicabilidad: true,
  creadoPorUsuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
  _count: {
    select: {
      evaluaciones: true,
    },
  },
} satisfies Prisma.ConfiguracionSgsstEmpresaInclude;

export const controladorConfiguracionSgsst = {
  obtenerPorEmpresa: async (
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

      const empresaId = String(
        req.params.empresaId
      );

      if (
        !(await puedeAccederEmpresa(
          req.user,
          empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes acceso a esta empresa.",
        });
        return;
      }

      const configuraciones =
        await prisma.configuracionSgsstEmpresa.findMany({
          where: { empresaId },
          include: incluirConfiguracion,
          orderBy: {
            vigenteDesde: "desc",
          },
        });

      res.json(configuraciones);
    } catch (error) {
      console.error(
        "[CONFIGURACION-SGSST-LISTAR]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar la configuración SG-SST.",
      });
    }
  },

  obtenerActiva: async (
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

      const empresaId = String(
        req.params.empresaId
      );

      if (
        !(await puedeAccederEmpresa(
          req.user,
          empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes acceso a esta empresa.",
        });
        return;
      }

      const configuracion =
        await prisma.configuracionSgsstEmpresa.findFirst({
          where: {
            empresaId,
            activo: true,
          },
          include: incluirConfiguracion,
          orderBy: {
            vigenteDesde: "desc",
          },
        });

      if (!configuracion) {
        res.status(404).json({
          error:
            "La empresa todavía no tiene una configuración SG-SST activa.",
        });
        return;
      }

      res.json(configuracion);
    } catch (error) {
      console.error(
        "[CONFIGURACION-SGSST-ACTIVA]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar la configuración activa.",
      });
    }
  },

  crear: async (
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

      const empresaId = String(
        req.params.empresaId
      );

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para configurar el SG-SST de esta empresa.",
        });
        return;
      }

      const marcoId =
        typeof req.body.marcoId ===
        "string"
          ? req.body.marcoId.trim()
          : "";

      const perfilAplicabilidadId =
        typeof req.body
          .perfilAplicabilidadId ===
        "string"
          ? req.body.perfilAplicabilidadId.trim()
          : "";

      if (
        !marcoId ||
        !perfilAplicabilidadId
      ) {
        throw new ErrorValidacion(
          "El marco y el perfil de aplicabilidad son obligatorios."
        );
      }

      const vigenteDesde = fecha(
        req.body.vigenteDesde,
        true
      ) as Date;

      const vigenteHasta = fecha(
        req.body.vigenteHasta
      );

      if (
        vigenteHasta &&
        vigenteHasta < vigenteDesde
      ) {
        throw new ErrorValidacion(
          "La fecha final no puede ser anterior a la fecha inicial."
        );
      }

      const [empresa, perfil] =
        await Promise.all([
          prisma.empresa.findFirst({
            where: {
              id: empresaId,
              activo: true,
            },
            select: { id: true },
          }),
          prisma.perfilAplicabilidad.findFirst({
            where: {
              id: perfilAplicabilidadId,
              marcoId,
              activo: true,
              marco: { activo: true },
            },
            select: { id: true },
          }),
        ]);

      if (!empresa) {
        throw new ErrorValidacion(
          "La empresa no existe o está inactiva."
        );
      }

      if (!perfil) {
        throw new ErrorValidacion(
          "El perfil no pertenece al marco seleccionado o está inactivo."
        );
      }

      const usuarioId =
        req.user.usuarioId;

      const configuracion =
        await prisma.$transaction(
          async (tx) => {
            await tx.configuracionSgsstEmpresa.updateMany({
              where: {
                empresaId,
                activo: true,
              },
              data: {
                activo: false,
                vigenteHasta: vigenteDesde,
              },
            });

            return tx.configuracionSgsstEmpresa.create({
              data: {
                empresaId,
                marcoId,
                perfilAplicabilidadId,
                creadoPorUsuarioId:
                  usuarioId,
                vigenteDesde,
                vigenteHasta,
                activo: true,
                notas: textoOpcional(
                  req.body.notas
                ),
              },
              include:
                incluirConfiguracion,
            });
          }
        );

      res.status(201).json(configuracion);
    } catch (error) {
      console.error(
        "[CONFIGURACION-SGSST-CREAR]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible crear la configuración SG-SST.",
      });
    }
  },

  actualizar: async (
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

      const id = String(req.params.id);

      const actual =
        await prisma.configuracionSgsstEmpresa.findUnique({
          where: { id },
        });

      if (!actual) {
        res.status(404).json({
          error:
            "Configuración SG-SST no encontrada.",
        });
        return;
      }

      if (
        !(await puedeGestionarEmpresaSgsst(
          req.user,
          actual.empresaId
        ))
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para modificar esta configuración.",
        });
        return;
      }

      const data:
        Prisma.ConfiguracionSgsstEmpresaUncheckedUpdateInput =
          {};

      if (
        req.body.vigenteDesde !==
        undefined
      ) {
        data.vigenteDesde = fecha(
          req.body.vigenteDesde,
          true
        ) as Date;
      }

      if (
        req.body.vigenteHasta !==
        undefined
      ) {
        data.vigenteHasta = fecha(
          req.body.vigenteHasta
        );
      }

      if (req.body.notas !== undefined) {
        data.notas = textoOpcional(
          req.body.notas
        );
      }

      if (
        typeof req.body.activo ===
        "boolean"
      ) {
        data.activo = req.body.activo;
      }

      const configuracion =
        await prisma.configuracionSgsstEmpresa.update({
          where: { id },
          data,
          include: incluirConfiguracion,
        });

      res.json(configuracion);
    } catch (error) {
      console.error(
        "[CONFIGURACION-SGSST-ACTUALIZAR]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error:
            "Configuración SG-SST no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error:
          "No fue posible actualizar la configuración SG-SST.",
      });
    }
  },
};
