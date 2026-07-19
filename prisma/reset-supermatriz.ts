import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ResultadoDeleteMany = {
  count: number;
};

async function eliminar(
  nombre: string,
  operacion: () => Promise<ResultadoDeleteMany>
): Promise<void> {
  const resultado = await operacion();

  console.log(
    `   ✓ ${nombre}: ${resultado.count} registro(s)`
  );
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🧹 Limpiando únicamente el módulo de Supermatriz..."
  );
  console.log(
    "ℹ️ La limpieza se ejecuta por pasos para evitar el timeout de una transacción larga."
  );
  console.log("");

  /*
   * IMPORTANTE:
   * No usamos una transacción interactiva extensa.
   * Al trabajar contra una base remota, muchas eliminaciones
   * consecutivas pueden superar el tiempo máximo de la transacción.
   *
   * Este script es repetible. Si se interrumpe, puedes ejecutarlo
   * nuevamente y continuará eliminando lo que todavía exista.
   */

  // ====================================================
  // 1. HISTORIAL Y RELACIONES DE LAS FILAS
  // ====================================================

  await eliminar(
    "Historial de cambios",
    () =>
      prisma.historialCambioSupermatriz.deleteMany()
  );

  await eliminar(
    "Categorías de gestión asociadas a tareas",
    () =>
      prisma.supermatrizTareaCategoriaGestion.deleteMany()
  );

  await eliminar(
    "Filas de la Supermatriz",
    () =>
      prisma.supermatrizTarea.deleteMany()
  );

  // ====================================================
  // 2. RELACIONES DE ESTÁNDARES Y ASPECTOS
  // ====================================================

  await eliminar(
    "Relaciones estándar-grupo ministerial",
    () =>
      prisma.estandarGrupoMinisterial.deleteMany()
  );

  await eliminar(
    "Relaciones aspecto-palabra clave",
    () =>
      prisma.aspectoPalabraClave.deleteMany()
  );

  await eliminar(
    "Relaciones aspecto-requisito normativo",
    () =>
      prisma.aspectoRequisitoNormativo.deleteMany()
  );

  // ====================================================
  // 3. CONFIGURACIONES DEPENDIENTES DEL ASPECTO
  // ====================================================

  await eliminar(
    "Reglas de aprobación",
    () =>
      prisma.reglaAprobacionGestion.deleteMany()
  );

  await eliminar(
    "Vigencias de aspectos",
    () =>
      prisma.vigenciaAspecto.deleteMany()
  );

  await eliminar(
    "Configuraciones de revisión técnica",
    () =>
      prisma.configuracionRevisionTecnica.deleteMany()
  );

  await eliminar(
    "Configuraciones de evidencia",
    () =>
      prisma.configuracionEvidenciaAspecto.deleteMany()
  );

  await eliminar(
    "Configuraciones de tarea cotidiana",
    () =>
      prisma.configuracionTareaCotidiana.deleteMany()
  );

  await eliminar(
    "Configuraciones de vigencia",
    () =>
      prisma.configuracionVigenciaAspecto.deleteMany()
  );

  await eliminar(
    "Configuraciones generales de aspectos",
    () =>
      prisma.configuracionAspecto.deleteMany()
  );

  await eliminar(
    "Planes de acción específicos",
    () =>
      prisma.planAccionEspecifico.deleteMany()
  );

  // ====================================================
  // 4. CATÁLOGOS VERSIONADOS
  // ====================================================

  await eliminar(
    "Palabras clave versionadas",
    () =>
      prisma.palabraClave.deleteMany()
  );

  await eliminar(
    "Requisitos normativos versionados",
    () =>
      prisma.requisitoNormativo.deleteMany()
  );

  await eliminar(
    "Aspectos",
    () =>
      prisma.aspecto.deleteMany()
  );

  await eliminar(
    "Estándares",
    () =>
      prisma.estandar.deleteMany()
  );

  await eliminar(
    "Categorías de estándar",
    () =>
      prisma.categoriaEstandar.deleteMany()
  );

  await eliminar(
    "Ciclos PHVA",
    () =>
      prisma.cicloPhva.deleteMany()
  );

  await eliminar(
    "Procesos",
    () =>
      prisma.proceso.deleteMany()
  );

  await eliminar(
    "Versiones de la Supermatriz",
    () =>
      prisma.versionSupermatriz.deleteMany()
  );

  /*
   * No se eliminan:
   *
   * - Empresa
   * - Usuario
   * - Profesional
   * - EmpresaProfesional
   * - EmpresaProfesionalCategoriaGestion
   * - CategoriaGestion
   * - GrupoMinisterial
   *
   * CategoriaGestion y GrupoMinisterial son catálogos
   * técnicos globales y pueden tener relaciones externas.
   */

  console.log("");
  console.log(
    "✅ Datos versionados de la Supermatriz eliminados."
  );
  console.log(
    "✅ Empresas, usuarios y profesionales permanecen intactos."
  );
  console.log(
    "✅ Categorías de gestión y grupos ministeriales globales permanecen intactos."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error limpiando la Supermatriz:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
