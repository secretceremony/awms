import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const adminEmail = 'admin.logistics@alssa.com';
    const rawPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!rawPassword) {
      throw new Error('SEED_ADMIN_PASSWORD environment variable is not defined');
    }
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    // Seed 1 Admin Logistics
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
      },
      create: {
        email: adminEmail,
        name: 'Logistics Administrator',
        password: hashedPassword,
        role: 'ADMIN_LOGISTICS',
        isActive: true,
      },
    });

    console.log('Seeded Admin Logistics successfully:', admin.email);
  } finally {
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  });
