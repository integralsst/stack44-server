import {
  BloqueEvergreen,
  EstadoRegistro,
  EstadoVersionSupermatriz,
  FuentePeriodicidad,
  ModalidadGestion,
  Prisma,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
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

export function textoRequerido(value: unknown, campo: string): string {
  const texto = normalizarTexto(value);

  if (!texto) {
    throw new ErrorValidacionSupermatriz(
      `${campo} es obligatorio.`
    );
  }

  return texto;
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

export function numeroOpcional(
  value: unknown,
  campo: string,
  minimo = 0,
  maximo?: number
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numero = Number(value);

  if (
    Number.isNaN(numero) ||
    numero < minimo ||
    (maximo !== undefined && numero > maximo)
  ) {
    throw new ErrorValidacionSupermatriz(
      `${campo} no tiene un valor válido.`
    );
  }

  return numero;
}

export function booleano(
  value: unknown,
  fallback = false
): boolean {
  return typeof value === "boolean" ? value : fallback;
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

export function cadenasUnicas(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => normalizarTexto(item))
        .filter(Boolean)
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

export function enumOpcional<T extends string>(
  value: unknown,
  valores: readonly T[]
): T | null {
  return valores.includes(value as T)
    ? (value as T)
    : null;
}

export function bloqueEvergreen(
  value: unknown
): BloqueEvergreen | null {
  return enumOpcional(
    value,
    Object.values(BloqueEvergreen)
  );
}

export function tipoFechaBase(
  value: unknown
): TipoFechaBaseVigencia {
  return (
    enumOpcional(
      value,
      Object.values(TipoFechaBaseVigencia)
    ) ?? TipoFechaBaseVigencia.FECHA_DOCUMENTO
  );
}

export function fuentePeriodicidad(
  value: unknown
): FuentePeriodicidad {
  return (
    enumOpcional(
      value,
      Object.values(FuentePeriodicidad)
    ) ?? FuentePeriodicidad.CONFIGURACION_TECNICA
  );
}

export function unidadPeriodicidad(
  value: unknown
): UnidadPeriodicidad | null {
  return enumOpcional(
    value,
    Object.values(UnidadPeriodicidad)
  );
}

export function modalidadGestion(
  value: unknown
): ModalidadGestion | null {
  return enumOpcional(
    value,
    Object.values(ModalidadGestion)
  );
}

export function comoJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function asegurarVersionBorrador(
  tx: Prisma.TransactionClient,
  versionSupermatrizId: number
): Promise<void> {
  const version = await tx.versionSupermatriz.findUnique({
    where: { id: versionSupermatrizId },
    select: {
      id: true,
      estado: true,
    },
  });

  if (!version) {
    throw new ErrorValidacionSupermatriz(
      "La versión seleccionada no existe."
    );
  }

  if (version.estado !== EstadoVersionSupermatriz.BORRADOR) {
    throw new ErrorValidacionSupermatriz(
      "Solo se puede modificar una versión en estado BORRADOR."
    );
  }
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
          "Ya existe un registro con ese nombre, código o combinación dentro de la versión.",
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

    if (error.code === "P2028") {
      res.status(503).json({
        error:
          "La conexión con la base de datos tardó demasiado y la operación fue cancelada. Intenta guardar nuevamente.",
      });
      return;
    }
  }

  res.status(500).json({
    error: "Ocurrió un error al procesar la Supermatriz.",
  });
}
