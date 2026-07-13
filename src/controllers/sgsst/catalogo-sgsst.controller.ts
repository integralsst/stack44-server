import {
  Request,
  Response,
} from "express";

import { prisma } from "../../lib/prisma";

function texto(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export const controladorCatalogoSgsst = {
  obtenerMarcos: async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const marcos =
        await prisma.marcoSgsst.findMany({
          where: { activo: true },
          include: {
            ciclos: {
              orderBy: {
                ordenVisualizacion: "asc",
              },
              include: {
                categorias: {
                  where: { activo: true },
                  orderBy: {
                    ordenVisualizacion: "asc",
                  },
                },
              },
            },
            perfilesAplicabilidad: {
              where: { activo: true },
              orderBy: {
                cantidadEstandares: "asc",
              },
            },
          },
          orderBy: [
            { nombre: "asc" },
            { version: "desc" },
          ],
        });

      res.json(marcos);
    } catch (error) {
      console.error(
        "[CATALOGO-SGSST-MARCOS]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar los marcos SG-SST.",
      });
    }
  },

  obtenerMarcoPorId: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const marcoId = String(
        req.params.marcoId
      );

      const marco =
        await prisma.marcoSgsst.findUnique({
          where: { id: marcoId },
          include: {
            ciclos: {
              orderBy: {
                ordenVisualizacion: "asc",
              },
              include: {
                categorias: {
                  where: { activo: true },
                  orderBy: {
                    ordenVisualizacion: "asc",
                  },
                  include: {
                    estandaresMinimos: {
                      where: { activo: true },
                      orderBy: {
                        ordenVisualizacion:
                          "asc",
                      },
                    },
                  },
                },
              },
            },
            perfilesAplicabilidad: {
              where: { activo: true },
            },
            procesos: {
              where: { activo: true },
              orderBy: { nombre: "asc" },
            },
          },
        });

      if (!marco) {
        res.status(404).json({
          error:
            "Marco SG-SST no encontrado.",
        });
        return;
      }

      res.json(marco);
    } catch (error) {
      console.error(
        "[CATALOGO-SGSST-MARCO]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar el marco SG-SST.",
      });
    }
  },

  obtenerMatrizPorPerfil: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const perfilId = String(
        req.params.perfilId
      );

      const busqueda = texto(
        req.query.busqueda
      ).toLowerCase();

      const perfil =
        await prisma.perfilAplicabilidad.findUnique({
          where: { id: perfilId },
          include: {
            marco: true,
            requisitos: {
              include: {
                requisito: {
                  include: {
                    proceso: true,
                    frecuenciaActualizacion:
                      true,
                    bloqueDocumental: true,
                    estandar: {
                      include: {
                        categoria: {
                          include: {
                            cicloPhva: true,
                          },
                        },
                      },
                    },
                    areasGestion: {
                      include: {
                        areaGestion: true,
                      },
                    },
                    rolesResponsables: {
                      include: {
                        rolResponsable: true,
                      },
                    },
                    evidenciasRequeridas: {
                      orderBy: {
                        ordenVisualizacion:
                          "asc",
                      },
                    },
                    recursos: {
                      orderBy: {
                        ordenVisualizacion:
                          "asc",
                      },
                    },
                    palabrasClave: {
                      include: {
                        palabraClave: true,
                      },
                    },
                    referenciasLegales: {
                      include: {
                        normaLegal: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                ordenVisualizacion: "asc",
              },
            },
          },
        });

      if (!perfil || !perfil.activo) {
        res.status(404).json({
          error:
            "Perfil de aplicabilidad no encontrado.",
        });
        return;
      }

      const requisitos = perfil.requisitos
        .filter(
          (relacion) =>
            relacion.requisito.activo
        )
        .filter((relacion) => {
          if (!busqueda) return true;

          const requisito =
            relacion.requisito;

          return [
            requisito.codigo,
            requisito.descripcion,
            requisito.proceso?.nombre ?? "",
            requisito.estandar.codigo,
            requisito.estandar.nombre,
          ]
            .join(" ")
            .toLowerCase()
            .includes(busqueda);
        })
        .sort((a, b) => {
          const cicloA =
            a.requisito.estandar.categoria
              .cicloPhva.ordenVisualizacion;
          const cicloB =
            b.requisito.estandar.categoria
              .cicloPhva.ordenVisualizacion;

          if (cicloA !== cicloB) {
            return cicloA - cicloB;
          }

          const categoriaA =
            a.requisito.estandar.categoria
              .ordenVisualizacion;
          const categoriaB =
            b.requisito.estandar.categoria
              .ordenVisualizacion;

          if (categoriaA !== categoriaB) {
            return categoriaA - categoriaB;
          }

          const estandarA =
            a.requisito.estandar
              .ordenVisualizacion;
          const estandarB =
            b.requisito.estandar
              .ordenVisualizacion;

          if (estandarA !== estandarB) {
            return estandarA - estandarB;
          }

          return (
            a.requisito.ordenVisualizacion -
            b.requisito.ordenVisualizacion
          );
        });

      res.json({
        perfil: {
          id: perfil.id,
          codigo: perfil.codigo,
          nombre: perfil.nombre,
          cantidadEstandares:
            perfil.cantidadEstandares,
          marco: perfil.marco,
        },
        totalRequisitos: requisitos.length,
        requisitos,
      });
    } catch (error) {
      console.error(
        "[CATALOGO-SGSST-MATRIZ]",
        error
      );

      res.status(500).json({
        error:
          "No fue posible consultar la matriz SG-SST.",
      });
    }
  },
};
