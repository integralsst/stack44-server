import "dotenv/config";

import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import cors from "cors";

import authRoutes from "./routes/auth.routes";
import companyRoutes from "./routes/company.routes";
import userRoutes from "./routes/user.routes";
import professionalRoutes from "./routes/professional.routes";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Origen no permitido por CORS: ${origin}`
        )
      );
    },
    credentials: true,
  })
);

app.use(express.json({
  limit: "2mb",
}));

app.use(express.urlencoded({
  extended: true,
}));

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Servidor Stack44 operativo 🚀",
    environment:
      process.env.NODE_ENV ?? "development",
  });
});

app.get(
  "/health",
  (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
);

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/professionals",
  professionalRoutes
);

app.use(
  (_req: Request, res: Response) => {
    res.status(404).json({
      error: "Ruta no encontrada.",
    });
  }
);

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("[GLOBAL-ERROR]", error);

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

    res.status(500).json({
      error: "Error interno del servidor.",
    });
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor corriendo en el puerto ${PORT}`
  );

  console.log(
    `Orígenes autorizados: ${
      [...allowedOrigins].join(", ") || "ninguno"
    }`
  );
});