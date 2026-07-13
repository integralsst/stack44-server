import {
  PrismaClient,
  Role,
} from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL =
  "superadmin@stack4four.com";

const SUPERADMIN_PASSWORD =
  "Stack44Admin2026!";

async function main(): Promise<void> {
  console.log(
    "🌱 Iniciando la creación de datos iniciales..."
  );

  const hashedPassword = await bcrypt.hash(
    SUPERADMIN_PASSWORD,
    12
  );

  const superadmin = await prisma.user.upsert({
    where: {
      email: SUPERADMIN_EMAIL,
    },

    update: {
      name: "Superadministrador Stack44",
      password: hashedPassword,
      role: Role.SUPERADMIN,
      companyId: null,
      isActive: true,
    },

    create: {
      name: "Superadministrador Stack44",
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      role: Role.SUPERADMIN,
      companyId: null,
      isActive: true,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log("");
  console.log("✅ Superadministrador creado:");
  console.log(`   ID: ${superadmin.id}`);
  console.log(`   Nombre: ${superadmin.name}`);
  console.log(`   Correo: ${superadmin.email}`);
  console.log(`   Rol: ${superadmin.role}`);
  console.log(`   Activo: ${superadmin.isActive}`);

  console.log("");
  console.log("🔐 Credenciales de acceso:");
  console.log(`   Usuario: ${SUPERADMIN_EMAIL}`);
  console.log(
    `   Contraseña: ${SUPERADMIN_PASSWORD}`
  );

  console.log("");
  console.log(
    "⚠️ Cambia esta contraseña antes de utilizar la aplicación en producción."
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