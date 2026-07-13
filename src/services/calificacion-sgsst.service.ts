import {
  EstadoAplicabilidad,
  EstadoCumplimiento,
  Prisma,
  TipoEvaluador,
} from "@prisma/client";

import { prisma } from "../lib/prisma";

const FACTOR_CUMPLIMIENTO: Record<
  EstadoCumplimiento,
  number
> = {
  [EstadoCumplimiento.PENDIENTE]: 0,
  [EstadoCumplimiento.CUMPLE]: 1,
  [EstadoCumplimiento.CUMPLE_PARCIAL]: 0.5,
  [EstadoCumplimiento.NO_CUMPLE]: 0,
  [EstadoCumplimiento.NO_APLICA]: 0,
};

export interface ResumenCalificacion {
  tipoEvaluador: TipoEvaluador;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentaje: number;
  pendientes: number;
  calificaciones: Array<{
    estandarId: string;
    codigo: string;
    nombre: string;
    puntajeObtenido: number;
    puntajeMaximo: number;
    totalItems: number;
    itemsAplicables: number;
  }>;
}

/**
 * Fórmula inicial:
 * CUMPLE=100 %, CUMPLE_PARCIAL=50 %,
 * NO_CUMPLE/PENDIENTE=0 % y NO_APLICA se excluye.
 */
export async function calcularEvaluacion(
  evaluacionId: string,
  tipoEvaluador: TipoEvaluador
): Promise<ResumenCalificacion> {
  const evaluacion =
    await prisma.evaluacion.findUnique({
      where: { id: evaluacionId },
      include: {
        itemsEvaluacion: {
          include: {
            requisito: {
              include: { estandar: true },
            },
            respuestas: {
              where: { tipoEvaluador },
            },
          },
        },
      },
    });

  if (!evaluacion) {
    throw new Error("EVALUACION_NO_ENCONTRADA");
  }

  const grupos = new Map<
    string,
    {
      estandarId: string;
      codigo: string;
      nombre: string;
      puntajeMaximo: number;
      estados: Array<{
        aplicabilidad: EstadoAplicabilidad;
        cumplimiento: EstadoCumplimiento;
      }>;
    }
  >();

  for (const item of evaluacion.itemsEvaluacion) {
    const estandar = item.requisito.estandar;
    const respuesta = item.respuestas[0];
    const cumplimiento =
      respuesta?.estadoCumplimiento ??
      item.estadoCumplimiento;

    const grupo = grupos.get(estandar.id) ?? {
      estandarId: estandar.id,
      codigo: estandar.codigo,
      nombre: estandar.nombre,
      puntajeMaximo: Number(estandar.puntajeMaximo),
      estados: [],
    };

    grupo.estados.push({
      aplicabilidad: item.estadoAplicabilidad,
      cumplimiento,
    });

    grupos.set(estandar.id, grupo);
  }

  const resultados = [...grupos.values()].map(
    (grupo) => {
      const aplicables = grupo.estados.filter(
        (estado) =>
          estado.aplicabilidad !==
            EstadoAplicabilidad.NO_APLICA &&
          estado.cumplimiento !==
            EstadoCumplimiento.NO_APLICA
      );

      const sumaFactores = aplicables.reduce(
        (total, estado) =>
          total +
          FACTOR_CUMPLIMIENTO[
            estado.cumplimiento
          ],
        0
      );

      const proporcion =
        aplicables.length > 0
          ? sumaFactores / aplicables.length
          : 0;

      const puntajeObtenido =
        Math.round(
          grupo.puntajeMaximo *
            proporcion *
            100
        ) / 100;

      return {
        estandarId: grupo.estandarId,
        codigo: grupo.codigo,
        nombre: grupo.nombre,
        puntajeObtenido,
        puntajeMaximo: grupo.puntajeMaximo,
        totalItems: grupo.estados.length,
        itemsAplicables: aplicables.length,
      };
    }
  );

  await prisma.$transaction(
    resultados.map((resultado) =>
      prisma.calificacionEstandarEvaluacion.upsert({
        where: {
          evaluacionId_estandarId_tipoEvaluador: {
            evaluacionId,
            estandarId: resultado.estandarId,
            tipoEvaluador,
          },
        },
        update: {
          puntajeMaximo: new Prisma.Decimal(
            resultado.puntajeMaximo
          ),
          puntajeObtenido: new Prisma.Decimal(
            resultado.puntajeObtenido
          ),
          calculadoEn: new Date(),
        },
        create: {
          evaluacionId,
          estandarId: resultado.estandarId,
          tipoEvaluador,
          puntajeMaximo: new Prisma.Decimal(
            resultado.puntajeMaximo
          ),
          puntajeObtenido: new Prisma.Decimal(
            resultado.puntajeObtenido
          ),
        },
      })
    )
  );

  const puntajeObtenido =
    Math.round(
      resultados.reduce(
        (total, item) =>
          total + item.puntajeObtenido,
        0
      ) * 100
    ) / 100;

  const puntajeMaximo =
    Math.round(
      resultados.reduce(
        (total, item) =>
          total + item.puntajeMaximo,
        0
      ) * 100
    ) / 100;

  const pendientes =
    evaluacion.itemsEvaluacion.filter(
      (item) =>
        item.estadoAplicabilidad !==
          EstadoAplicabilidad.NO_APLICA &&
        (
          item.respuestas[0]
            ?.estadoCumplimiento ??
          item.estadoCumplimiento
        ) === EstadoCumplimiento.PENDIENTE
    ).length;

  return {
    tipoEvaluador,
    puntajeObtenido,
    puntajeMaximo,
    porcentaje:
      puntajeMaximo > 0
        ? Math.round(
            (puntajeObtenido /
              puntajeMaximo) *
              10000
          ) / 100
        : 0,
    pendientes,
    calificaciones: resultados,
  };
}
