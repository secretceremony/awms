import 'dotenv/config';
import { PrismaClient, ProjectStatus, ClientType } from '../generated/prisma/client';
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
    console.log('--- Starting Final Idempotent Master Data Seeding ---');

    // 1. Seed Admin Logistics
    const rawPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!rawPassword || !rawPassword.trim()) {
      throw new Error(
        'SEED_ADMIN_PASSWORD environment variable is required to seed the administrator account.',
      );
    }
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin.logistics@alssa.com';
    const hashedPassword = await bcrypt.hash(rawPassword.trim(), 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        name: 'Pungki Surjanti',
      },
      create: {
        email: adminEmail,
        name: 'Pungki Surjanti',
        password: hashedPassword,
        role: 'ADMIN_LOGISTICS',
        isActive: true,
      },
    });
    console.log('✓ Seeded Admin Logistics user (Pungki Surjanti) successfully');

    // 2. Seed Default Units (Normalized lowercase symbols)
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
        update: { symbol: u.symbol },
        create: {
          name: u.name,
          symbol: u.symbol,
          isActive: true,
        },
      });
    }
    console.log('✓ Seeded Units (Set, Roll, Pcs, Unit, Meter)');

    // 2.1 Seed Cities (Balikpapan: BPN, Jakarta: JKT)
    const defaultCities = [
      { name: 'Balikpapan', code: 'BPN' },
      { name: 'Jakarta', code: 'JKT' },
    ];
    for (const c of defaultCities) {
      await prisma.city.upsert({
        where: { name: c.name },
        update: { code: c.code },
        create: {
          name: c.name,
          code: c.code,
          isActive: true,
        },
      });
    }
    console.log('✓ Seeded Cities (Balikpapan -> BPN, Jakarta -> JKT)');

    // 2.2 Seed Default System Settings
    const defaultSettings = [
      { key: 'inventory.lowStockThreshold', value: '5', description: 'Global threshold for bulk stock low-level indicators' },
      { key: 'delivery.senderName', value: 'PT ALSSA Corporindo', description: 'Default Sender Company Name' },
      { key: 'delivery.senderAddress', value: 'Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3, Tanjung Barat, Jagakarsa, Jakarta Selatan 12530', description: 'Default Sender Dispatch Address' },
      { key: 'delivery.senderPhone', value: '+6221 8010035', description: 'Default Sender Phone' },
      { key: 'delivery.labelWidth', value: '100mm', description: 'Default Shipping Label Width' },
      { key: 'delivery.labelHeight', value: '150mm', description: 'Default Shipping Label Height' },
    ];
    for (const s of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: {},
        create: {
          key: s.key,
          value: s.value,
          description: s.description,
        },
      });
    }
    console.log('✓ Seeded System Settings (Inventory & Delivery Defaults)');

    // 3. Seed Warehouses (Balikpapan: BPN, Jakarta: JKT)
    const warehousesData = [
      {
        name: 'Warehouse Balikpapan',
        city: 'Balikpapan',
        cityCode: 'BPN',
        location: 'Jl. Mulawarman No. 88, Balikpapan',
      },
      {
        name: 'Warehouse Jakarta',
        city: 'Jakarta',
        cityCode: 'JKT',
        location: 'Kawasan Pergudangan Marunda Blok A-12, Jakarta Utara',
      },
    ];

    for (const w of warehousesData) {
      await prisma.warehouse.upsert({
        where: { name: w.name },
        update: {
          city: w.city,
          cityCode: w.cityCode,
          location: w.location,
        },
        create: {
          name: w.name,
          city: w.city,
          cityCode: w.cityCode,
          location: w.location,
          isActive: true,
        },
      });
    }
    console.log('✓ Seeded Warehouses (Balikpapan -> BPN, Jakarta -> JKT)');

    // 4. Seed Clients & Client Contacts
    const clientsData = [
      {
        name: 'Company A',
        clientType: ClientType.PHM,
        email: 'contact@comp-a.com',
        phone: '+62812345678',
        address: 'Kawasan Industri Kariangau',
        contacts: [
          { name: 'John Doe', email: 'john@comp-a.com', phone: '+62811111' },
          { name: 'Budi Santoso', email: 'budi@comp-a.com', phone: '+62811112' },
        ],
      },
      {
        name: 'Company B',
        clientType: ClientType.OTHER,
        email: 'info@comp-b.com',
        phone: null,
        address: null,
        contacts: [
          { name: 'Jane Smith', email: 'jane@comp-b.com', phone: '+62822222' },
        ],
      },
      {
        name: 'Company C',
        clientType: ClientType.OTHER,
        email: null,
        phone: null,
        address: 'Jl. Sudirman Kav 52-53, Jakarta',
        contacts: [
          { name: 'Siti Rahma', email: 'siti@comp-c.com', phone: '+62833333' },
        ],
      },
    ];

    const seededClients: Record<string, any> = {};
    const seededContacts: Record<string, any> = {};

    for (const c of clientsData) {
      let client = await prisma.client.findFirst({
        where: { name: c.name },
      });

      if (client) {
        client = await prisma.client.update({
          where: { id: client.id },
          data: {
            clientType: c.clientType,
            email: c.email,
            phone: c.phone,
            address: c.address,
            isActive: true,
          },
        });
      } else {
        client = await prisma.client.create({
          data: {
            name: c.name,
            clientType: c.clientType,
            email: c.email,
            phone: c.phone,
            address: c.address,
            isActive: true,
          },
        });
      }

      seededClients[c.name] = client;

      for (const ct of c.contacts) {
        let contact = await prisma.clientContact.findFirst({
          where: { clientId: client.id, name: ct.name },
        });

        if (contact) {
          contact = await prisma.clientContact.update({
            where: { id: contact.id },
            data: {
              email: ct.email,
              phone: ct.phone,
              isActive: true,
            },
          });
        } else {
          contact = await prisma.clientContact.create({
            data: {
              clientId: client.id,
              name: ct.name,
              email: ct.email,
              phone: ct.phone,
              isActive: true,
            },
          });
        }
        seededContacts[`${c.name}:${ct.name}`] = contact;
      }
    }
    console.log('✓ Seeded Clients (Company A [PHM], Company B [OTHER], Company C [OTHER]) & Contacts');

    // 5. Seed Projects (3 Active, 2 Completed)
    const projectsData = [
      {
        name: 'Project Alpha',
        clientName: 'Company A',
        contactName: 'John Doe',
        referenceNumber: 'PO-2026-001',
        location: 'Central Processing Area',
        siteCode: 'CPA',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-01-01'),
        endedAt: new Date('2026-12-31'),
      },
      {
        name: 'Project Beta',
        clientName: 'Company B',
        contactName: 'Jane Smith',
        referenceNumber: 'CTR-2026-002',
        location: 'Jakarta Data Center',
        siteCode: 'JKT-DC',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-02-01'),
        endedAt: new Date('2026-11-30'),
      },
      {
        name: 'Project Gamma',
        clientName: 'Company C',
        contactName: 'Siti Rahma',
        referenceNumber: null, // Intentionally null for DO test rule
        location: 'Balikpapan Port Facility',
        siteCode: 'BPN-PORT',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-03-01'),
        endedAt: null,
      },
      {
        name: 'Project Delta',
        clientName: 'Company A',
        contactName: 'Budi Santoso',
        referenceNumber: 'REF-2026-003',
        location: 'Surabaya Storage Hub',
        siteCode: 'SBY-01',
        status: ProjectStatus.COMPLETED,
        startedAt: new Date('2025-06-01'),
        endedAt: new Date('2025-12-31'),
      },
      {
        name: 'Project Echo',
        clientName: 'Company B',
        contactName: 'Jane Smith',
        referenceNumber: 'PO-2025-099',
        location: 'Medan Branch Site',
        siteCode: 'MDN-01',
        status: ProjectStatus.COMPLETED,
        startedAt: new Date('2025-01-01'),
        endedAt: new Date('2025-05-31'),
      },
    ];

    for (const p of projectsData) {
      const client = seededClients[p.clientName];
      const contact = seededContacts[`${p.clientName}:${p.contactName}`];

      const existingProject = await prisma.project.findFirst({
        where: { name: p.name },
      });

      if (existingProject) {
        await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            clientId: client.id,
            clientContactId: contact?.id || null,
            referenceNumber: p.referenceNumber,
            location: p.location,
            siteCode: p.siteCode,
            status: p.status,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
          },
        });
      } else {
        await prisma.project.create({
          data: {
            name: p.name,
            clientId: client.id,
            clientContactId: contact?.id || null,
            referenceNumber: p.referenceNumber,
            location: p.location,
            siteCode: p.siteCode,
            status: p.status,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
          },
        });
      }
    }
    console.log('✓ Seeded Projects (3 Active, 2 Completed)');

    console.log('--- Master Data Seeding Completed Successfully ---');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error seeding database:', e);
  process.exit(1);
});
