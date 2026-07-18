import {
  BloqueEvergreen,
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  EstadoRegistro,
  EstadoVersionSupermatriz,
  FuentePeriodicidad,
  PrismaClient,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de la Supermatriz...");

  const ciclos = await Promise.all(
    [
      { codigo: "PLANEAR", nombre: "Planear", orden: 1, porcentaje: 25 },
      { codigo: "HACER", nombre: "Hacer", orden: 2, porcentaje: 60 },
      { codigo: "VERIFICAR", nombre: "Verificar", orden: 3, porcentaje: 5 },
      { codigo: "ACTUAR", nombre: "Actuar", orden: 4, porcentaje: 10 },
    ].map((item) =>
      prisma.cicloPhva.upsert({
        where: { codigo: item.codigo },
        update: {
          nombre: item.nombre,
          orden: item.orden,
          porcentajeEsperado: item.porcentaje,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          codigo: item.codigo,
          nombre: item.nombre,
          orden: item.orden,
          porcentajeEsperado: item.porcentaje,
        },
      })
    )
  );

  const cicloPlanear = ciclos.find((item) => item.codigo === "PLANEAR")!;
  const cicloHacer = ciclos.find((item) => item.codigo === "HACER")!;

  const categoriaRecursos = await prisma.categoriaEstandar.upsert({
    where: {
      cicloPhvaId_nombre: {
        cicloPhvaId: cicloPlanear.id,
        nombre: "RECURSOS",
      },
    },
    update: {
      codigo: "REC-10",
      orden: 1,
      porcentajeEsperado: 10,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      cicloPhvaId: cicloPlanear.id,
      codigo: "REC-10",
      nombre: "RECURSOS",
      orden: 1,
      porcentajeEsperado: 10,
    },
  });

  const categoriaPeligros = await prisma.categoriaEstandar.upsert({
    where: {
      cicloPhvaId_nombre: {
        cicloPhvaId: cicloHacer.id,
        nombre: "GESTIÓN DE PELIGROS Y RIESGOS",
      },
    },
    update: {
      codigo: "GPR-30",
      orden: 1,
      porcentajeEsperado: 30,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      cicloPhvaId: cicloHacer.id,
      codigo: "GPR-30",
      nombre: "GESTIÓN DE PELIGROS Y RIESGOS",
      orden: 1,
      porcentajeEsperado: 30,
    },
  });

  const grupos = await Promise.all([
    prisma.grupoMinisterial.upsert({
      where: { codigo: CodigoGrupoMinisterial.ESTANDARES_7 },
      update: {
        nombre: "7 estándares",
        porcentajeEvaluable: 12.7,
        porcentajeComplemento: 87.3,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoGrupoMinisterial.ESTANDARES_7,
        nombre: "7 estándares",
        porcentajeEvaluable: 12.7,
        porcentajeComplemento: 87.3,
      },
    }),
    prisma.grupoMinisterial.upsert({
      where: { codigo: CodigoGrupoMinisterial.ESTANDARES_21 },
      update: {
        nombre: "21 estándares",
        porcentajeEvaluable: 37.75,
        porcentajeComplemento: 62.25,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoGrupoMinisterial.ESTANDARES_21,
        nombre: "21 estándares",
        porcentajeEvaluable: 37.75,
        porcentajeComplemento: 62.25,
      },
    }),
    prisma.grupoMinisterial.upsert({
      where: { codigo: CodigoGrupoMinisterial.ESTANDARES_60 },
      update: {
        nombre: "60 estándares",
        porcentajeEvaluable: 100,
        porcentajeComplemento: 0,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoGrupoMinisterial.ESTANDARES_60,
        nombre: "60 estándares",
        porcentajeEvaluable: 100,
        porcentajeComplemento: 0,
      },
    }),
  ]);

  const categoriasGestion = await Promise.all([
    prisma.categoriaGestion.upsert({
      where: { codigo: CodigoCategoriaGestion.DOCUMENTAL },
      update: {
        nombre: "Gestión documental",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoCategoriaGestion.DOCUMENTAL,
        nombre: "Gestión documental",
      },
    }),
    prisma.categoriaGestion.upsert({
      where: { codigo: CodigoCategoriaGestion.INTERVENCION },
      update: {
        nombre: "Gestión a la intervención",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoCategoriaGestion.INTERVENCION,
        nombre: "Gestión a la intervención",
      },
    }),
    prisma.categoriaGestion.upsert({
      where: { codigo: CodigoCategoriaGestion.EMERGENCIAS },
      update: {
        nombre: "Gestión a emergencias",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        codigo: CodigoCategoriaGestion.EMERGENCIAS,
        nombre: "Gestión a emergencias",
      },
    }),
  ]);

  const documental = categoriasGestion.find(
    (item) => item.codigo === CodigoCategoriaGestion.DOCUMENTAL
  )!;
  const intervencion = categoriasGestion.find(
    (item) => item.codigo === CodigoCategoriaGestion.INTERVENCION
  )!;

  const estandarCopasst = await prisma.estandar.upsert({
    where: { codigo: "116" },
    update: {
      categoriaEstandarId: categoriaRecursos.id,
      nombre: "Conformación COPASST/Vigía",
      orden: 1,
      calificacionMinisterialEsperada: 0.5,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      categoriaEstandarId: categoriaRecursos.id,
      codigo: "116",
      nombre: "Conformación COPASST/Vigía",
      orden: 1,
      calificacionMinisterialEsperada: 0.5,
    },
  });

  const estandarPeligros = await prisma.estandar.upsert({
    where: { codigo: "412" },
    update: {
      categoriaEstandarId: categoriaPeligros.id,
      nombre:
        "Identificación de peligros con participación de todos los niveles",
      orden: 1,
      calificacionMinisterialEsperada: 4,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      categoriaEstandarId: categoriaPeligros.id,
      codigo: "412",
      nombre:
        "Identificación de peligros con participación de todos los niveles",
      orden: 1,
      calificacionMinisterialEsperada: 4,
    },
  });

  await prisma.estandarGrupoMinisterial.createMany({
    data: [
      ...grupos.map((grupo) => ({
        estandarId: estandarCopasst.id,
        grupoMinisterialId: grupo.id,
      })),
      ...grupos.map((grupo) => ({
        estandarId: estandarPeligros.id,
        grupoMinisterialId: grupo.id,
      })),
    ],
    skipDuplicates: true,
  });

  const aspectoCopasst = await prisma.aspecto.upsert({
    where: { codigo: "1161" },
    update: {
      estandarId: estandarCopasst.id,
      nombre:
        "Soportes de convocatoria, elección y conformación del COPASST o Vigía",
      orden: 1,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      estandarId: estandarCopasst.id,
      codigo: "1161",
      nombre:
        "Soportes de convocatoria, elección y conformación del COPASST o Vigía",
      orden: 1,
    },
  });

  const aspectoPeligros = await prisma.aspecto.upsert({
    where: { codigo: "41231" },
    update: {
      estandarId: estandarPeligros.id,
      nombre:
        "Revisión, seguimiento y actualización de la matriz de peligros",
      orden: 1,
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      estandarId: estandarPeligros.id,
      codigo: "41231",
      nombre:
        "Revisión, seguimiento y actualización de la matriz de peligros",
      orden: 1,
    },
  });

  await Promise.all([
    prisma.planAccionEspecifico.upsert({
      where: { aspectoId: aspectoCopasst.id },
      update: {
        descripcion:
          "Convocar, elegir y conformar el COPASST o Vigía y formalizarlo mediante acta.",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoCopasst.id,
        descripcion:
          "Convocar, elegir y conformar el COPASST o Vigía y formalizarlo mediante acta.",
      },
    }),
    prisma.planAccionEspecifico.upsert({
      where: { aspectoId: aspectoPeligros.id },
      update: {
        descripcion:
          "Revisar, hacer seguimiento y actualizar la matriz de peligros.",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoPeligros.id,
        descripcion:
          "Revisar, hacer seguimiento y actualizar la matriz de peligros.",
      },
    }),
  ]);

  await Promise.all([
    prisma.configuracionAspecto.upsert({
      where: { aspectoId: aspectoCopasst.id },
      update: {
        documentoActualizacionPeriodica: true,
        incluirInformeEstadoTareas: true,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoCopasst.id,
        documentoActualizacionPeriodica: true,
        incluirInformeEstadoTareas: true,
      },
    }),
    prisma.configuracionAspecto.upsert({
      where: { aspectoId: aspectoPeligros.id },
      update: {
        esEvergreen: true,
        bloqueEvergreen: BloqueEvergreen.SEGUNDO_CUATRIMESTRE,
        documentoActualizacionPeriodica: true,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoPeligros.id,
        esEvergreen: true,
        bloqueEvergreen: BloqueEvergreen.SEGUNDO_CUATRIMESTRE,
        documentoActualizacionPeriodica: true,
      },
    }),
    prisma.configuracionVigenciaAspecto.upsert({
      where: { aspectoId: aspectoCopasst.id },
      update: {
        tipoFechaBase: TipoFechaBaseVigencia.FECHA_DOCUMENTO,
        fuentePeriodicidad: FuentePeriodicidad.NORMATIVA,
        cantidad: 2,
        unidad: UnidadPeriodicidad.ANIO,
        diasAlertaPrevia: 30,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoCopasst.id,
        tipoFechaBase: TipoFechaBaseVigencia.FECHA_DOCUMENTO,
        fuentePeriodicidad: FuentePeriodicidad.NORMATIVA,
        cantidad: 2,
        unidad: UnidadPeriodicidad.ANIO,
        diasAlertaPrevia: 30,
      },
    }),
    prisma.configuracionVigenciaAspecto.upsert({
      where: { aspectoId: aspectoPeligros.id },
      update: {
        tipoFechaBase: TipoFechaBaseVigencia.FECHA_DOCUMENTO,
        fuentePeriodicidad: FuentePeriodicidad.CONFIGURACION_TECNICA,
        cantidad: 1,
        unidad: UnidadPeriodicidad.ANIO,
        diasAlertaPrevia: 30,
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoPeligros.id,
        tipoFechaBase: TipoFechaBaseVigencia.FECHA_DOCUMENTO,
        fuentePeriodicidad: FuentePeriodicidad.CONFIGURACION_TECNICA,
        cantidad: 1,
        unidad: UnidadPeriodicidad.ANIO,
        diasAlertaPrevia: 30,
      },
    }),
    prisma.configuracionEvidenciaAspecto.upsert({
      where: { aspectoId: aspectoCopasst.id },
      update: {
        requiereEvidencia: true,
        descripcionEvidencia:
          "Actas de convocatoria, elección y conformación.",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoCopasst.id,
        requiereEvidencia: true,
        descripcionEvidencia:
          "Actas de convocatoria, elección y conformación.",
      },
    }),
    prisma.configuracionRevisionTecnica.upsert({
      where: { aspectoId: aspectoPeligros.id },
      update: {
        requiereRevisionTecnica: true,
        observaciones:
          "La matriz de peligros requiere validación técnica posterior.",
        estado: EstadoRegistro.ACTIVO,
      },
      create: {
        aspectoId: aspectoPeligros.id,
        requiereRevisionTecnica: true,
        observaciones:
          "La matriz de peligros requiere validación técnica posterior.",
      },
    }),
  ]);

  const procesoCopasst = await prisma.proceso.upsert({
    where: { nombre: "24. COPASST" },
    update: {
      codigo: "PROC-24",
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      codigo: "PROC-24",
      nombre: "24. COPASST",
    },
  });

  const procesoPeligros = await prisma.proceso.upsert({
    where: { nombre: "8. MATRIZ DE PELIGROS" },
    update: {
      codigo: "PROC-08",
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      codigo: "PROC-08",
      nombre: "8. MATRIZ DE PELIGROS",
    },
  });

  const version = await prisma.versionSupermatriz.upsert({
    where: { nombre: "Supermatriz base 2026" },
    update: {
      descripcion: "Versión de prueba para validar el módulo inicial.",
      estado: EstadoVersionSupermatriz.VIGENTE,
      vigenteDesde: new Date("2026-01-01T00:00:00.000Z"),
    },
    create: {
      nombre: "Supermatriz base 2026",
      descripcion: "Versión de prueba para validar el módulo inicial.",
      estado: EstadoVersionSupermatriz.VIGENTE,
      vigenteDesde: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  const tareaCopasst = await prisma.supermatrizTarea.upsert({
    where: {
      versionSupermatrizId_aspectoId_procesoId: {
        versionSupermatrizId: version.id,
        aspectoId: aspectoCopasst.id,
        procesoId: procesoCopasst.id,
      },
    },
    update: {
      codigo: "SM-DEMO-001",
      orden: 1,
      responsableActividad: "Responsable del SG-SST, COPASST y Gerencia",
      fundamentosSoportes:
        "Actas de convocatoria, elección, conteo de votos y conformación.",
      metasEstandar:
        "Conformar el COPASST y conservar sus soportes vigentes.",
      recursosAdministrativos:
        "Disponibilidad de tiempo, espacios y equipos de trabajo.",
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      versionSupermatrizId: version.id,
      aspectoId: aspectoCopasst.id,
      procesoId: procesoCopasst.id,
      codigo: "SM-DEMO-001",
      orden: 1,
      responsableActividad: "Responsable del SG-SST, COPASST y Gerencia",
      fundamentosSoportes:
        "Actas de convocatoria, elección, conteo de votos y conformación.",
      metasEstandar:
        "Conformar el COPASST y conservar sus soportes vigentes.",
      recursosAdministrativos:
        "Disponibilidad de tiempo, espacios y equipos de trabajo.",
    },
  });

  const tareaPeligros = await prisma.supermatrizTarea.upsert({
    where: {
      versionSupermatrizId_aspectoId_procesoId: {
        versionSupermatrizId: version.id,
        aspectoId: aspectoPeligros.id,
        procesoId: procesoPeligros.id,
      },
    },
    update: {
      codigo: "SM-DEMO-002",
      orden: 2,
      ejecucion:
        "Validar cargos, procesos, peligros, controles y fecha documental.",
      responsableActividad: "Profesional SST",
      fundamentosSoportes: "Matriz de identificación de peligros actualizada.",
      metasEstandar:
        "Identificar y valorar los peligros de todos los procesos.",
      recursosAdministrativos:
        "Equipos, papelería, entrevistas y disponibilidad de tiempo.",
      estado: EstadoRegistro.ACTIVO,
    },
    create: {
      versionSupermatrizId: version.id,
      aspectoId: aspectoPeligros.id,
      procesoId: procesoPeligros.id,
      codigo: "SM-DEMO-002",
      orden: 2,
      ejecucion:
        "Validar cargos, procesos, peligros, controles y fecha documental.",
      responsableActividad: "Profesional SST",
      fundamentosSoportes: "Matriz de identificación de peligros actualizada.",
      metasEstandar:
        "Identificar y valorar los peligros de todos los procesos.",
      recursosAdministrativos:
        "Equipos, papelería, entrevistas y disponibilidad de tiempo.",
    },
  });

  await prisma.supermatrizTareaCategoriaGestion.createMany({
    data: [
      {
        supermatrizTareaId: tareaCopasst.id,
        categoriaGestionId: documental.id,
      },
      {
        supermatrizTareaId: tareaCopasst.id,
        categoriaGestionId: intervencion.id,
      },
      {
        supermatrizTareaId: tareaPeligros.id,
        categoriaGestionId: documental.id,
      },
      {
        supermatrizTareaId: tareaPeligros.id,
        categoriaGestionId: intervencion.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed de Supermatriz completado.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed de Supermatriz:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
