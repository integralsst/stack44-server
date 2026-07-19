import "dotenv/config";

import { createHash } from "node:crypto";

import {
  BloqueEvergreen,
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  EstadoRegistro,
  EstadoVersionSupermatriz,
  FuentePeriodicidad,
  ModalidadGestion,
  PrismaClient,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

const prisma = new PrismaClient();

type CodigoPhva =
  | "PLANEAR"
  | "HACER"
  | "VERIFICAR"
  | "ACTUAR";

type DefinicionTarea = {
  cicloPhva: CodigoPhva;

  categoria: {
    codigo: string;
    nombre: string;
    descripcion: string;
    orden: number;
    porcentajeEsperado: string;
  };

  estandar: {
    codigo: string;
    nombre: string;
    descripcion: string;
    orden: number;
  };

  aspecto: {
    codigo: string;
    nombre: string;
    descripcion: string;
    orden: number;
  };

  planAccion: string;

  proceso: {
    codigo: string;
    nombre: string;
    descripcion: string;
  };

  tarea: {
    codigo: string;
    orden: number;
    ejecucion: string;
    fundamentosSoportes: string;
    responsableActividad: string;
    metasEstandar: string;
    recursosAdministrativos: string;
  };

  categoriasGestion: CodigoCategoriaGestion[];

  configuracion: {
    esEvergreen: boolean;
    bloqueEvergreen?: BloqueEvergreen;
    documentoActualizacionPeriodica: boolean;
    tareaEjecucionCotidiana: boolean;
    incluirInformeEstadoTareas: boolean;
    permiteNoAplica: boolean;
  };

  vigencia: {
    cantidad: number;
    unidad: UnidadPeriodicidad;
    diasAlertaPrevia: number;
    descripcionRegla: string;
  };

  evidencia: {
    requiereEvidencia: boolean;
    descripcionEvidencia: string;
    visibleClienteDefault: boolean;
  };

  revisionTecnica: {
    requiereRevisionTecnica: boolean;
    observaciones: string | null;
  };

  tareaCotidiana?: {
    cantidadObjetivo: number;
    unidad: UnidadPeriodicidad;
    descripcion: string;
  };

  reglaAprobacion?: {
    modalidad: ModalidadGestion;
    tipoActividad: string;
    criterio: string;
  };

  palabrasClave: string[];

  requisitoNormativo: {
    norma: string;
    articulo: string;
    descripcion: string;
  };
};

const VERSION_NOMBRE =
  "Supermatriz base de prueba 2026";

const VIGENTE_DESDE =
  new Date("2026-01-01T00:00:00.000Z");

const VIGENTE_HASTA =
  new Date("2026-12-31T00:00:00.000Z");

const ciclosPhva = [
  {
    codigo: "PLANEAR" as const,
    nombre: "Planear",
    orden: 1,
    porcentajeEsperado: "25.00",
  },
  {
    codigo: "HACER" as const,
    nombre: "Hacer",
    orden: 2,
    porcentajeEsperado: "60.00",
  },
  {
    codigo: "VERIFICAR" as const,
    nombre: "Verificar",
    orden: 3,
    porcentajeEsperado: "5.00",
  },
  {
    codigo: "ACTUAR" as const,
    nombre: "Actuar",
    orden: 4,
    porcentajeEsperado: "10.00",
  },
];

const categoriasGestion = [
  {
    codigo:
      CodigoCategoriaGestion.DOCUMENTAL,
    nombre: "Gestión documental",
    descripcion:
      "Actividades relacionadas con elaboración, actualización, control y custodia documental.",
  },
  {
    codigo:
      CodigoCategoriaGestion.INTERVENCION,
    nombre: "Gestión de intervención",
    descripcion:
      "Actividades de campo, acompañamiento, capacitación, inspección e intervención.",
  },
  {
    codigo:
      CodigoCategoriaGestion.EMERGENCIAS,
    nombre: "Gestión de emergencias",
    descripcion:
      "Actividades relacionadas con prevención, preparación y respuesta ante emergencias.",
  },
];

const gruposMinisteriales = [
  {
    codigo:
      CodigoGrupoMinisterial.ESTANDARES_7,
    nombre: "7 estándares",
  },
  {
    codigo:
      CodigoGrupoMinisterial.ESTANDARES_21,
    nombre: "21 estándares",
  },
  {
    codigo:
      CodigoGrupoMinisterial.ESTANDARES_60,
    nombre: "60 estándares",
  },
];

const definiciones: DefinicionTarea[] = [
  {
    cicloPhva: "PLANEAR",

    categoria: {
      codigo: "CAT-RECURSOS",
      nombre: "Recursos",
      descripcion:
        "Recursos financieros, técnicos, humanos y administrativos requeridos para el SG-SST.",
      orden: 1,
      porcentajeEsperado: "10.00",
    },

    estandar: {
      codigo: "EST-DEMO-001",
      nombre:
        "Asignación de responsabilidades del SG-SST",
      descripcion:
        "Definición de responsabilidades, autoridades y recursos para la gestión del sistema.",
      orden: 1,
    },

    aspecto: {
      codigo: "ASP-DEMO-001",
      nombre:
        "Responsabilidades documentadas y comunicadas",
      descripcion:
        "Verificación de la definición, documentación y comunicación de responsabilidades del SG-SST.",
      orden: 1,
    },

    planAccion:
      "Definir, aprobar, comunicar y mantener actualizadas las responsabilidades del SG-SST.",

    proceso: {
      codigo: "PROC-DEMO-001",
      nombre: "Planeación del SG-SST",
      descripcion:
        "Proceso de definición de responsables, objetivos, recursos y lineamientos del sistema.",
    },

    tarea: {
      codigo: "SM-DEMO-001",
      orden: 1,
      ejecucion:
        "Revisar la estructura organizacional, actualizar la matriz de responsabilidades y comunicarla a las partes involucradas.",
      fundamentosSoportes:
        "Documento de asignación de responsabilidades, organigrama, perfiles de cargo y registros de comunicación.",
      responsableActividad:
        "Responsable del SG-SST",
      metasEstandar:
        "Mantener el 100 % de las responsabilidades definidas, aprobadas y comunicadas.",
      recursosAdministrativos:
        "Tiempo del equipo directivo, herramientas ofimáticas y repositorio documental.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.PRIMER_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: false,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: false,
    },

    vigencia: {
      cantidad: 12,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 30,
      descripcionRegla:
        "Revisión anual o cuando cambie la estructura, los cargos o las responsabilidades.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Documento aprobado de responsabilidades y constancias de comunicación.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: false,
      observaciones: null,
    },

    palabrasClave: [
      "responsabilidades",
      "roles",
      "autoridad",
      "SG-SST",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.8",
      descripcion:
        "Obligaciones de los empleadores frente al Sistema de Gestión de Seguridad y Salud en el Trabajo.",
    },
  },

  {
    cicloPhva: "PLANEAR",

    categoria: {
      codigo: "CAT-GESTION-INTEGRAL",
      nombre: "Gestión integral del SG-SST",
      descripcion:
        "Planeación, objetivos, evaluación inicial y plan anual del sistema.",
      orden: 2,
      porcentajeEsperado: "15.00",
    },

    estandar: {
      codigo: "EST-DEMO-002",
      nombre: "Plan anual de trabajo",
      descripcion:
        "Definición de actividades, responsables, recursos y cronograma anual del SG-SST.",
      orden: 2,
    },

    aspecto: {
      codigo: "ASP-DEMO-002",
      nombre:
        "Plan anual formulado, aprobado y con seguimiento",
      descripcion:
        "Verificación de la formulación, aprobación, ejecución y seguimiento del plan anual.",
      orden: 1,
    },

    planAccion:
      "Formular el plan anual de trabajo con objetivos, metas, responsables, recursos, cronograma e indicadores.",

    proceso: {
      codigo: "PROC-DEMO-002",
      nombre: "Plan anual de trabajo",
      descripcion:
        "Proceso para programar y controlar las actividades anuales del SG-SST.",
    },

    tarea: {
      codigo: "SM-DEMO-002",
      orden: 2,
      ejecucion:
        "Consolidar necesidades, definir actividades, asignar responsables, aprobar el plan y realizar seguimiento periódico.",
      fundamentosSoportes:
        "Plan anual firmado, cronograma, presupuesto, actas de seguimiento e indicadores.",
      responsableActividad:
        "Responsable del SG-SST y representante legal",
      metasEstandar:
        "Ejecutar como mínimo el 90 % de las actividades programadas durante el periodo.",
      recursosAdministrativos:
        "Presupuesto aprobado, disponibilidad de responsables y herramienta de seguimiento.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
      CodigoCategoriaGestion.INTERVENCION,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.PRIMER_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: false,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: false,
    },

    vigencia: {
      cantidad: 12,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 45,
      descripcionRegla:
        "El plan corresponde al periodo fiscal del 1 de enero al 31 de diciembre.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Plan anual aprobado y soportes de seguimiento a su ejecución.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: false,
      observaciones: null,
    },

    palabrasClave: [
      "plan anual",
      "cronograma",
      "metas",
      "recursos",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.17",
      descripcion:
        "Planificación del Sistema de Gestión de Seguridad y Salud en el Trabajo.",
    },
  },

  {
    cicloPhva: "HACER",

    categoria: {
      codigo: "CAT-SALUD",
      nombre: "Gestión de la salud",
      descripcion:
        "Actividades de medicina preventiva y del trabajo, vigilancia y promoción de la salud.",
      orden: 1,
      porcentajeEsperado: "20.00",
    },

    estandar: {
      codigo: "EST-DEMO-003",
      nombre:
        "Medicina preventiva y del trabajo",
      descripcion:
        "Gestión de condiciones de salud, evaluaciones médicas y acciones preventivas.",
      orden: 1,
    },

    aspecto: {
      codigo: "ASP-DEMO-003",
      nombre:
        "Seguimiento a las condiciones de salud",
      descripcion:
        "Verificación del seguimiento a recomendaciones médicas, restricciones y programas de vigilancia.",
      orden: 1,
    },

    planAccion:
      "Realizar seguimiento documentado a condiciones de salud, recomendaciones, restricciones y programas de vigilancia epidemiológica.",

    proceso: {
      codigo: "PROC-DEMO-003",
      nombre:
        "Medicina preventiva y del trabajo",
      descripcion:
        "Proceso de seguimiento a las condiciones de salud de la población trabajadora.",
    },

    tarea: {
      codigo: "SM-DEMO-003",
      orden: 3,
      ejecucion:
        "Consolidar recomendaciones, efectuar seguimiento, coordinar acciones y conservar evidencias de cierre.",
      fundamentosSoportes:
        "Conceptos de aptitud, recomendaciones médicas, registros de seguimiento y programas de vigilancia.",
      responsableActividad:
        "Médico laboral y responsable del SG-SST",
      metasEstandar:
        "Realizar seguimiento al 100 % de las recomendaciones y restricciones vigentes.",
      recursosAdministrativos:
        "Profesional de medicina laboral, base de seguimiento y canales de comunicación.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
      CodigoCategoriaGestion.INTERVENCION,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.SEGUNDO_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: true,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: true,
    },

    vigencia: {
      cantidad: 1,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 7,
      descripcionRegla:
        "Seguimiento mensual mientras existan recomendaciones o restricciones vigentes.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Registro de seguimiento, comunicaciones y soportes de cumplimiento.",
      visibleClienteDefault: false,
    },

    revisionTecnica: {
      requiereRevisionTecnica: true,
      observaciones:
        "La información sensible debe manejarse con acceso restringido y validación profesional.",
    },

    tareaCotidiana: {
      cantidadObjetivo: 1,
      unidad: UnidadPeriodicidad.MES,
      descripcion:
        "Realizar como mínimo una revisión mensual del estado de recomendaciones y restricciones.",
    },

    palabrasClave: [
      "salud",
      "recomendaciones médicas",
      "restricciones",
      "vigilancia",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.12",
      descripcion:
        "Documentación y conservación de registros del SG-SST.",
    },
  },

  {
    cicloPhva: "HACER",

    categoria: {
      codigo: "CAT-PELIGROS",
      nombre:
        "Gestión de peligros y riesgos",
      descripcion:
        "Identificación de peligros, evaluación de riesgos y definición de controles.",
      orden: 2,
      porcentajeEsperado: "30.00",
    },

    estandar: {
      codigo: "EST-DEMO-004",
      nombre:
        "Identificación de peligros y valoración de riesgos",
      descripcion:
        "Gestión de la matriz de peligros y controles con participación de los trabajadores.",
      orden: 2,
    },

    aspecto: {
      codigo: "ASP-DEMO-004",
      nombre:
        "Matriz de peligros actualizada",
      descripcion:
        "Verificación de la identificación de peligros, valoración de riesgos y definición de controles.",
      orden: 1,
    },

    planAccion:
      "Actualizar la matriz de peligros con participación de los trabajadores y definir controles según la jerarquía de intervención.",

    proceso: {
      codigo: "PROC-DEMO-004",
      nombre: "Matriz de peligros",
      descripcion:
        "Proceso de identificación, evaluación, priorización y control de riesgos.",
    },

    tarea: {
      codigo: "SM-DEMO-004",
      orden: 4,
      ejecucion:
        "Revisar procesos, tareas, cambios, incidentes y condiciones de trabajo; actualizar peligros, valoraciones y controles.",
      fundamentosSoportes:
        "Matriz de peligros, registros de participación, inspecciones, mediciones y planes de intervención.",
      responsableActividad:
        "Profesional SST",
      metasEstandar:
        "Mantener evaluados el 100 % de los procesos, actividades y centros de trabajo.",
      recursosAdministrativos:
        "Profesional competente, metodología de valoración, participación de trabajadores y herramientas de campo.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
      CodigoCategoriaGestion.INTERVENCION,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.SEGUNDO_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: false,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: false,
    },

    vigencia: {
      cantidad: 12,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 30,
      descripcionRegla:
        "Revisión anual y actualización anticipada cuando existan cambios, accidentes o nuevos peligros.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Matriz vigente, soportes de participación, inspecciones y documentos utilizados para la valoración.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: true,
      observaciones:
        "La evaluación final debe ser validada por un profesional con competencia técnica.",
    },

    reglaAprobacion: {
      modalidad:
        ModalidadGestion.SEGUIMIENTO_PUNTUAL,
      tipoActividad:
        "Actualización de matriz de peligros",
      criterio:
        "Requiere aprobación técnica cuando se modifican metodologías, niveles de riesgo o controles críticos.",
    },

    palabrasClave: [
      "peligros",
      "riesgos",
      "controles",
      "matriz",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.15",
      descripcion:
        "Identificación de peligros, evaluación y valoración de los riesgos.",
    },
  },

  {
    cicloPhva: "HACER",

    categoria: {
      codigo: "CAT-AMENAZAS",
      nombre: "Gestión de amenazas",
      descripcion:
        "Prevención, preparación y respuesta ante emergencias.",
      orden: 3,
      porcentajeEsperado: "10.00",
    },

    estandar: {
      codigo: "EST-DEMO-005",
      nombre:
        "Prevención, preparación y respuesta ante emergencias",
      descripcion:
        "Gestión del plan de emergencias, brigada, recursos, simulacros y mejora.",
      orden: 3,
    },

    aspecto: {
      codigo: "ASP-DEMO-005",
      nombre:
        "Plan de emergencias actualizado",
      descripcion:
        "Verificación del plan, análisis de amenazas, recursos, brigada y simulacros.",
      orden: 1,
    },

    planAccion:
      "Actualizar el plan de emergencias, fortalecer la brigada, verificar recursos y ejecutar simulacros.",

    proceso: {
      codigo: "PROC-DEMO-005",
      nombre: "Plan de emergencias",
      descripcion:
        "Proceso de prevención, preparación y respuesta ante situaciones de emergencia.",
    },

    tarea: {
      codigo: "SM-DEMO-005",
      orden: 5,
      ejecucion:
        "Actualizar análisis de amenazas, inventario de recursos, procedimientos, brigada y cronograma de simulacros.",
      fundamentosSoportes:
        "Plan de emergencias, análisis de vulnerabilidad, planos, inspecciones, registros de brigada y simulacros.",
      responsableActividad:
        "Profesional de emergencias",
      metasEstandar:
        "Mantener el plan vigente y ejecutar al menos un simulacro general durante el periodo.",
      recursosAdministrativos:
        "Brigadistas, equipos de emergencia, presupuesto, señalización y apoyo externo.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
      CodigoCategoriaGestion.EMERGENCIAS,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.TERCER_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: false,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: false,
    },

    vigencia: {
      cantidad: 12,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 30,
      descripcionRegla:
        "Revisión anual o cuando cambien instalaciones, amenazas, procesos o recursos.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Plan de emergencias, soportes de brigada, inspecciones y simulacros.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: true,
      observaciones:
        "La estructura y los procedimientos deben ser validados por personal competente en emergencias.",
    },

    palabrasClave: [
      "emergencias",
      "brigada",
      "simulacro",
      "amenazas",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.25",
      descripcion:
        "Prevención, preparación y respuesta ante emergencias.",
    },
  },

  {
    cicloPhva: "VERIFICAR",

    categoria: {
      codigo: "CAT-VERIFICACION",
      nombre: "Verificación del SG-SST",
      descripcion:
        "Auditoría, revisión, seguimiento e indicadores del sistema.",
      orden: 1,
      porcentajeEsperado: "5.00",
    },

    estandar: {
      codigo: "EST-DEMO-006",
      nombre: "Auditoría anual del SG-SST",
      descripcion:
        "Planificación, ejecución, informe y seguimiento de la auditoría interna.",
      orden: 1,
    },

    aspecto: {
      codigo: "ASP-DEMO-006",
      nombre:
        "Auditoría planificada y ejecutada",
      descripcion:
        "Verificación del programa, independencia, alcance, resultados y seguimiento de la auditoría.",
      orden: 1,
    },

    planAccion:
      "Planificar y ejecutar la auditoría interna, documentar hallazgos y realizar seguimiento a las acciones resultantes.",

    proceso: {
      codigo: "PROC-DEMO-006",
      nombre: "Auditoría interna",
      descripcion:
        "Proceso de evaluación independiente del funcionamiento y cumplimiento del SG-SST.",
    },

    tarea: {
      codigo: "SM-DEMO-006",
      orden: 6,
      ejecucion:
        "Definir alcance y criterios, designar auditor, ejecutar la auditoría, emitir informe y realizar seguimiento.",
      fundamentosSoportes:
        "Programa, plan, listas de verificación, informe, hallazgos y plan de acciones.",
      responsableActividad:
        "Auditor interno",
      metasEstandar:
        "Ejecutar el 100 % del programa anual de auditoría y gestionar todos los hallazgos.",
      recursosAdministrativos:
        "Auditor competente, disponibilidad de responsables, documentos y herramientas de auditoría.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
    ],

    configuracion: {
      esEvergreen: false,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: false,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: false,
    },

    vigencia: {
      cantidad: 12,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 45,
      descripcionRegla:
        "La auditoría debe realizarse al menos una vez durante cada periodo anual.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Programa de auditoría, informe, hallazgos, acciones y seguimiento.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: true,
      observaciones:
        "La auditoría debe conservar independencia respecto de las actividades auditadas.",
    },

    reglaAprobacion: {
      modalidad: ModalidadGestion.OFICINA,
      tipoActividad:
        "Cierre de auditoría interna",
      criterio:
        "El informe final y el cierre de hallazgos deben ser validados por el responsable autorizado.",
    },

    palabrasClave: [
      "auditoría",
      "hallazgos",
      "verificación",
      "seguimiento",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.29",
      descripcion:
        "Auditoría de cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo.",
    },
  },

  {
    cicloPhva: "ACTUAR",

    categoria: {
      codigo: "CAT-MEJORAMIENTO",
      nombre: "Mejoramiento",
      descripcion:
        "Acciones preventivas, correctivas y de mejora derivadas del seguimiento del sistema.",
      orden: 1,
      porcentajeEsperado: "10.00",
    },

    estandar: {
      codigo: "EST-DEMO-007",
      nombre:
        "Acciones preventivas y correctivas",
      descripcion:
        "Gestión de acciones derivadas de auditorías, incidentes, inspecciones y revisión gerencial.",
      orden: 1,
    },

    aspecto: {
      codigo: "ASP-DEMO-007",
      nombre:
        "Acciones con seguimiento y cierre",
      descripcion:
        "Verificación de la formulación, ejecución, eficacia y cierre de acciones de mejora.",
      orden: 1,
    },

    planAccion:
      "Registrar, asignar, ejecutar, verificar la eficacia y cerrar las acciones preventivas, correctivas y de mejora.",

    proceso: {
      codigo: "PROC-DEMO-007",
      nombre: "Mejoramiento continuo",
      descripcion:
        "Proceso para gestionar desviaciones, causas, acciones y verificación de eficacia.",
    },

    tarea: {
      codigo: "SM-DEMO-007",
      orden: 7,
      ejecucion:
        "Consolidar hallazgos, analizar causas, asignar responsables y plazos, verificar eficacia y formalizar el cierre.",
      fundamentosSoportes:
        "Planes de acción, análisis causal, evidencias de ejecución, verificaciones de eficacia y actas de cierre.",
      responsableActividad:
        "Responsable del SG-SST y líderes de proceso",
      metasEstandar:
        "Cerrar dentro del plazo el 100 % de las acciones y verificar su eficacia.",
      recursosAdministrativos:
        "Responsables de proceso, herramienta de seguimiento, presupuesto y evidencias.",
    },

    categoriasGestion: [
      CodigoCategoriaGestion.DOCUMENTAL,
      CodigoCategoriaGestion.INTERVENCION,
    ],

    configuracion: {
      esEvergreen: true,
      bloqueEvergreen:
        BloqueEvergreen.TERCER_CUATRIMESTRE,
      documentoActualizacionPeriodica: true,
      tareaEjecucionCotidiana: true,
      incluirInformeEstadoTareas: true,
      permiteNoAplica: true,
    },

    vigencia: {
      cantidad: 1,
      unidad: UnidadPeriodicidad.MES,
      diasAlertaPrevia: 7,
      descripcionRegla:
        "Seguimiento mensual mientras existan acciones abiertas.",
    },

    evidencia: {
      requiereEvidencia: true,
      descripcionEvidencia:
        "Plan de acción, soportes de ejecución, verificación de eficacia y cierre.",
      visibleClienteDefault: true,
    },

    revisionTecnica: {
      requiereRevisionTecnica: false,
      observaciones: null,
    },

    tareaCotidiana: {
      cantidadObjetivo: 1,
      unidad: UnidadPeriodicidad.MES,
      descripcion:
        "Realizar seguimiento mensual al estado de las acciones abiertas.",
    },

    palabrasClave: [
      "mejoramiento",
      "acciones correctivas",
      "eficacia",
      "cierre",
    ],

    requisitoNormativo: {
      norma: "Decreto 1072 de 2015",
      articulo: "2.2.4.6.33",
      descripcion:
        "Acciones preventivas y correctivas derivadas del SG-SST.",
    },
  },
];


function claveRequisitoNormativo(
  norma: string,
  articulo: string | null
): string {
  return createHash("sha256")
    .update(
      `${norma.trim().toLowerCase()}|${(articulo ?? "")
        .trim()
        .toLowerCase()}`
    )
    .digest("hex");
}

async function main(): Promise<void> {
  console.log("");
  console.log("🌱 Iniciando seed versionado de la Supermatriz...");

  // ====================================================
  // 1. VERSIÓN BASE
  // ====================================================

  const version =
    await prisma.versionSupermatriz.upsert({
      where: {
        nombre: VERSION_NOMBRE,
      },
      update: {
        descripcion:
          "Versión de prueba editable para validar el CRUD completo de la Supermatriz maestra.",
        estado:
          EstadoVersionSupermatriz.BORRADOR,
        vigenteDesde: VIGENTE_DESDE,
        vigenteHasta: VIGENTE_HASTA,
      },
      create: {
        nombre: VERSION_NOMBRE,
        descripcion:
          "Versión de prueba editable para validar el CRUD completo de la Supermatriz maestra.",
        estado:
          EstadoVersionSupermatriz.BORRADOR,
        vigenteDesde: VIGENTE_DESDE,
        vigenteHasta: VIGENTE_HASTA,
      },
      select: {
        id: true,
        nombre: true,
      },
    });

  console.log(
    `✅ Versión borrador disponible: ${version.nombre}`
  );

  // ====================================================
  // 2. CICLOS PHVA DE LA VERSIÓN
  // ====================================================

  const ciclosPorCodigo =
    new Map<CodigoPhva, number>();

  for (const ciclo of ciclosPhva) {
    const registro =
      await prisma.cicloPhva.upsert({
        where: {
          versionSupermatrizId_codigo: {
            versionSupermatrizId:
              version.id,
            codigo: ciclo.codigo,
          },
        },
        update: {
          nombre: ciclo.nombre,
          orden: ciclo.orden,
          porcentajeEsperado:
            ciclo.porcentajeEsperado,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          versionSupermatrizId:
            version.id,
          codigo: ciclo.codigo,
          nombre: ciclo.nombre,
          orden: ciclo.orden,
          porcentajeEsperado:
            ciclo.porcentajeEsperado,
          estado: EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
          codigo: true,
        },
      });

    ciclosPorCodigo.set(
      registro.codigo as CodigoPhva,
      registro.id
    );
  }

  console.log(
    "✅ Ciclos PHVA versionados creados o actualizados."
  );

  // ====================================================
  // 3. CATÁLOGOS TÉCNICOS GLOBALES
  // ====================================================

  const categoriasGestionPorCodigo =
    new Map<
      CodigoCategoriaGestion,
      number
    >();

  for (
    const categoria of categoriasGestion
  ) {
    const registro =
      await prisma.categoriaGestion.upsert({
        where: {
          codigo: categoria.codigo,
        },
        update: {
          nombre: categoria.nombre,
          descripcion:
            categoria.descripcion,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          codigo: categoria.codigo,
          nombre: categoria.nombre,
          descripcion:
            categoria.descripcion,
          estado: EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
          codigo: true,
        },
      });

    categoriasGestionPorCodigo.set(
      registro.codigo,
      registro.id
    );
  }

  const gruposPorCodigo =
    new Map<
      CodigoGrupoMinisterial,
      number
    >();

  for (
    const grupo of gruposMinisteriales
  ) {
    const registro =
      await prisma.grupoMinisterial.upsert({
        where: {
          codigo: grupo.codigo,
        },
        update: {
          nombre: grupo.nombre,
          porcentajeEvaluable: "100.00",
          porcentajeComplemento: "0.00",
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          codigo: grupo.codigo,
          nombre: grupo.nombre,
          porcentajeEvaluable: "100.00",
          porcentajeComplemento: "0.00",
          estado: EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
          codigo: true,
        },
      });

    gruposPorCodigo.set(
      registro.codigo,
      registro.id
    );
  }

  console.log(
    "✅ Categorías de gestión y grupos ministeriales disponibles."
  );

  const superadmin =
    await prisma.usuario.findUnique({
      where: {
        correo:
          "superadmin@stack4four.com",
      },
      select: {
        id: true,
      },
    });

  // ====================================================
  // 4. ESTRUCTURA NORMALIZADA Y FILAS
  // ====================================================

  for (
    const definicion of definiciones
  ) {
    const cicloPhvaId =
      ciclosPorCodigo.get(
        definicion.cicloPhva
      );

    if (!cicloPhvaId) {
      throw new Error(
        `No se encontró el ciclo PHVA ${definicion.cicloPhva}.`
      );
    }

    const categoriaExistente =
      await prisma.categoriaEstandar.findFirst({
        where: {
          versionSupermatrizId: version.id,
          codigo: definicion.categoria.codigo,
        },
        select: { id: true },
      });

    const categoriaEstandar =
      categoriaExistente
        ? await prisma.categoriaEstandar.update({
            where: { id: categoriaExistente.id },
            data: {
              cicloPhvaId,
              nombre: definicion.categoria.nombre,
              descripcion: definicion.categoria.descripcion,
              orden: definicion.categoria.orden,
              porcentajeEsperado:
                definicion.categoria.porcentajeEsperado,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          })
        : await prisma.categoriaEstandar.create({
            data: {
              versionSupermatrizId: version.id,
              cicloPhvaId,
              codigo: definicion.categoria.codigo,
              nombre: definicion.categoria.nombre,
              descripcion: definicion.categoria.descripcion,
              orden: definicion.categoria.orden,
              porcentajeEsperado:
                definicion.categoria.porcentajeEsperado,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          });

    const estandarExistente =
      await prisma.estandar.findFirst({
        where: {
          versionSupermatrizId: version.id,
          codigo: definicion.estandar.codigo,
        },
        select: { id: true },
      });

    const estandar =
      estandarExistente
        ? await prisma.estandar.update({
            where: { id: estandarExistente.id },
            data: {
              categoriaEstandarId: categoriaEstandar.id,
              nombre: definicion.estandar.nombre,
              descripcion: definicion.estandar.descripcion,
              orden: definicion.estandar.orden,
              calificacionMinisterialEsperada: "0.50",
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          })
        : await prisma.estandar.create({
            data: {
              versionSupermatrizId: version.id,
              categoriaEstandarId: categoriaEstandar.id,
              codigo: definicion.estandar.codigo,
              nombre: definicion.estandar.nombre,
              descripcion: definicion.estandar.descripcion,
              orden: definicion.estandar.orden,
              calificacionMinisterialEsperada: "0.50",
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          });

    /*
     * Datos demo

    /*
     * Datos demo: cada estándar se relaciona con los tres
     * grupos únicamente para validar los filtros.
     * Esto no clasifica empresas.
     */
    for (
      const grupo of gruposMinisteriales
    ) {
      const grupoMinisterialId =
        gruposPorCodigo.get(
          grupo.codigo
        );

      if (!grupoMinisterialId) {
        throw new Error(
          `No se encontró el grupo ${grupo.codigo}.`
        );
      }

      await prisma.estandarGrupoMinisterial.upsert(
        {
          where: {
            estandarId_grupoMinisterialId:
              {
                estandarId: estandar.id,
                grupoMinisterialId,
              },
          },
          update: {},
          create: {
            estandarId: estandar.id,
            grupoMinisterialId,
          },
        }
      );
    }

    const aspectoExistente =
      await prisma.aspecto.findFirst({
        where: {
          versionSupermatrizId: version.id,
          codigo: definicion.aspecto.codigo,
        },
        select: { id: true },
      });

    const aspecto =
      aspectoExistente
        ? await prisma.aspecto.update({
            where: { id: aspectoExistente.id },
            data: {
              estandarId: estandar.id,
              nombre: definicion.aspecto.nombre,
              descripcion: definicion.aspecto.descripcion,
              orden: definicion.aspecto.orden,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          })
        : await prisma.aspecto.create({
            data: {
              versionSupermatrizId: version.id,
              estandarId: estandar.id,
              codigo: definicion.aspecto.codigo,
              nombre: definicion.aspecto.nombre,
              descripcion: definicion.aspecto.descripcion,
              orden: definicion.aspecto.orden,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          });

    await prisma.planAccionEspecifico.upsert

    await prisma.planAccionEspecifico.upsert(
      {
        where: {
          aspectoId: aspecto.id,
        },
        update: {
          descripcion:
            definicion.planAccion,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          aspectoId: aspecto.id,
          descripcion:
            definicion.planAccion,
          estado: EstadoRegistro.ACTIVO,
        },
      }
    );

    await prisma.configuracionAspecto.upsert(
      {
        where: {
          aspectoId: aspecto.id,
        },
        update: {
          esEvergreen:
            definicion.configuracion
              .esEvergreen,
          bloqueEvergreen:
            definicion.configuracion
              .bloqueEvergreen ?? null,
          documentoActualizacionPeriodica:
            definicion.configuracion
              .documentoActualizacionPeriodica,
          tareaEjecucionCotidiana:
            definicion.configuracion
              .tareaEjecucionCotidiana,
          incluirInformeEstadoTareas:
            definicion.configuracion
              .incluirInformeEstadoTareas,
          permiteNoAplica:
            definicion.configuracion
              .permiteNoAplica,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          aspectoId: aspecto.id,
          esEvergreen:
            definicion.configuracion
              .esEvergreen,
          bloqueEvergreen:
            definicion.configuracion
              .bloqueEvergreen ?? null,
          documentoActualizacionPeriodica:
            definicion.configuracion
              .documentoActualizacionPeriodica,
          tareaEjecucionCotidiana:
            definicion.configuracion
              .tareaEjecucionCotidiana,
          incluirInformeEstadoTareas:
            definicion.configuracion
              .incluirInformeEstadoTareas,
          permiteNoAplica:
            definicion.configuracion
              .permiteNoAplica,
          estado: EstadoRegistro.ACTIVO,
        },
      }
    );

    await prisma.configuracionVigenciaAspecto.upsert(
      {
        where: {
          aspectoId: aspecto.id,
        },
        update: {
          tipoFechaBase:
            TipoFechaBaseVigencia.FECHA_DOCUMENTO,
          fuentePeriodicidad:
            FuentePeriodicidad.CONFIGURACION_TECNICA,
          cantidad:
            definicion.vigencia.cantidad,
          unidad:
            definicion.vigencia.unidad,
          diasAlertaPrevia:
            definicion.vigencia
              .diasAlertaPrevia,
          permiteFechaManual: true,
          mesFechaFija: null,
          diaFechaFija: null,
          descripcionRegla:
            definicion.vigencia
              .descripcionRegla,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          aspectoId: aspecto.id,
          tipoFechaBase:
            TipoFechaBaseVigencia.FECHA_DOCUMENTO,
          fuentePeriodicidad:
            FuentePeriodicidad.CONFIGURACION_TECNICA,
          cantidad:
            definicion.vigencia.cantidad,
          unidad:
            definicion.vigencia.unidad,
          diasAlertaPrevia:
            definicion.vigencia
              .diasAlertaPrevia,
          permiteFechaManual: true,
          mesFechaFija: null,
          diaFechaFija: null,
          descripcionRegla:
            definicion.vigencia
              .descripcionRegla,
          estado: EstadoRegistro.ACTIVO,
        },
      }
    );

    await prisma.configuracionEvidenciaAspecto.upsert(
      {
        where: {
          aspectoId: aspecto.id,
        },
        update: {
          requiereEvidencia:
            definicion.evidencia
              .requiereEvidencia,
          descripcionEvidencia:
            definicion.evidencia
              .descripcionEvidencia,
          visibleClienteDefault:
            definicion.evidencia
              .visibleClienteDefault,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          aspectoId: aspecto.id,
          requiereEvidencia:
            definicion.evidencia
              .requiereEvidencia,
          descripcionEvidencia:
            definicion.evidencia
              .descripcionEvidencia,
          visibleClienteDefault:
            definicion.evidencia
              .visibleClienteDefault,
          estado: EstadoRegistro.ACTIVO,
        },
      }
    );

    await prisma.configuracionRevisionTecnica.upsert(
      {
        where: {
          aspectoId: aspecto.id,
        },
        update: {
          requiereRevisionTecnica:
            definicion.revisionTecnica
              .requiereRevisionTecnica,
          observaciones:
            definicion.revisionTecnica
              .observaciones,
          estado: EstadoRegistro.ACTIVO,
        },
        create: {
          aspectoId: aspecto.id,
          requiereRevisionTecnica:
            definicion.revisionTecnica
              .requiereRevisionTecnica,
          observaciones:
            definicion.revisionTecnica
              .observaciones,
          estado: EstadoRegistro.ACTIVO,
        },
      }
    );

    if (
      definicion.tareaCotidiana
    ) {
      await prisma.configuracionTareaCotidiana.upsert(
        {
          where: {
            aspectoId: aspecto.id,
          },
          update: {
            cantidadObjetivo:
              definicion.tareaCotidiana
                .cantidadObjetivo,
            unidad:
              definicion.tareaCotidiana
                .unidad,
            descripcion:
              definicion.tareaCotidiana
                .descripcion,
            estado: EstadoRegistro.ACTIVO,
          },
          create: {
            aspectoId: aspecto.id,
            cantidadObjetivo:
              definicion.tareaCotidiana
                .cantidadObjetivo,
            unidad:
              definicion.tareaCotidiana
                .unidad,
            descripcion:
              definicion.tareaCotidiana
                .descripcion,
            estado: EstadoRegistro.ACTIVO,
          },
        }
      );
    }

    if (
      definicion.reglaAprobacion
    ) {
      const reglaExistente =
        await prisma.reglaAprobacionGestion.findFirst(
          {
            where: {
              aspectoId: aspecto.id,
              modalidad:
                definicion.reglaAprobacion
                  .modalidad,
              tipoActividad:
                definicion.reglaAprobacion
                  .tipoActividad,
            },
            select: {
              id: true,
            },
          }
        );

      if (reglaExistente) {
        await prisma.reglaAprobacionGestion.update(
          {
            where: {
              id: reglaExistente.id,
            },
            data: {
              criterio:
                definicion.reglaAprobacion
                  .criterio,
              requiereAprobacion: true,
              vigenteDesde:
                VIGENTE_DESDE,
              vigenteHasta:
                VIGENTE_HASTA,
              estado:
                EstadoRegistro.ACTIVO,
            },
          }
        );
      } else {
        await prisma.reglaAprobacionGestion.create(
          {
            data: {
              aspectoId: aspecto.id,
              modalidad:
                definicion.reglaAprobacion
                  .modalidad,
              tipoActividad:
                definicion.reglaAprobacion
                  .tipoActividad,
              criterio:
                definicion.reglaAprobacion
                  .criterio,
              requiereAprobacion: true,
              vigenteDesde:
                VIGENTE_DESDE,
              vigenteHasta:
                VIGENTE_HASTA,
              estado:
                EstadoRegistro.ACTIVO,
            },
          }
        );
      }
    }

    const vigenciaExistente =
      await prisma.vigenciaAspecto.findFirst({
        where: {
          aspectoId: aspecto.id,
          vigenteDesde: VIGENTE_DESDE,
        },
        select: {
          id: true,
        },
      });

    if (vigenciaExistente) {
      await prisma.vigenciaAspecto.update({
        where: {
          id: vigenciaExistente.id,
        },
        data: {
          vigenteHasta:
            VIGENTE_HASTA,
          motivoDesactivacion: null,
          estado: EstadoRegistro.ACTIVO,
        },
      });
    } else {
      await prisma.vigenciaAspecto.create({
        data: {
          aspectoId: aspecto.id,
          vigenteDesde:
            VIGENTE_DESDE,
          vigenteHasta:
            VIGENTE_HASTA,
          motivoDesactivacion: null,
          estado: EstadoRegistro.ACTIVO,
        },
      });
    }

    await prisma.aspectoPalabraClave.deleteMany(
      {
        where: {
          aspectoId: aspecto.id,
        },
      }
    );

    for (
      const nombrePalabra of definicion.palabrasClave
    ) {
      const palabra =
        await prisma.palabraClave.upsert({
          where: {
            versionSupermatrizId_nombre: {
              versionSupermatrizId:
                version.id,
              nombre: nombrePalabra,
            },
          },
          update: {},
          create: {
            versionSupermatrizId:
              version.id,
            nombre: nombrePalabra,
          },
          select: {
            id: true,
          },
        });

      await prisma.aspectoPalabraClave.create(
        {
          data: {
            aspectoId: aspecto.id,
            palabraClaveId:
              palabra.id,
          },
        }
      );
    }

    const claveRequisito =
      claveRequisitoNormativo(
        definicion.requisitoNormativo.norma,
        definicion.requisitoNormativo.articulo
      );

    const requisito =
      await prisma.requisitoNormativo.upsert({
        where: {
          versionSupermatrizId_clave: {
            versionSupermatrizId:
              version.id,
            clave: claveRequisito,
          },
        },
        update: {
          norma:
            definicion.requisitoNormativo.norma,
          articulo:
            definicion.requisitoNormativo.articulo,
          descripcion:
            definicion.requisitoNormativo.descripcion,
          estado:
            EstadoRegistro.ACTIVO,
        },
        create: {
          versionSupermatrizId:
            version.id,
          clave: claveRequisito,
          norma:
            definicion.requisitoNormativo.norma,
          articulo:
            definicion.requisitoNormativo.articulo,
          descripcion:
            definicion.requisitoNormativo.descripcion,
          estado:
            EstadoRegistro.ACTIVO,
        },
        select: {
          id: true,
        },
      });

    await prisma.aspectoRequisitoNormativo.upsert(
      {
        where: {
          aspectoId_requisitoNormativoId:
            {
              aspectoId: aspecto.id,
              requisitoNormativoId:
                requisito.id,
            },
        },
        update: {},
        create: {
          aspectoId: aspecto.id,
          requisitoNormativoId:
            requisito.id,
        },
      }
    );

    const procesoExistente =
      await prisma.proceso.findFirst({
        where: {
          versionSupermatrizId: version.id,
          codigo: definicion.proceso.codigo,
        },
        select: { id: true },
      });

    const proceso =
      procesoExistente
        ? await prisma.proceso.update({
            where: { id: procesoExistente.id },
            data: {
              nombre: definicion.proceso.nombre,
              descripcion: definicion.proceso.descripcion,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          })
        : await prisma.proceso.create({
            data: {
              versionSupermatrizId: version.id,
              codigo: definicion.proceso.codigo,
              nombre: definicion.proceso.nombre,
              descripcion: definicion.proceso.descripcion,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true },
          });

    const tareaExistente =
      await prisma.supermatrizTarea.findFirst({
        where: {
          versionSupermatrizId: version.id,
          codigo: definicion.tarea.codigo,
        },
        select: { id: true },
      });

    const tarea =
      tareaExistente
        ? await prisma.supermatrizTarea.update({
            where: { id: tareaExistente.id },
            data: {
              aspectoId: aspecto.id,
              procesoId: proceso.id,
              orden: definicion.tarea.orden,
              ejecucion: definicion.tarea.ejecucion,
              fundamentosSoportes:
                definicion.tarea.fundamentosSoportes,
              responsableActividad:
                definicion.tarea.responsableActividad,
              metasEstandar: definicion.tarea.metasEstandar,
              recursosAdministrativos:
                definicion.tarea.recursosAdministrativos,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true, codigo: true },
          })
        : await prisma.supermatrizTarea.create({
            data: {
              versionSupermatrizId: version.id,
              aspectoId: aspecto.id,
              procesoId: proceso.id,
              codigo: definicion.tarea.codigo,
              orden: definicion.tarea.orden,
              ejecucion: definicion.tarea.ejecucion,
              fundamentosSoportes:
                definicion.tarea.fundamentosSoportes,
              responsableActividad:
                definicion.tarea.responsableActividad,
              metasEstandar: definicion.tarea.metasEstandar,
              recursosAdministrativos:
                definicion.tarea.recursosAdministrativos,
              estado: EstadoRegistro.ACTIVO,
            },
            select: { id: true, codigo: true },
          });

    await prisma.supermatrizTareaCategoriaGestion.deleteMany

    await prisma.supermatrizTareaCategoriaGestion.deleteMany(
      {
        where: {
          supermatrizTareaId:
            tarea.id,
        },
      }
    );

    for (
      const codigoCategoria of definicion.categoriasGestion
    ) {
      const categoriaGestionId =
        categoriasGestionPorCodigo.get(
          codigoCategoria
        );

      if (!categoriaGestionId) {
        throw new Error(
          `No se encontró la categoría de gestión ${codigoCategoria}.`
        );
      }

      await prisma.supermatrizTareaCategoriaGestion.create(
        {
          data: {
            supermatrizTareaId:
              tarea.id,
            categoriaGestionId,
          },
        }
      );
    }

    const historialExistente =
      await prisma.historialCambioSupermatriz.findFirst(
        {
          where: {
            versionSupermatrizId:
              version.id,
            tipoEntidad:
              "SupermatrizTarea",
            entidadId: tarea.id,
            accion: "SEED_INICIAL",
          },
          select: {
            id: true,
          },
        }
      );

    if (!historialExistente) {
      await prisma.historialCambioSupermatriz.create(
        {
          data: {
            versionSupermatrizId:
              version.id,
            tipoEntidad:
              "SupermatrizTarea",
            entidadId: tarea.id,
            accion: "SEED_INICIAL",
            descripcion:
              "Registro creado por el seed versionado de demostración.",
            datosDespues: {
              codigo: tarea.codigo,
              aspectoId: aspecto.id,
              procesoId: proceso.id,
              estado:
                EstadoRegistro.ACTIVO,
            },
            usuarioId:
              superadmin?.id ?? null,
          },
        }
      );
    }

    console.log(
      `   • ${definicion.tarea.codigo} — ${definicion.aspecto.nombre}`
    );
  }

  console.log("");
  console.log(
    "✅ Seed versionado de la Supermatriz completado."
  );
  console.log(
    `✅ Versión editable: ${VERSION_NOMBRE}`
  );
  console.log(
    `✅ Filas demo: ${definiciones.length}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando seed versionado de Supermatriz:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
