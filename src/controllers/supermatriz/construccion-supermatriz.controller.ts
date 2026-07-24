import type {
  Request,
  Response,
} from "express";

import { servicioConstruccionSupermatriz } from "../../services/supermatriz/construccion-supermatriz.service";
import type {
  DatosAspectoConstructor,
  DatosCategoriaConstructor,
  DatosConstruccionFila,
  DatosCicloConstructor,
  DatosEstandarConstructor,
  DatosFilaConstructor,
  DatosProcesoConstructor,
  ReferenciaConstructor,
} from "../../types/construccion-supermatriz.types";
import type {
  DatosReglaAprobacion,
  DatosRequisitoNormativo,
} from "../../types/supermatriz.types";
import {
  bloqueEvergreen,
  booleano,
  cadenasUnicas,
  enteroOpcional,
  enteroRequerido,
  estadoRegistro,
  fuentePeriodicidad,
  idsEnteros,
  modalidadGestion,
  normalizarTexto,
  numeroOpcional,
  responderErrorSupermatriz,
  textoOpcional,
  textoRequerido,
  tipoFechaBase,
  unidadPeriodicidad,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

function objeto(
  value: unknown,
  label: string
): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new ErrorValidacionSupermatriz(
      `${label} es obligatorio.`
    );
  }

  return value as Record<string, unknown>;
}

function requisitosNormativos(
  value: unknown
): DatosRequisitoNormativo[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const registro =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const norma = normalizarTexto(
        registro.norma
      );

      if (!norma) return null;

      return {
        norma,
        articulo: textoOpcional(
          registro.articulo
        ),
        descripcion: textoOpcional(
          registro.descripcion
        ),
      };
    })
    .filter(
      (
        item
      ): item is DatosRequisitoNormativo =>
        Boolean(item)
    );
}

function reglasAprobacion(
  value: unknown
): DatosReglaAprobacion[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const registro =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const criterio = normalizarTexto(
        registro.criterio
      );

      if (!criterio) return null;

      return {
        modalidad: modalidadGestion(
          registro.modalidad
        ),
        tipoActividad: textoOpcional(
          registro.tipoActividad
        ),
        criterio,
        requiereAprobacion: booleano(
          registro.requiereAprobacion,
          true
        ),
      };
    })
    .filter(
      (
        item
      ): item is DatosReglaAprobacion =>
        Boolean(item)
    );
}

function datosCiclo(
  value: unknown
): DatosCicloConstructor {
  const body = objeto(value, "El ciclo PHVA");

  return {
    codigo: textoRequerido(
      body.codigo,
      "El código del ciclo"
    ).toUpperCase(),
    nombre: textoRequerido(
      body.nombre,
      "El nombre del ciclo"
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden del ciclo",
      0
    ),
    porcentajeEsperado: numeroOpcional(
      body.porcentajeEsperado,
      "El porcentaje esperado del ciclo",
      0,
      100
    ),
    estado: estadoRegistro(body.estado),
  };
}

function datosCategoria(
  value: unknown
): DatosCategoriaConstructor {
  const body = objeto(
    value,
    "La categoría del estándar"
  );

  return {
    codigo: textoOpcional(body.codigo),
    nombre: textoRequerido(
      body.nombre,
      "El nombre de la categoría"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden de la categoría",
      0
    ),
    porcentajeEsperado: numeroOpcional(
      body.porcentajeEsperado,
      "El porcentaje esperado de la categoría",
      0,
      100
    ),
    estado: estadoRegistro(body.estado),
  };
}

function datosEstandar(
  value: unknown
): DatosEstandarConstructor {
  const body = objeto(value, "El estándar");

  return {
    codigo: textoOpcional(body.codigo),
    nombre: textoRequerido(
      body.nombre,
      "El nombre del estándar"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden del estándar",
      0
    ),
    calificacionMinisterialEsperada:
      numeroOpcional(
        body.calificacionMinisterialEsperada,
        "La calificación ministerial",
        0,
        100
      ),
    estado: estadoRegistro(body.estado),
    grupoMinisterialIds: idsEnteros(
      body.grupoMinisterialIds
    ),
  };
}

function datosAspecto(
  value: unknown
): DatosAspectoConstructor {
  const body = objeto(value, "El aspecto");
  const configuracion = objeto(
    body.configuracion ?? {},
    "La configuración del aspecto"
  );
  const vigencia = objeto(
    body.configuracionVigencia ?? {},
    "La configuración de vigencia"
  );
  const evidencia = objeto(
    body.configuracionEvidencia ?? {},
    "La configuración de evidencia"
  );
  const revision = objeto(
    body.configuracionRevision ?? {},
    "La configuración de revisión"
  );
  const cotidiana =
    body.configuracionTareaCotidiana &&
    typeof body.configuracionTareaCotidiana ===
      "object"
      ? (body.configuracionTareaCotidiana as Record<
          string,
          unknown
        >)
      : null;
  const unidadVigencia = unidadPeriodicidad(
    vigencia.unidad
  );
  const tareaCotidiana = booleano(
    configuracion.tareaEjecucionCotidiana
  );

  return {
    codigo: textoOpcional(body.codigo),
    nombre: textoRequerido(
      body.nombre,
      "El nombre del aspecto"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden del aspecto",
      0
    ),
    estado: estadoRegistro(body.estado),
    planAccionEspecifico: textoRequerido(
      body.planAccionEspecifico,
      "El plan de acción específico"
    ),
    configuracion: {
      esEvergreen: booleano(
        configuracion.esEvergreen
      ),
      bloqueEvergreen: bloqueEvergreen(
        configuracion.bloqueEvergreen
      ),
      documentoActualizacionPeriodica:
        booleano(
          configuracion.documentoActualizacionPeriodica
        ),
      tareaEjecucionCotidiana:
        tareaCotidiana,
      incluirInformeEstadoTareas:
        booleano(
          configuracion.incluirInformeEstadoTareas
        ),
      permiteNoAplica: booleano(
        configuracion.permiteNoAplica,
        true
      ),
    },
    configuracionVigencia: {
      tipoFechaBase: tipoFechaBase(
        vigencia.tipoFechaBase
      ),
      fuentePeriodicidad:
        fuentePeriodicidad(
          vigencia.fuentePeriodicidad
        ),
      cantidad: unidadVigencia
        ? numeroOpcional(
            vigencia.cantidad,
            "La cantidad de periodicidad",
            1
          )
        : null,
      unidad: unidadVigencia,
      diasAlertaPrevia: enteroRequerido(
        vigencia.diasAlertaPrevia ?? 30,
        "Los días de alerta previa",
        0
      ),
      permiteFechaManual: booleano(
        vigencia.permiteFechaManual,
        true
      ),
      mesFechaFija: numeroOpcional(
        vigencia.mesFechaFija,
        "El mes de fecha fija",
        1,
        12
      ),
      diaFechaFija: numeroOpcional(
        vigencia.diaFechaFija,
        "El día de fecha fija",
        1,
        31
      ),
      descripcionRegla: textoOpcional(
        vigencia.descripcionRegla
      ),
    },
    configuracionEvidencia: {
      requiereEvidencia: booleano(
        evidencia.requiereEvidencia
      ),
      descripcionEvidencia: textoOpcional(
        evidencia.descripcionEvidencia
      ),
      visibleClienteDefault: booleano(
        evidencia.visibleClienteDefault
      ),
    },
    configuracionRevision: {
      requiereRevisionTecnica: booleano(
        revision.requiereRevisionTecnica
      ),
      observaciones: textoOpcional(
        revision.observaciones
      ),
    },
    configuracionTareaCotidiana:
      tareaCotidiana && cotidiana
        ? {
            cantidadObjetivo:
              enteroRequerido(
                cotidiana.cantidadObjetivo,
                "La cantidad objetivo",
                1
              ),
            unidad:
              unidadPeriodicidad(
                cotidiana.unidad
              ) ??
              (() => {
                throw new ErrorValidacionSupermatriz(
                  "La unidad de la tarea cotidiana es obligatoria."
                );
              })(),
            descripcion: textoOpcional(
              cotidiana.descripcion
            ),
          }
        : null,
    palabrasClave: cadenasUnicas(
      body.palabrasClave
    ),
    requisitosNormativos:
      requisitosNormativos(
        body.requisitosNormativos
      ),
    reglasAprobacion: reglasAprobacion(
      body.reglasAprobacion
    ),
  };
}

function datosProceso(
  value: unknown
): DatosProcesoConstructor {
  const body = objeto(value, "El proceso");

  return {
    codigo: textoOpcional(body.codigo),
    nombre: textoRequerido(
      body.nombre,
      "El nombre del proceso"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    estado: estadoRegistro(body.estado),
  };
}

function datosFila(
  value: unknown
): DatosFilaConstructor {
  const body = objeto(value, "La fila");

  return {
    codigo: textoOpcional(body.codigo),
    orden: enteroRequerido(
      body.orden,
      "El orden de la fila",
      0
    ),
    ejecucion: textoOpcional(
      body.ejecucion
    ),
    fundamentosSoportes: textoOpcional(
      body.fundamentosSoportes
    ),
    responsableActividad: textoOpcional(
      body.responsableActividad
    ),
    metasEstandar: textoOpcional(
      body.metasEstandar
    ),
    recursosAdministrativos:
      textoOpcional(
        body.recursosAdministrativos
      ),
    estado: estadoRegistro(body.estado),
    categoriaGestionIds: idsEnteros(
      body.categoriaGestionIds
    ),
  };
}

function referencia<TData>(
  value: unknown,
  label: string,
  parse: (value: unknown) => TData
): ReferenciaConstructor<TData> {
  const body = objeto(value, label);
  const modo = normalizarTexto(
    body.modo
  ).toUpperCase();

  if (modo === "EXISTENTE") {
    return {
      modo: "EXISTENTE",
      id: enteroRequerido(
        body.id,
        `${label} existente`
      ),
    };
  }

  if (modo === "NUEVO") {
    return {
      modo: "NUEVO",
      datos: parse(body.datos),
    };
  }

  throw new ErrorValidacionSupermatriz(
    `${label} debe indicar modo EXISTENTE o NUEVO.`
  );
}

function referenciaOpcional<TData>(
  value: unknown,
  label: string,
  parse: (value: unknown) => TData
): ReferenciaConstructor<TData> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return referencia(value, label, parse);
}

function construirDatos(
  body: Record<string, unknown>
): DatosConstruccionFila {
  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    tareaId:
      enteroOpcional(body.tareaId) ?? null,
    aspecto: referencia(
      body.aspecto,
      "El aspecto",
      datosAspecto
    ),
    estandar: referenciaOpcional(
      body.estandar,
      "El estándar",
      datosEstandar
    ),
    categoria: referenciaOpcional(
      body.categoria,
      "La categoría",
      datosCategoria
    ),
    ciclo: referenciaOpcional(
      body.ciclo,
      "El ciclo PHVA",
      datosCiclo
    ),
    proceso: referencia(
      body.proceso,
      "El proceso",
      datosProceso
    ),
    fila: datosFila(body.fila),
  };
}

export const controladorConstruccionSupermatriz = {
  guardar: async (
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

      const resultado =
        await servicioConstruccionSupermatriz.guardar(
          construirDatos(req.body),
          req.user.usuarioId
        );

      res
        .status(
          resultado.operacion === "CREAR"
            ? 201
            : 200
        )
        .json(resultado);
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CONSTRUIR-FILA"
      );
    }
  },
};
