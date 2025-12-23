import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminUsername && adminPassword) {
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: adminEmail }, { username: adminUsername }] } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      await prisma.user.create({
        data: {
          email: adminEmail,
          username: adminUsername,
          passwordHash,
          role: Role.admin,
          verified: true,
        },
      });
      console.log('Seeded admin user');
    } else {
      console.log('Admin user already exists, skipping');
    }
  } else {
    console.log('No admin seed data provided; skipping');
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
