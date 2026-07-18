import {
  EstadoRegistro,
  EstadoVersionSupermatriz,
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
  estado: EstadoVersionSupermatriz;
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
