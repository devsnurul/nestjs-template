import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserStatus } from '../src/generated/prisma/client';
import { users } from './data/users';
import { roles } from './data/roles';
import { documentCategories } from './data/document-categories';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  const saltRounds = 10;
  const plainPassword = process.env.SEED_USER_PASSWORD || 'password123';

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
    });
  }
  console.log(`${users.length} users seeded`);
}

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { rules: role.rules },
      create: role,
    });
  }
  console.log(`${roles.length} roles seeded`);
}

async function assignRoles() {
  for (const user of users) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    const roleSlug =
      user.role === 'SUPER_ADMIN' ? 'super-admin' : user.role.toLowerCase();
    const dbRole = await prisma.role.findUnique({ where: { slug: roleSlug } });

    if (dbUser && dbRole) {
      await prisma.roleAssignment.upsert({
        where: { userId_roleId: { userId: dbUser.id, roleId: dbRole.id } },
        update: {},
        create: { userId: dbUser.id, roleId: dbRole.id },
      });
    }
  }
  console.log('Roles assigned to users');
}

async function seedDocumentCategories() {
  for (const cat of documentCategories) {
    await prisma.documentCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
  }
  console.log(`${documentCategories.length} document categories seeded`);
}

async function main() {
  console.log('Seeding database...');
  await seedUsers();
  await seedRoles();
  await assignRoles();
  await seedDocumentCategories();

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
