// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt'; 

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el proceso de creación de datos...');

  // 1. Crear la empresa (usamos upsert para evitar errores si el script se corre 2 veces)
  const company = await prisma.company.upsert({
    where: { taxId: 'NIT-ECLICZA-001' }, 
    update: {}, // Si ya existe, no hace nada
    create: {
      name: 'Eclicza',
      taxId: 'NIT-ECLICZA-001',
    },
  });

  console.log(`🏢 Empresa lista: ${company.name} (ID: ${company.id})`);

  // 2. Encriptar la contraseña genérica para todos los usuarios
  const plainPassword = 'password123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // 3. Definir la lista de usuarios a crear
  const usersToCreate = [
    { email: 'superadmin@eclicza.com', name: 'SuperAdmin Eclicza', role: Role.SUPERADMIN },
    { email: 'owner@eclicza.com', name: 'Dueño Eclicza', role: Role.OWNER },
    { email: 'admin@eclicza.com', name: 'Administrador Eclicza', role: Role.ADMIN },
    { email: 'user@eclicza.com', name: 'Usuario Eclicza', role: Role.USER },
  ];

  // 4. Crear los usuarios iterando sobre la lista
  for (const userData of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {}, 
      create: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        companyId: company.id, // Relación con la empresa creada arriba
      },
    });
    console.log(`👤 Creado: ${user.email} | Rol: ${user.role} | Pass: ${plainPassword}`);
  }

  console.log('✅ Proceso finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });