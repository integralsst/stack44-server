import "dotenv/config";

import {
  PrismaClient,
  RolUsuario,
} from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CORREO_SUPERADMIN =
  "superadmin@stack4four.com";

const CONTRASENA_SUPERADMIN =
  "Stack44Admin2026!";

async function main(): Promise<void> {
  console.log(
    "🌱 Creando datos iniciales..."
  );

  const contrasenaCifrada =
    await bcrypt.hash(
      CONTRASENA_SUPERADMIN,
      12
    );

  const superadmin =
    await prisma.usuario.upsert({
      where: {
        correo: CORREO_SUPERADMIN,
      },

      update: {
        nombre:
          "Superadministrador Stack44",
        contrasena:
          contrasenaCifrada,
        rol: RolUsuario.SUPERADMIN,
        empresaId: null,
        activo: true,
      },

      create: {
        nombre:
          "Superadministrador Stack44",
        correo:
          CORREO_SUPERADMIN,
        contrasena:
          contrasenaCifrada,
        rol: RolUsuario.SUPERADMIN,
        empresaId: null,
        activo: true,
      },

      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
      },
    });

  console.log("");
  console.log(
    "✅ Superadministrador disponible:"
  );
  console.log(
    `Correo: ${superadmin.correo}`
  );
  console.log(
    `Contraseña: ${CONTRASENA_SUPERADMIN}`
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "❌ Error ejecutando el seed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
