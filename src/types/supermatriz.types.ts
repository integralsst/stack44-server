import {
  BloqueEvergreen,
  EstadoRegistro,
  EstadoVersionSupermatriz,
  FuentePeriodicidad,
  ModalidadGestion,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

export interface FiltrosTareasSupermatriz {
  versionSupermatrizId?: number;
  cicloPhvaId?: number;
  categoriaEstandarId?: number;
  estandarId?: number;
  procesoId?: number;
  categoriaGestionId?: number;
  grupoMinisterialId?: number;
  estado?: EstadoRegistro;
  busqueda?: string;
  pagina: number;
  limite: number;
}

export interface DatosVersionSupermatriz {
  nombre: string;
  descripcion: string | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
}

export interface DatosClonarVersion {
  nombre: string;
  descripcion: string | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
}

export interface DatosTareaSupermatriz {
  versionSupermatrizId: number;
  aspectoId: number;
  procesoId: number;
  codigo: string | null;
  orden: number;
  ejecucion: string | null;
  fundamentosSoportes: string | null;
  responsableActividad: string | null;
  metasEstandar: string | null;
  recursosAdministrativos: string | null;
  estado: EstadoRegistro;
  categoriaGestionIds: number[];
}

export interface DatosCicloPhva {
  versionSupermatrizId: number;
  codigo: string;
  nombre: string;
  orden: number;
  porcentajeEsperado: number | null;
  estado: EstadoRegistro;
}

export interface DatosCategoriaEstandar {
  versionSupermatrizId: number;
  cicloPhvaId: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number;
  porcentajeEsperado: number | null;
  estado: EstadoRegistro;
}

export interface DatosEstandar {
  versionSupermatrizId: number;
  categoriaEstandarId: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number;
  calificacionMinisterialEsperada: number | null;
  estado: EstadoRegistro;
  grupoMinisterialIds: number[];
}

export interface DatosProceso {
  versionSupermatrizId: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  estado: EstadoRegistro;
}

export interface DatosConfiguracionAspecto {
  esEvergreen: boolean;
  bloqueEvergreen: BloqueEvergreen | null;
  documentoActualizacionPeriodica: boolean;
  tareaEjecucionCotidiana: boolean;
  incluirInformeEstadoTareas: boolean;
  permiteNoAplica: boolean;
}

export interface DatosConfiguracionVigencia {
  tipoFechaBase: TipoFechaBaseVigencia;
  fuentePeriodicidad: FuentePeriodicidad;
  cantidad: number | null;
  unidad: UnidadPeriodicidad | null;
  diasAlertaPrevia: number;
  permiteFechaManual: boolean;
  mesFechaFija: number | null;
  diaFechaFija: number | null;
  descripcionRegla: string | null;
}

export interface DatosConfiguracionEvidencia {
  requiereEvidencia: boolean;
  descripcionEvidencia: string | null;
  visibleClienteDefault: boolean;
}

export interface DatosConfiguracionRevision {
  requiereRevisionTecnica: boolean;
  observaciones: string | null;
}

export interface DatosTareaCotidiana {
  cantidadObjetivo: number;
  unidad: UnidadPeriodicidad;
  descripcion: string | null;
}

export interface DatosReglaAprobacion {
  modalidad: ModalidadGestion | null;
  tipoActividad: string | null;
  criterio: string;
  requiereAprobacion: boolean;
}

export interface DatosRequisitoNormativo {
  norma: string;
  articulo: string | null;
  descripcion: string | null;
}

export interface DatosAspecto {
  versionSupermatrizId: number;
  estandarId: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number;
  estado: EstadoRegistro;
  planAccionEspecifico: string;
  configuracion: DatosConfiguracionAspecto;
  configuracionVigencia: DatosConfiguracionVigencia;
  configuracionEvidencia: DatosConfiguracionEvidencia;
  configuracionRevision: DatosConfiguracionRevision;
  configuracionTareaCotidiana: DatosTareaCotidiana | null;
  palabrasClave: string[];
  requisitosNormativos: DatosRequisitoNormativo[];
  reglasAprobacion: DatosReglaAprobacion[];
}

export interface FiltrosHistorialSupermatriz {
  versionSupermatrizId?: number;
  tipoEntidad?: string;
  accion?: string;
  pagina: number;
  limite: number;
}
