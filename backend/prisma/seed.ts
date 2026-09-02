import 'dotenv/config';
import { PrismaClient, ProjectStatus } from '../generated/prisma/client';
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
    console.log('--- Starting Idempotent Development Database Seeding ---');

    // 1. Seed Admin Logistics
    const adminEmail = 'admin.logistics@alssa.com';
    const rawPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

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
    console.log('✓ Seeded Admin Logistics:', admin.email);

    // 2. Seed Default Units
    const defaultUnits = [
      { name: 'Set', symbol: 'set' },
      { name: 'Roll', symbol: 'roll' },
      { name: 'Pcs', symbol: 'pcs' },
      { name: 'Unit', symbol: 'unit' },
      { name: 'Meter', symbol: 'm' },
    ];

    for (const u of defaultUnits) {
      await prisma.unit.upsert({
        where: { name: u.name },
        update: {},
        create: {
          name: u.name,
          symbol: u.symbol,
          isActive: true,
        },
      });
    }
    console.log('✓ Seeded Units');

    // 3. Seed Warehouses
    const warehousesData = [
      {
        name: 'Warehouse Balikpapan',
        city: 'Balikpapan',
        cityCode: 'BAL',
        location: 'Jl. Mulawarman No. 88, Balikpapan',
        description: 'Main logistics hub East Kalimantan',
      },
      {
        name: 'Warehouse Jakarta',
        city: 'Jakarta',
        cityCode: 'JAK',
        location: 'Kawasan Pergudangan Marunda Blok A-12, Jakarta Utara',
        description: 'Central distribution hub',
      },
    ];

    const warehouses: Record<string, any> = {};
    for (const w of warehousesData) {
      const seededWarehouse = await prisma.warehouse.upsert({
        where: { name: w.name },
        update: {
          city: w.city,
          cityCode: w.cityCode,
          location: w.location,
          description: w.description,
        },
        create: {
          name: w.name,
          city: w.city,
          cityCode: w.cityCode,
          location: w.location,
          description: w.description,
          isActive: true,
        },
      });
      warehouses[w.name] = seededWarehouse;
    }
    console.log('✓ Seeded Warehouses (Balikpapan & Jakarta)');

    // 4. Seed Business Users (Companies)
    const businessUsersData = [
      {
        name: 'Company A',
        code: 'USR-A',
        attnName: 'John Doe',
        email: 'contact@comp-a.com',
        phone: '+62812345678',
        address: 'Kawasan Industri Kariangau',
      },
      {
        name: 'Company B',
        code: 'USR-B',
        attnName: 'Jane Smith',
        email: 'info@comp-b.com',
        phone: null,
        address: null,
      },
      {
        name: 'Company C',
        code: 'USR-C',
        attnName: null,
        email: null,
        phone: null,
        address: 'Jl. Sudirman Kav 52-53, Jakarta',
      },
    ];

    const seededCustomers: Record<string, any> = {};
    for (const u of businessUsersData) {
      const customer = await prisma.customer.upsert({
        where: { code: u.code },
        update: {
          name: u.name,
          attnName: u.attnName,
          email: u.email,
          phone: u.phone,
          address: u.address,
        },
        create: {
          name: u.name,
          code: u.code,
          attnName: u.attnName,
          email: u.email,
          phone: u.phone,
          address: u.address,
          isActive: true,
        },
      });
      seededCustomers[u.name] = customer;
    }
    console.log('✓ Seeded Business Users / Companies (Company A, B, C)');

    // 5. Seed Projects (3 Active, 1 Completed, 1 Archived)
    const projectsData = [
      {
        name: 'Project Alpha',
        customerName: 'Company A',
        referenceNumber: 'PO-2026-001',
        location: 'Balikpapan Site 1',
        leaderName: 'Andi Wijaya',
        attnName: 'John Doe',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-01-01'),
        endedAt: new Date('2026-12-31'),
      },
      {
        name: 'Project Beta',
        customerName: 'Company B',
        referenceNumber: 'CTR-2026-002',
        location: 'Jakarta Data Center',
        leaderName: 'Budi Santoso',
        attnName: 'Jane Smith',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-02-01'),
        endedAt: new Date('2026-11-30'),
      },
      {
        name: 'Project Gamma',
        customerName: 'Company C',
        referenceNumber: null, // Intentionally null to test DO block rule
        location: 'Balikpapan Port Facility',
        leaderName: 'Hendra',
        attnName: null,
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-03-01'),
        endedAt: null,
      },
      {
        name: 'Project Delta',
        customerName: 'Company A',
        referenceNumber: 'REF-2026-003',
        location: 'Surabaya Storage Hub',
        leaderName: 'Citra',
        attnName: 'John Doe',
        status: ProjectStatus.COMPLETED,
        startedAt: new Date('2025-06-01'),
        endedAt: new Date('2025-12-31'),
      },
      {
        name: 'Project Echo',
        customerName: 'Company B',
        referenceNumber: 'PO-2025-099',
        location: 'Medan Branch Site',
        leaderName: 'Dani',
        attnName: 'Jane Smith',
        status: ProjectStatus.ARCHIVED,
        startedAt: new Date('2025-01-01'),
        endedAt: new Date('2025-05-31'),
      },
    ];

    for (const p of projectsData) {
      const customer = seededCustomers[p.customerName];
      const existingProject = await prisma.project.findFirst({
        where: { name: p.name },
      });

      if (existingProject) {
        await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            customerId: customer?.id || null,
            referenceNumber: p.referenceNumber,
            location: p.location,
            leaderName: p.leaderName,
            attnName: p.attnName,
            status: p.status,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
          },
        });
      } else {
        await prisma.project.create({
          data: {
            name: p.name,
            customerId: customer?.id || null,
            referenceNumber: p.referenceNumber,
            location: p.location,
            leaderName: p.leaderName,
            attnName: p.attnName,
            status: p.status,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
            isActive: true,
          },
        });
      }
    }
    console.log('✓ Seeded Projects (Alpha, Beta, Gamma, Delta, Echo)');

    console.log('--- Database Seeding Completed Successfully ---');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error seeding database:', e);
  process.exit(1);
});
