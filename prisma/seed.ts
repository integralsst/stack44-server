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

const NOMBRE_SUPERADMIN =
  "Superadministrador Stack44";

async function main(): Promise<void> {
  console.log(
    "🌱 Iniciando la creación de datos iniciales..."
  );

  const contrasenaEncriptada =
    await bcrypt.hash(
      CONTRASENA_SUPERADMIN,
      12
    );

  const superadministrador =
    await prisma.usuario.upsert({
      where: {
        correo: CORREO_SUPERADMIN,
      },

      update: {
        nombre: NOMBRE_SUPERADMIN,
        correo: CORREO_SUPERADMIN,
        contrasena:
          contrasenaEncriptada,
        rol: RolUsuario.SUPERADMIN,
        empresaId: null,
        activo: true,
      },

      create: {
        nombre: NOMBRE_SUPERADMIN,
        correo: CORREO_SUPERADMIN,
        contrasena:
          contrasenaEncriptada,
        rol: RolUsuario.SUPERADMIN,
        empresaId: null,
        activo: true,
      },

      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        empresaId: true,
        activo: true,
        creadoEn: true,
      },
    });

  console.log("");
  console.log(
    "✅ Superadministrador creado correctamente:"
  );
  console.log(
    `   ID: ${superadministrador.id}`
  );
  console.log(
    `   Nombre: ${superadministrador.nombre}`
  );
  console.log(
    `   Correo: ${superadministrador.correo}`
  );
  console.log(
    `   Rol: ${superadministrador.rol}`
  );
  console.log(
    `   Activo: ${superadministrador.activo}`
  );

  console.log("");
  console.log("🔐 Credenciales de acceso:");
  console.log(
    `   Usuario: ${CORREO_SUPERADMIN}`
  );
  console.log(
    `   Contraseña: ${CONTRASENA_SUPERADMIN}`
  );

  console.log("");
  console.log(
    "⚠️ Cambia esta contraseña antes de usar la aplicación en producción."
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