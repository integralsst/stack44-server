import {
  EstadoRegistro,
  EstadoVersionSupermatriz,
  Prisma,
} from "@prisma/client";
import type { Response } from "express";

export class ErrorValidacionSupermatriz extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorValidacionSupermatriz";
  }
}

export function normalizarTexto(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function textoOpcional(value: unknown): string | null {
  return normalizarTexto(value) || null;
}

export function enteroRequerido(
  value: unknown,
  campo: string,
  minimo = 1
): number {
  const numero = Number(value);

  if (!Number.isInteger(numero) || numero < minimo) {
    throw new ErrorValidacionSupermatriz(
      `${campo} debe ser un número entero mayor o igual a ${minimo}.`
    );
  }

  return numero;
}

export function enteroOpcional(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numero = Number(value);
  return Number.isInteger(numero) && numero > 0
    ? numero
    : undefined;
}

export function fechaOpcional(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const fecha = new Date(String(value));

  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacionSupermatriz(
      "La fecha proporcionada no es válida."
    );
  }

  return fecha;
}

export function idsEnteros(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    ),
  ];
}

export function estadoRegistro(
  value: unknown,
  fallback: EstadoRegistro = EstadoRegistro.ACTIVO
): EstadoRegistro {
  return Object.values(EstadoRegistro).includes(
    value as EstadoRegistro
  )
    ? (value as EstadoRegistro)
    : fallback;
}

export function estadoVersion(
  value: unknown,
  fallback: EstadoVersionSupermatriz =
    EstadoVersionSupermatriz.BORRADOR
): EstadoVersionSupermatriz {
  return Object.values(EstadoVersionSupermatriz).includes(
    value as EstadoVersionSupermatriz
  )
    ? (value as EstadoVersionSupermatriz)
    : fallback;
}

export function comoJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function responderErrorSupermatriz(
  res: Response,
  error: unknown,
  contexto: string
): void {
  console.error(`[SUPERMATRIZ-${contexto}]`, error);

  if (error instanceof ErrorValidacionSupermatriz) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        error:
          "Ya existe un registro con esa combinación o código.",
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        error: "El registro solicitado no existe.",
      });
      return;
    }

    if (error.code === "P2003") {
      res.status(409).json({
        error:
          "La operación no se puede completar porque el registro tiene relaciones activas.",
      });
      return;
    }
  }

  res.status(500).json({
    error: "Ocurrió un error al procesar la Supermatriz.",
  });
}
