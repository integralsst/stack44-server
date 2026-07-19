import type {
  Request,
  Response,
} from "express";

import { servicioCatalogosSupermatriz } from "../../services/supermatriz/catalogos-supermatriz.service";
import type {
  DatosAspecto,
  DatosCategoriaEstandar,
  DatosCicloPhva,
  DatosEstandar,
  DatosProceso,
  DatosReglaAprobacion,
  DatosRequisitoNormativo,
} from "../../types/supermatriz.types";
import {
  bloqueEvergreen,
  booleano,
  ErrorValidacionSupermatriz,
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
} from "../../utils/supermatriz";

function usuarioId(
  req: Request,
  res: Response
): string | null {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado.",
    });
    return null;
  }

  return req.user.usuarioId;
}

function datosCiclo(
  body: Record<string, unknown>
): DatosCicloPhva {
  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    codigo: textoRequerido(
      body.codigo,
      "El código"
    ).toUpperCase(),
    nombre: textoRequerido(
      body.nombre,
      "El nombre"
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden",
      0
    ),
    porcentajeEsperado:
      numeroOpcional(
        body.porcentajeEsperado,
        "El porcentaje esperado",
        0,
        100
      ),
    estado: estadoRegistro(
      body.estado
    ),
  };
}

function datosCategoria(
  body: Record<string, unknown>
): DatosCategoriaEstandar {
  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    cicloPhvaId: enteroRequerido(
      body.cicloPhvaId,
      "El ciclo PHVA"
    ),
    codigo: textoOpcional(
      body.codigo
    ),
    nombre: textoRequerido(
      body.nombre,
      "El nombre"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden",
      0
    ),
    porcentajeEsperado:
      numeroOpcional(
        body.porcentajeEsperado,
        "El porcentaje esperado",
        0,
        100
      ),
    estado: estadoRegistro(
      body.estado
    ),
  };
}

function datosEstandar(
  body: Record<string, unknown>
): DatosEstandar {
  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    categoriaEstandarId:
      enteroRequerido(
        body.categoriaEstandarId,
        "La categoría"
      ),
    codigo: textoOpcional(
      body.codigo
    ),
    nombre: textoRequerido(
      body.nombre,
      "El nombre"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden",
      0
    ),
    calificacionMinisterialEsperada:
      numeroOpcional(
        body.calificacionMinisterialEsperada,
        "La calificación ministerial",
        0,
        100
      ),
    estado: estadoRegistro(
      body.estado
    ),
    grupoMinisterialIds:
      idsEnteros(
        body.grupoMinisterialIds
      ),
  };
}

function datosProceso(
  body: Record<string, unknown>
): DatosProceso {
  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    codigo: textoOpcional(
      body.codigo
    ),
    nombre: textoRequerido(
      body.nombre,
      "El nombre"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    estado: estadoRegistro(
      body.estado
    ),
  };
}

function requisitosNormativos(
  value: unknown
): DatosRequisitoNormativo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const registro =
        item &&
        typeof item === "object"
          ? (item as Record<
              string,
              unknown
            >)
          : {};

      const norma =
        normalizarTexto(
          registro.norma
        );

      if (!norma) {
        return null;
      }

      return {
        norma,
        articulo:
          textoOpcional(
            registro.articulo
          ),
        descripcion:
          textoOpcional(
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
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const registro =
        item &&
        typeof item === "object"
          ? (item as Record<
              string,
              unknown
            >)
          : {};

      const criterio =
        normalizarTexto(
          registro.criterio
        );

      if (!criterio) {
        return null;
      }

      return {
        modalidad:
          modalidadGestion(
            registro.modalidad
          ),
        tipoActividad:
          textoOpcional(
            registro.tipoActividad
          ),
        criterio,
        requiereAprobacion:
          booleano(
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

function datosAspecto(
  body: Record<string, unknown>
): DatosAspecto {
  const configuracion =
    body.configuracion &&
    typeof body.configuracion ===
      "object"
      ? (body.configuracion as Record<
          string,
          unknown
        >)
      : {};

  const vigencia =
    body.configuracionVigencia &&
    typeof body.configuracionVigencia ===
      "object"
      ? (body.configuracionVigencia as Record<
          string,
          unknown
        >)
      : {};

  const evidencia =
    body.configuracionEvidencia &&
    typeof body.configuracionEvidencia ===
      "object"
      ? (body.configuracionEvidencia as Record<
          string,
          unknown
        >)
      : {};

  const revision =
    body.configuracionRevision &&
    typeof body.configuracionRevision ===
      "object"
      ? (body.configuracionRevision as Record<
          string,
          unknown
        >)
      : {};

  const cotidiana =
    body.configuracionTareaCotidiana &&
    typeof body.configuracionTareaCotidiana ===
      "object"
      ? (body.configuracionTareaCotidiana as Record<
          string,
          unknown
        >)
      : null;

  const unidadVigencia =
    unidadPeriodicidad(
      vigencia.unidad
    );

  return {
    versionSupermatrizId:
      enteroRequerido(
        body.versionSupermatrizId,
        "La versión"
      ),
    estandarId:
      enteroRequerido(
        body.estandarId,
        "El estándar"
      ),
    codigo: textoOpcional(
      body.codigo
    ),
    nombre: textoRequerido(
      body.nombre,
      "El nombre"
    ),
    descripcion: textoOpcional(
      body.descripcion
    ),
    orden: enteroRequerido(
      body.orden,
      "El orden",
      0
    ),
    estado: estadoRegistro(
      body.estado
    ),
    planAccionEspecifico:
      textoRequerido(
        body.planAccionEspecifico,
        "El plan de acción específico"
      ),
    configuracion: {
      esEvergreen:
        booleano(
          configuracion.esEvergreen
        ),
      bloqueEvergreen:
        bloqueEvergreen(
          configuracion.bloqueEvergreen
        ),
      documentoActualizacionPeriodica:
        booleano(
          configuracion.documentoActualizacionPeriodica
        ),
      tareaEjecucionCotidiana:
        booleano(
          configuracion.tareaEjecucionCotidiana
        ),
      incluirInformeEstadoTareas:
        booleano(
          configuracion.incluirInformeEstadoTareas
        ),
      permiteNoAplica:
        booleano(
          configuracion.permiteNoAplica,
          true
        ),
    },
    configuracionVigencia: {
      tipoFechaBase:
        tipoFechaBase(
          vigencia.tipoFechaBase
        ),
      fuentePeriodicidad:
        fuentePeriodicidad(
          vigencia.fuentePeriodicidad
        ),
      cantidad:
        unidadVigencia
          ? numeroOpcional(
              vigencia.cantidad,
              "La cantidad de periodicidad",
              1
            )
          : null,
      unidad:
        unidadVigencia,
      diasAlertaPrevia:
        enteroRequerido(
          vigencia.diasAlertaPrevia ??
            30,
          "Los días de alerta",
          0
        ),
      permiteFechaManual:
        booleano(
          vigencia.permiteFechaManual,
          true
        ),
      mesFechaFija:
        numeroOpcional(
          vigencia.mesFechaFija,
          "El mes de fecha fija",
          1,
          12
        ),
      diaFechaFija:
        numeroOpcional(
          vigencia.diaFechaFija,
          "El día de fecha fija",
          1,
          31
        ),
      descripcionRegla:
        textoOpcional(
          vigencia.descripcionRegla
        ),
    },
    configuracionEvidencia: {
      requiereEvidencia:
        booleano(
          evidencia.requiereEvidencia
        ),
      descripcionEvidencia:
        textoOpcional(
          evidencia.descripcionEvidencia
        ),
      visibleClienteDefault:
        booleano(
          evidencia.visibleClienteDefault
        ),
    },
    configuracionRevision: {
      requiereRevisionTecnica:
        booleano(
          revision.requiereRevisionTecnica
        ),
      observaciones:
        textoOpcional(
          revision.observaciones
        ),
    },
    configuracionTareaCotidiana:
      configuracion.tareaEjecucionCotidiana &&
      cotidiana
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
            descripcion:
              textoOpcional(
                cotidiana.descripcion
              ),
          }
        : null,
    palabrasClave:
      cadenasUnicas(
        body.palabrasClave
      ),
    requisitosNormativos:
      requisitosNormativos(
        body.requisitosNormativos
      ),
    reglasAprobacion:
      reglasAprobacion(
        body.reglasAprobacion
      ),
  };
}

export const controladorCatalogosSupermatriz = {
  obtenerTodos: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const incluirInactivos =
        req.query.incluirInactivos ===
          "true" ||
        req.query.includeInactive ===
          "true";

      const versionSupermatrizId =
        enteroOpcional(
          req.query.versionSupermatrizId
        );

      res.json(
        await servicioCatalogosSupermatriz.obtenerTodos(
          versionSupermatrizId,
          incluirInactivos
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CATALOGOS"
      );
    }
  },

  obtenerResumen: async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json(
        await servicioCatalogosSupermatriz.obtenerResumen()
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "RESUMEN"
      );
    }
  },

  crearCiclo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioCatalogosSupermatriz.crearCiclo(
          datosCiclo(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CICLO-CREAR"
      );
    }
  },

  actualizarCiclo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.actualizarCiclo(
          Number(req.params.id),
          datosCiclo(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CICLO-ACTUALIZAR"
      );
    }
  },

  desactivarCiclo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.desactivarCiclo(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CICLO-DESACTIVAR"
      );
    }
  },

  crearCategoria: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioCatalogosSupermatriz.crearCategoria(
          datosCategoria(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CATEGORIA-CREAR"
      );
    }
  },

  actualizarCategoria: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.actualizarCategoria(
          Number(req.params.id),
          datosCategoria(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CATEGORIA-ACTUALIZAR"
      );
    }
  },

  desactivarCategoria: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.desactivarCategoria(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "CATEGORIA-DESACTIVAR"
      );
    }
  },

  crearEstandar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioCatalogosSupermatriz.crearEstandar(
          datosEstandar(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ESTANDAR-CREAR"
      );
    }
  },

  actualizarEstandar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.actualizarEstandar(
          Number(req.params.id),
          datosEstandar(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ESTANDAR-ACTUALIZAR"
      );
    }
  },

  desactivarEstandar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.desactivarEstandar(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ESTANDAR-DESACTIVAR"
      );
    }
  },

  crearProceso: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioCatalogosSupermatriz.crearProceso(
          datosProceso(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "PROCESO-CREAR"
      );
    }
  },

  actualizarProceso: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.actualizarProceso(
          Number(req.params.id),
          datosProceso(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "PROCESO-ACTUALIZAR"
      );
    }
  },

  desactivarProceso: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.desactivarProceso(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "PROCESO-DESACTIVAR"
      );
    }
  },

  crearAspecto: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioCatalogosSupermatriz.crearAspecto(
          datosAspecto(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ASPECTO-CREAR"
      );
    }
  },

  actualizarAspecto: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.actualizarAspecto(
          Number(req.params.id),
          datosAspecto(req.body),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ASPECTO-ACTUALIZAR"
      );
    }
  },

  desactivarAspecto: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        usuarioId(req, res);
      if (!actor) return;

      res.json(
        await servicioCatalogosSupermatriz.desactivarAspecto(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "ASPECTO-DESACTIVAR"
      );
    }
  },
};
