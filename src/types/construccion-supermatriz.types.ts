import type {
  DatosAspecto,
  DatosCategoriaEstandar,
  DatosCicloPhva,
  DatosEstandar,
  DatosProceso,
  DatosTareaSupermatriz,
} from "./supermatriz.types";

export interface ReferenciaExistente {
  modo: "EXISTENTE";
  id: number;
}

export interface ReferenciaNueva<TData> {
  modo: "NUEVO";
  datos: TData;
}

export type ReferenciaConstructor<TData> =
  | ReferenciaExistente
  | ReferenciaNueva<TData>;

export type DatosCicloConstructor = Omit<
  DatosCicloPhva,
  "versionSupermatrizId"
>;

export type DatosCategoriaConstructor = Omit<
  DatosCategoriaEstandar,
  "versionSupermatrizId" | "cicloPhvaId"
>;

export type DatosEstandarConstructor = Omit<
  DatosEstandar,
  "versionSupermatrizId" | "categoriaEstandarId"
>;

export type DatosAspectoConstructor = Omit<
  DatosAspecto,
  "versionSupermatrizId" | "estandarId"
>;

export type DatosProcesoConstructor = Omit<
  DatosProceso,
  "versionSupermatrizId"
>;

export type DatosFilaConstructor = Omit<
  DatosTareaSupermatriz,
  "versionSupermatrizId" | "aspectoId" | "procesoId"
>;

export interface DatosConstruccionFila {
  versionSupermatrizId: number;
  tareaId: number | null;
  aspecto: ReferenciaConstructor<DatosAspectoConstructor>;
  estandar?: ReferenciaConstructor<DatosEstandarConstructor>;
  categoria?: ReferenciaConstructor<DatosCategoriaConstructor>;
  ciclo?: ReferenciaConstructor<DatosCicloConstructor>;
  proceso: ReferenciaConstructor<DatosProcesoConstructor>;
  fila: DatosFilaConstructor;
}
