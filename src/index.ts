import "dotenv/config";

import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import cors from "cors";

import rutasAutenticacion from "./routes/auth.routes";
import rutasEmpresas from "./routes/company.routes";
import rutasUsuarios from "./routes/user.routes";
import rutasProfesionales from "./routes/professional.routes";
import rutasSgsst from "./routes/sgsst.routes";

const app = express();

const PUERTO = Number(process.env.PORT) || 4000;

// ======================================================
// CONFIGURACIÓN GENERAL
// ======================================================

app.disable("x-powered-by");

function normalizarOrigen(
  origen: string
): string {
  return origen.trim().replace(/\/+$/, "");
}

const origenesConfigurados = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS?.split(",") ??
    []),
]
  .filter(
    (origen): origen is string =>
      typeof origen === "string" &&
      Boolean(origen.trim())
  )
  .map(normalizarOrigen);

const origenesPermitidos = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  ...origenesConfigurados,
]);

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: (origen, callback) => {
      /*
       * Postman, curl, Render Health Check y algunos
       * servicios internos no envían el encabezado Origin.
       */
      if (!origen) {
        callback(null, true);
        return;
      }

      const origenNormalizado =
        normalizarOrigen(origen);

      if (
        origenesPermitidos.has(
          origenNormalizado
        )
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Origen no permitido por CORS: ${origen}`
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ======================================================
// PARSEO DE SOLICITUDES
// ======================================================

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);

// ======================================================
// RUTAS DE ESTADO
// ======================================================

app.get(
  "/",
  (_req: Request, res: Response) => {
    res.json({
      mensaje:
        "Servidor Stack44 operativo 🚀",

      entorno:
        process.env.NODE_ENV ??
        "development",

      api: {
        autenticacion:
          "/api/autenticacion",

        empresas:
          "/api/empresas",

        usuarios:
          "/api/usuarios",

        profesionales:
          "/api/profesionales",

        sgsst:
          "/api/sgsst",
      },
    });
  }
);

const responderEstado = (
  _req: Request,
  res: Response
): void => {
  const fechaHora =
    new Date().toISOString();

  res.status(200).json({
    estado: "ok",
    status: "ok",
    fechaHora,
    timestamp: fechaHora,
  });
};

app.get("/salud", responderEstado);
app.get("/health", responderEstado);

// ======================================================
// RUTAS PRINCIPALES EN ESPAÑOL
// ======================================================

app.use(
  "/api/autenticacion",
  rutasAutenticacion
);

app.use(
  "/api/empresas",
  rutasEmpresas
);

app.use(
  "/api/usuarios",
  rutasUsuarios
);

app.use(
  "/api/profesionales",
  rutasProfesionales
);

/*
 * La supermatriz queda disponible desde:
 *
 * /api/sgsst/catalogo
 * /api/sgsst/configuraciones
 * /api/sgsst/evaluaciones
 * /api/sgsst/planes-accion
 */
app.use(
  "/api/sgsst",
  rutasSgsst
);

// ======================================================
// ALIAS TEMPORALES PARA EL FRONTEND ACTUAL
// ======================================================
// Se eliminarán cuando terminemos de traducir el frontend.

app.use(
  "/api/auth",
  rutasAutenticacion
);

app.use(
  "/api/companies",
  rutasEmpresas
);

app.use(
  "/api/users",
  rutasUsuarios
);

app.use(
  "/api/professionals",
  rutasProfesionales
);

// ======================================================
// RUTA NO ENCONTRADA
// ======================================================

app.use(
  (
    req: Request,
    res: Response
  ) => {
    res.status(404).json({
      error: "Ruta no encontrada.",
      metodo: req.method,
      ruta: req.originalUrl,
    });
  }
);

// ======================================================
// MANEJO GLOBAL DE ERRORES
// ======================================================

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "[ERROR-GLOBAL]",
      error
    );

    if (
      error.message.startsWith(
        "Origen no permitido por CORS"
      )
    ) {
      res.status(403).json({
        error: error.message,
      });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {
      res.status(400).json({
        error:
          "El cuerpo JSON de la solicitud no es válido.",
      });
      return;
    }

    res.status(500).json({
      error:
        "Error interno del servidor.",
    });
  }
);

// ======================================================
// INICIO DEL SERVIDOR
// ======================================================

app.listen(
  PUERTO,
  "0.0.0.0",
  () => {
    console.log(
      `Servidor corriendo en el puerto ${PUERTO}`
    );

    console.log(
      `Orígenes autorizados: ${
        [...origenesPermitidos].join(
          ", "
        ) || "ninguno"
      }`
    );

    console.log(
      `API SG-SST: http://localhost:${PUERTO}/api/sgsst`
    );
  }
);