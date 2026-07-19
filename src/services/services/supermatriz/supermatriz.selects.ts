import { Prisma } from "@prisma/client";

export const incluirTareaSupermatriz = {
  versionSupermatriz: {
    select: {
      id: true,
      nombre: true,
      estado: true,
      vigenteDesde: true,
      vigenteHasta: true,
    },
  },
  proceso: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
    },
  },
  aspecto: {
    include: {
      planAccionEspecifico: true,
      configuracion: true,
      configuracionVigencia: true,
      configuracionTareaCotidiana: true,
      configuracionEvidencia: true,
      configuracionRevision: true,
      palabrasClave: {
        include: {
          palabraClave: true,
        },
      },
      requisitosNormativos: {
        include: {
          requisitoNormativo: true,
        },
      },
      estandar: {
        include: {
          categoriaEstandar: {
            include: {
              cicloPhva: true,
            },
          },
          gruposMinisteriales: {
            include: {
              grupoMinisterial: true,
            },
          },
        },
      },
    },
  },
  categoriasGestion: {
    include: {
      categoriaGestion: true,
    },
  },
} satisfies Prisma.SupermatrizTareaInclude;

export type TareaSupermatrizCompleta =
  Prisma.SupermatrizTareaGetPayload<{
    include: typeof incluirTareaSupermatriz;
  }>;
