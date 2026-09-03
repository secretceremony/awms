import 'dotenv/config';
import { PrismaClient, ProjectStatus, ClientType, MovementType, OrderStatus, MaterialType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  // Safety Check: Prevent destructive cleanup against production
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production' || connectionString.includes('prod');

  console.log(`========================================`);
  console.log(`Current environment: ${nodeEnv}`);
  console.log(`Database target: ${connectionString.split('@')[1] || 'local'}`);
  console.log(`Production? ${isProduction ? 'YES' : 'NO'}`);
  console.log(`========================================`);

  if (isProduction) {
    console.error('SAFETY BLOCK: Cannot reset or reseed in PRODUCTION environment. Aborting.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('--- Cleaning Up Old Dev Seed Data ---');

    // Clean up dependent child tables in proper foreign key order
    await prisma.shippingLabel.deleteMany({});
    await prisma.deliveryOrderItemSerial.deleteMany({});
    await prisma.deliveryOrderItem.deleteMany({});
    await prisma.deliveryOrder.deleteMany({});
    await prisma.doSequence.deleteMany({});
    await prisma.stockMovementItemSerial.deleteMany({});
    await prisma.stockMovementItem.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.itemSerial.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
    await prisma.projectStock.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.clientContact.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.city.deleteMany({});
    await prisma.unit.deleteMany({});
    await prisma.systemSetting.deleteMany({});

    console.log('✓ Cleared old test and development records');

    console.log('--- 1. Seeding Logistics Admin User ---');
    const rawPassword = process.env.SEED_ADMIN_PASSWORD || 'AlssaAdmin2026!';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin.logistics@alssa.com';
    const hashedPassword = await bcrypt.hash(rawPassword.trim(), 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Roberta Pungki',
        password: hashedPassword,
        role: 'ADMIN_LOGISTICS',
        isActive: true,
      },
      create: {
        email: adminEmail,
        name: 'Roberta Pungki',
        password: hashedPassword,
        role: 'ADMIN_LOGISTICS',
        isActive: true,
      },
    });
    console.log(`✓ Seeded Admin: Roberta Pungki (${adminEmail})`);

    console.log('--- 2. Seeding Master Units ---');
    const defaultUnits = [
      { name: 'Pcs', symbol: 'pcs' },
      { name: 'Meter', symbol: 'm' },
      { name: 'Roll', symbol: 'roll' },
      { name: 'Unit', symbol: 'unit' },
      { name: 'Set', symbol: 'set' },
      { name: 'Pair', symbol: 'pair' },
      { name: 'Pack', symbol: 'pack' },
    ];
    const unitMap = new Map<string, any>();
    for (const u of defaultUnits) {
      const unit = await prisma.unit.upsert({
        where: { name: u.name },
        update: { symbol: u.symbol },
        create: { name: u.name, symbol: u.symbol, isActive: true },
      });
      unitMap.set(u.symbol, unit);
    }
    console.log('✓ Seeded Units (pcs, m, roll, unit, set, pair, pack)');

    console.log('--- 3. Seeding Master Cities ---');
    const defaultCities = [
      { name: 'Balikpapan', code: 'BPN' },
      { name: 'Jakarta', code: 'JKT' },
    ];
    for (const c of defaultCities) {
      await prisma.city.upsert({
        where: { name: c.name },
        update: { code: c.code },
        create: { name: c.name, code: c.code, isActive: true },
      });
    }
    console.log('✓ Seeded Cities: Balikpapan (BPN), Jakarta (JKT)');

    console.log('--- 4. Seeding Master Warehouses ---');
    const warehousesData = [
      {
        name: 'Warehouse Balikpapan',
        city: 'Balikpapan',
        cityCode: 'BPN',
        location: 'Jl. Mulawarman No. 88, RT 01, Sepinggan, Balikpapan Selatan',
      },
      {
        name: 'Warehouse Jakarta',
        city: 'Jakarta',
        cityCode: 'JKT',
        location: 'Rukan Tanjung Mas Raya Blok B1 No. 3, Lenteng Agung, Jakarta Selatan',
      },
    ];
    const warehouseMap = new Map<string, any>();
    for (const w of warehousesData) {
      const wh = await prisma.warehouse.upsert({
        where: { name: w.name },
        update: { city: w.city, cityCode: w.cityCode, location: w.location, isActive: true },
        create: { name: w.name, city: w.city, cityCode: w.cityCode, location: w.location, isActive: true },
      });
      warehouseMap.set(w.cityCode, wh);
    }
    const whBpn = warehouseMap.get('BPN');
    const whJkt = warehouseMap.get('JKT');
    console.log('✓ Seeded Warehouses: Balikpapan (BPN), Jakarta (JKT)');

    console.log('--- 5. Seeding System & Company Settings ---');
    const defaultSettings = [
      { key: 'inventory.lowStockThreshold', value: '10', description: 'Global threshold for bulk stock low-level indicators' },
      { key: 'company.name', value: 'PT ALSSA Corporindo', description: 'Official Company Legal Name' },
      { key: 'company.addressJkt', value: 'Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3, Tanjung Barat, Jagakarsa, Jakarta Selatan 12530', description: 'Jakarta Head Office' },
      { key: 'company.addressBpn', value: 'Jl. Mulawarman No. 88, RT 01, Sepinggan, Balikpapan Selatan, Kota Balikpapan, Kalimantan Timur 76115', description: 'Balikpapan Branch Office' },
      { key: 'company.phoneJkt', value: '+6221 8010035', description: 'Jakarta Phone' },
      { key: 'company.phoneBpn', value: '+62542 765432', description: 'Balikpapan Phone' },
    ];
    for (const s of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value, description: s.description },
        create: { key: s.key, value: s.value, description: s.description },
      });
    }

    console.log('--- 6. Seeding Items across All 4 Material Types ---');
    const itemsData = [
      // 1. MAIN MATERIAL
      {
        name: 'Electrical Cable NYY 4x16mm',
        brand: 'Supreme',
        modelNumber: 'NYY-4X16',
        materialType: 'MAIN_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'm',
      },
      {
        name: 'Fiber Optic Cable 24 Core Armored',
        brand: 'Corning',
        modelNumber: 'FO-24C-SM',
        materialType: 'MAIN_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'm',
      },
      {
        name: 'Steel Support Bracket 50mm',
        brand: 'Unistrut',
        modelNumber: 'P1000-50',
        materialType: 'MAIN_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      {
        name: 'Heavy Duty Cable Tray Ladder 3m',
        brand: 'Trias',
        modelNumber: 'TR-LAD-300',
        materialType: 'MAIN_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      // 2. CONSUMABLE
      {
        name: 'Heavy Duty Cable Tie 300mm',
        brand: 'Panduit',
        modelNumber: 'PLT3S-M0',
        materialType: 'CONSUMABLE',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      {
        name: 'Vinyl Electrical Tape Black',
        brand: '3M',
        modelNumber: 'Super 33+',
        materialType: 'CONSUMABLE',
        trackingType: 'BULK' as const,
        unitSymbol: 'roll',
      },
      {
        name: 'Industrial Cleaning Cloth Pack',
        brand: 'Kimtech',
        modelNumber: '7552',
        materialType: 'CONSUMABLE',
        trackingType: 'BULK' as const,
        unitSymbol: 'pack',
      },
      {
        name: 'Industrial Permanent Marker Black',
        brand: 'Artline',
        modelNumber: 'EK-70',
        materialType: 'CONSUMABLE',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      // 3. TOOLS
      {
        name: 'Digital Multimeter True-RMS',
        brand: 'Fluke',
        modelNumber: '179',
        materialType: 'TOOLS',
        trackingType: 'SERIALIZED' as const,
        unitSymbol: 'unit',
      },
      {
        name: 'Core Optical Fiber Fusion Splicer',
        brand: 'Fujikura',
        modelNumber: '90S+',
        materialType: 'TOOLS',
        trackingType: 'SERIALIZED' as const,
        unitSymbol: 'unit',
      },
      {
        name: 'Heavy Duty Ratchet Crimping Tool',
        brand: 'Knipex',
        modelNumber: '97 52 36',
        materialType: 'TOOLS',
        trackingType: 'BULK' as const,
        unitSymbol: 'unit',
      },
      {
        name: 'Rotary Hammer Drill 800W',
        brand: 'Bosch',
        modelNumber: 'GBH 2-26 DRE',
        materialType: 'TOOLS',
        trackingType: 'SERIALIZED' as const,
        unitSymbol: 'unit',
      },
      // 4. HSE MATERIAL
      {
        name: 'Safety Helmet White (ANSI Z89.1)',
        brand: 'MSA',
        modelNumber: 'V-Gard Standard',
        materialType: 'HSE_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      {
        name: 'High-Visibility Reflective Safety Vest',
        brand: '3M',
        modelNumber: 'Scotchlite HV-02',
        materialType: 'HSE_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
      {
        name: 'Heavy Duty Cut-Resistant Safety Gloves',
        brand: 'Mechanix',
        modelNumber: 'Safety M-Pact',
        materialType: 'HSE_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pair',
      },
      {
        name: 'Steel Toe Safety Work Shoes S3',
        brand: 'Red Wing',
        modelNumber: 'King Toe 2240',
        materialType: 'HSE_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pair',
      },
      {
        name: 'UV Protective Safety Glasses Clear',
        brand: 'Honeywell',
        modelNumber: 'A800 Series',
        materialType: 'HSE_MATERIAL',
        trackingType: 'BULK' as const,
        unitSymbol: 'pcs',
      },
    ];

    const itemMap = new Map<string, any>();
    for (const it of itemsData) {
      const unit = unitMap.get(it.unitSymbol) || unitMap.get('pcs');
      const createdItem = await prisma.item.create({
        data: {
          name: it.name,
          brand: it.brand,
          modelNumber: it.modelNumber,
          materialType: it.materialType as MaterialType,
          trackingType: it.trackingType,
          unitId: unit.id,
          isActive: true,
        },
      });
      itemMap.set(it.name, createdItem);

      // Audit Log for Item Creation
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE_ITEM',
          entityName: 'Item',
          entityId: createdItem.id,
          payload: {
            name: createdItem.name,
            brand: createdItem.brand,
            materialType: createdItem.materialType,
            trackingType: createdItem.trackingType,
            unit: it.unitSymbol,
          },
          createdAt: new Date('2026-01-02T08:00:00Z'),
        },
      });
    }
    console.log(`✓ Seeded ${itemsData.length} Items with audit logs`);

    console.log('--- 7. Seeding Clients & Contacts ---');
    const clientsData = [
      {
        name: 'Pertamina Hulu Mahakam',
        clientType: ClientType.PHM,
        email: 'logistics@phm.pertamina.com',
        phone: '+62542 531234',
        address: 'Jl. Yos Sudarso No. 1, Balikpapan, Kalimantan Timur',
        contacts: [
          { name: 'Ir. Budi Santoso', email: 'budi.santoso@phm.pertamina.com', phone: '+62811540123' },
          { name: 'Ahmad Fauzi', email: 'ahmad.fauzi@phm.pertamina.com', phone: '+62811540456' },
        ],
      },
      {
        name: 'TotalEnergies E&P Indonesie',
        clientType: ClientType.OTHER,
        email: 'procurement@totalenergies.id',
        phone: '+6221 5231000',
        address: 'World Trade Centre II, Jl. Jend. Sudirman Kav 29-31, Jakarta',
        contacts: [
          { name: 'Dewi Lestari', email: 'dewi.lestari@totalenergies.id', phone: '+62812889900' },
          { name: 'Hendro Wijaya', email: 'hendro.wijaya@totalenergies.id', phone: '+62812889911' },
        ],
      },
      {
        name: 'Chevron Pacific Indonesia',
        clientType: ClientType.OTHER,
        email: 'materials@chevronindo.com',
        phone: '+6221 5731000',
        address: 'Sentral Senayan I, Jl. Asia Afrika No. 8, Jakarta',
        contacts: [
          { name: 'Agus Pratama', email: 'agus.pratama@chevronindo.com', phone: '+62813123456' },
        ],
      },
      {
        name: 'Medco E&P Indonesia',
        clientType: ClientType.OTHER,
        email: 'supplychain@medcoenergi.com',
        phone: '+6221 29953000',
        address: 'The Energy Building, SCBD Lot 11A, Jl. Jend Sudirman, Jakarta',
        contacts: [
          { name: 'Siti Rahmawati', email: 'siti.rahmawati@medcoenergi.com', phone: '+62815987654' },
        ],
      },
    ];

    const clientMap = new Map<string, any>();
    const contactMap = new Map<string, any>();
    for (const c of clientsData) {
      const client = await prisma.client.create({
        data: {
          name: c.name,
          clientType: c.clientType,
          email: c.email,
          phone: c.phone,
          address: c.address,
          isActive: true,
        },
      });
      clientMap.set(c.name, client);

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE_CLIENT',
          entityName: 'Client',
          entityId: client.id,
          payload: { name: client.name, clientType: client.clientType, email: client.email },
          createdAt: new Date('2026-01-03T09:00:00Z'),
        },
      });

      for (const ct of c.contacts) {
        const contact = await prisma.clientContact.create({
          data: {
            clientId: client.id,
            name: ct.name,
            email: ct.email,
            phone: ct.phone,
            isActive: true,
          },
        });
        contactMap.set(`${c.name}:${ct.name}`, contact);
      }
    }
    console.log(`✓ Seeded ${clientsData.length} Clients with contacts and audit logs`);

    console.log('--- 8. Seeding Projects ---');
    const phmClient = clientMap.get('Pertamina Hulu Mahakam');
    const budiContact = contactMap.get('Pertamina Hulu Mahakam:Ir. Budi Santoso');
    const ahmadContact = contactMap.get('Pertamina Hulu Mahakam:Ahmad Fauzi');
    const totalClient = clientMap.get('TotalEnergies E&P Indonesie');
    const dewiContact = contactMap.get('TotalEnergies E&P Indonesie:Dewi Lestari');

    const projectCpa = await prisma.project.create({
      data: {
        name: 'CPA Offshore Platform Maintenance 2026',
        clientId: phmClient.id,
        clientContactId: budiContact.id,
        referenceNumber: 'PO-PHM-2026-0881',
        siteCode: 'CPA-01',
        location: 'Central Processing Area Offshore Field, Mahakam Delta',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-01-10'),
      },
    });

    const projectSenipah = await prisma.project.create({
      data: {
        name: 'Senipah Terminal Metering Station Upgrade',
        clientId: phmClient.id,
        clientContactId: ahmadContact.id,
        referenceNumber: 'PO-PHM-2026-0940',
        siteCode: 'SNP-02',
        location: 'Senipah Onshore Terminal, Kutai Kartanegara',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-02-01'),
      },
    });

    const projectHandil = await prisma.project.create({
      data: {
        name: 'Handil 2 Gas Compressor Overhaul',
        clientId: totalClient.id,
        clientContactId: dewiContact.id,
        referenceNumber: 'PO-TOT-2026-0112',
        siteCode: 'HDL-03',
        location: 'Handil 2 Gas Processing Terminal, Muara Jawa',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-02-05'),
      },
    });

    const projectTelemetry = await prisma.project.create({
      data: {
        name: 'Balikpapan Telemetry Modernization 2025',
        clientId: totalClient.id,
        clientContactId: dewiContact.id,
        referenceNumber: 'CTR-TEPI-2025-019',
        siteCode: 'BPN-TEL-01',
        location: 'Balikpapan Base Yard Facility',
        status: ProjectStatus.COMPLETED,
        startedAt: new Date('2025-05-01'),
        endedAt: new Date('2025-12-20'),
      },
    });

    for (const proj of [projectCpa, projectSenipah, projectHandil, projectTelemetry]) {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE_PROJECT',
          entityName: 'Project',
          entityId: proj.id,
          payload: { name: proj.name, referenceNumber: proj.referenceNumber, siteCode: proj.siteCode, status: proj.status },
          createdAt: new Date('2026-01-04T10:00:00Z'),
        },
      });
    }
    console.log('✓ Seeded 4 Projects (3 Active, 1 Completed) with audit logs');

    console.log('--- 9. Seeding Initial Stock Movements ---');
    // BPN Initial Stock
    const bpnInitialMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-INIT-BPN-20260105-001',
        movementType: MovementType.INITIAL,
        movementDate: new Date('2026-01-05T08:30:00Z'),
        destinationWarehouseId: whBpn.id,
        notes: 'Initial opening stock intake for Balikpapan Central Warehouse',
        createdById: admin.id,
      },
    });

    // JKT Initial Stock
    const jktInitialMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-INIT-JKT-20260106-001',
        movementType: MovementType.INITIAL,
        movementDate: new Date('2026-01-06T08:30:00Z'),
        destinationWarehouseId: whJkt.id,
        notes: 'Initial opening stock intake for Jakarta Central Warehouse',
        createdById: admin.id,
      },
    });

    const bpnInitialBulk = [
      { name: 'Electrical Cable NYY 4x16mm', qty: 1000 },
      { name: 'Fiber Optic Cable 24 Core Armored', qty: 1000 },
      { name: 'Steel Support Bracket 50mm', qty: 200 },
      { name: 'Heavy Duty Cable Tray Ladder 3m', qty: 80 },
      { name: 'Heavy Duty Cable Tie 300mm', qty: 1000 },
      { name: 'Vinyl Electrical Tape Black', qty: 200 },
      { name: 'Industrial Cleaning Cloth Pack', qty: 60 },
      { name: 'Industrial Permanent Marker Black', qty: 100 },
      { name: 'Heavy Duty Ratchet Crimping Tool', qty: 15 },
      { name: 'Safety Helmet White (ANSI Z89.1)', qty: 100 },
      { name: 'High-Visibility Reflective Safety Vest', qty: 100 },
      { name: 'Heavy Duty Cut-Resistant Safety Gloves', qty: 150 },
      { name: 'Steel Toe Safety Work Shoes S3', qty: 50 },
      { name: 'UV Protective Safety Glasses Clear', qty: 80 },
    ];

    for (const b of bpnInitialBulk) {
      const it = itemMap.get(b.name);
      await prisma.stockMovementItem.create({
        data: { stockMovementId: bpnInitialMove.id, itemId: it.id, quantity: b.qty },
      });
      await prisma.warehouseStock.create({
        data: { warehouseId: whBpn.id, itemId: it.id, quantity: b.qty },
      });
    }

    const jktInitialBulk = [
      { name: 'Fiber Optic Cable 24 Core Armored', qty: 500 },
      { name: 'Heavy Duty Cable Tie 300mm', qty: 500 },
      { name: 'Safety Helmet White (ANSI Z89.1)', qty: 40 },
      { name: 'UV Protective Safety Glasses Clear', qty: 40 },
    ];

    for (const b of jktInitialBulk) {
      const it = itemMap.get(b.name);
      await prisma.stockMovementItem.create({
        data: { stockMovementId: jktInitialMove.id, itemId: it.id, quantity: b.qty },
      });
      await prisma.warehouseStock.create({
        data: { warehouseId: whJkt.id, itemId: it.id, quantity: b.qty },
      });
    }

    // Seed Initial Serialized Assets
    const flukeItem = itemMap.get('Digital Multimeter True-RMS');
    const splicerItem = itemMap.get('Core Optical Fiber Fusion Splicer');
    const drillItem = itemMap.get('Rotary Hammer Drill 800W');

    // BPN Serials: TOOL-BPN-001..003 (Fluke), TOOL-BPN-004..005 (Splicer)
    const bpnSerialsData = [
      { item: flukeItem, sn: 'TOOL-BPN-001', state: 'STANDBY_GOOD', label: 'Standby Good' },
      { item: flukeItem, sn: 'TOOL-BPN-002', state: 'STANDBY_GOOD', label: 'Standby Good' },
      { item: flukeItem, sn: 'TOOL-BPN-003', state: 'STANDBY_GOOD', label: 'Standby Good' },
      { item: splicerItem, sn: 'TOOL-BPN-004', state: 'STANDBY_GOOD', label: 'Standby Good' },
      { item: splicerItem, sn: 'TOOL-BPN-005', state: 'STANDBY_GOOD', label: 'Standby Good' },
    ];
    const serialMap = new Map<string, any>();

    for (const s of bpnSerialsData) {
      const createdSerial = await prisma.itemSerial.create({
        data: {
          itemId: s.item.id,
          serialNumber: s.sn,
          state: s.state,
          conditionLabel: s.label,
          currentWarehouseId: whBpn.id,
        },
      });
      serialMap.set(s.sn, createdSerial);
    }

    // Link Serials to BPN Initial Stock Movement
    const bpnFlukeInitItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInitialMove.id, itemId: flukeItem.id, quantity: 3 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: bpnFlukeInitItem.id, itemSerialId: serialMap.get('TOOL-BPN-001').id },
        { stockMovementItemId: bpnFlukeInitItem.id, itemSerialId: serialMap.get('TOOL-BPN-002').id },
        { stockMovementItemId: bpnFlukeInitItem.id, itemSerialId: serialMap.get('TOOL-BPN-003').id },
      ],
    });

    const bpnSplicerInitItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInitialMove.id, itemId: splicerItem.id, quantity: 2 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: bpnSplicerInitItem.id, itemSerialId: serialMap.get('TOOL-BPN-004').id },
        { stockMovementItemId: bpnSplicerInitItem.id, itemSerialId: serialMap.get('TOOL-BPN-005').id },
      ],
    });

    // JKT Serials: TOOL-JKT-001..002 (Drill)
    const jktSerialsData = [
      { item: drillItem, sn: 'TOOL-JKT-001', state: 'STANDBY_GOOD', label: 'Standby Good' },
      { item: drillItem, sn: 'TOOL-JKT-002', state: 'STANDBY_GOOD', label: 'Standby Good' },
    ];
    for (const s of jktSerialsData) {
      const createdSerial = await prisma.itemSerial.create({
        data: {
          itemId: s.item.id,
          serialNumber: s.sn,
          state: s.state,
          conditionLabel: s.label,
          currentWarehouseId: whJkt.id,
        },
      });
      serialMap.set(s.sn, createdSerial);
    }

    const jktDrillInitItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: jktInitialMove.id, itemId: drillItem.id, quantity: 2 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: jktDrillInitItem.id, itemSerialId: serialMap.get('TOOL-JKT-001').id },
        { stockMovementItemId: jktDrillInitItem.id, itemSerialId: serialMap.get('TOOL-JKT-002').id },
      ],
    });

    // Audit Logs for Initial Stock
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'INITIAL_STOCK',
        entityName: 'StockMovement',
        entityId: bpnInitialMove.id,
        payload: { movementNumber: bpnInitialMove.movementNumber, warehouse: 'Warehouse Balikpapan', totalItems: 16 },
        createdAt: new Date('2026-01-05T08:35:00Z'),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'INITIAL_STOCK',
        entityName: 'StockMovement',
        entityId: jktInitialMove.id,
        payload: { movementNumber: jktInitialMove.movementNumber, warehouse: 'Warehouse Jakarta', totalItems: 5 },
        createdAt: new Date('2026-01-06T08:35:00Z'),
      },
    });
    console.log('✓ Seeded Initial Stock (BPN & JKT) with matching serials and audit logs');

    console.log('--- 10. Seeding External Incoming Transactions ---');
    // Incoming 1: BPN External Restock (Jan 20, 2026)
    const tapeItem = itemMap.get('Vinyl Electrical Tape Black');
    const vestItem = itemMap.get('High-Visibility Reflective Safety Vest');

    const bpnInMove1 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-IN-BPN-20260120-001',
        movementType: MovementType.INCOMING,
        movementDate: new Date('2026-01-20T10:00:00Z'),
        destinationWarehouseId: whBpn.id,
        referenceNumber: 'PO-ALSSA-2026-012',
        notes: 'Monthly consumable restock from PT Kencana Electrindo',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInMove1.id, itemId: tapeItem.id, quantity: 50 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: tapeItem.id } },
      data: { quantity: { increment: 50 } },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInMove1.id, itemId: vestItem.id, quantity: 30 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: vestItem.id } },
      data: { quantity: { increment: 30 } },
    });

    // 2 new drills incoming in BPN (TOOL-BPN-009, TOOL-BPN-010)
    const drillBpn1 = await prisma.itemSerial.create({
      data: { itemId: drillItem.id, serialNumber: 'TOOL-BPN-009', state: 'STANDBY_GOOD', conditionLabel: 'Standby Good', currentWarehouseId: whBpn.id },
    });
    const drillBpn2 = await prisma.itemSerial.create({
      data: { itemId: drillItem.id, serialNumber: 'TOOL-BPN-010', state: 'STANDBY_GOOD', conditionLabel: 'Standby Good', currentWarehouseId: whBpn.id },
    });
    serialMap.set('TOOL-BPN-009', drillBpn1);
    serialMap.set('TOOL-BPN-010', drillBpn2);

    const bpnInDrillItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInMove1.id, itemId: drillItem.id, quantity: 2 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: bpnInDrillItem.id, itemSerialId: drillBpn1.id },
        { stockMovementItemId: bpnInDrillItem.id, itemSerialId: drillBpn2.id },
      ],
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'INCOMING_STOCK',
        entityName: 'StockMovement',
        entityId: bpnInMove1.id,
        payload: { movementNumber: bpnInMove1.movementNumber, referenceNumber: bpnInMove1.referenceNumber, warehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-01-20T10:15:00Z'),
      },
    });

    // Incoming 2: BPN Mixed-Condition Incoming (Jan 25, 2026)
    const markerItem = itemMap.get('Industrial Permanent Marker Black');

    const bpnInMove2 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-IN-BPN-20260125-002',
        movementType: MovementType.INCOMING,
        movementDate: new Date('2026-01-25T14:30:00Z'),
        destinationWarehouseId: whBpn.id,
        referenceNumber: 'DO-SUP-2026-088',
        notes: 'Tool batch delivery with factory calibration testing results',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInMove2.id, itemId: markerItem.id, quantity: 50 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: markerItem.id } },
      data: { quantity: { increment: 50 } },
    });

    // 3 multimeters with different conditions (TOOL-BPN-006: Standby Good, TOOL-BPN-007: Standby Bad, TOOL-BPN-008: Under Repair)
    const fluke6 = await prisma.itemSerial.create({
      data: { itemId: flukeItem.id, serialNumber: 'TOOL-BPN-006', state: 'STANDBY_GOOD', conditionLabel: 'Standby Good', currentWarehouseId: whBpn.id },
    });
    const fluke7 = await prisma.itemSerial.create({
      data: { itemId: flukeItem.id, serialNumber: 'TOOL-BPN-007', state: 'STANDBY_BAD', conditionLabel: 'Standby Bad (Probe Fault)', currentWarehouseId: whBpn.id },
    });
    const fluke8 = await prisma.itemSerial.create({
      data: { itemId: flukeItem.id, serialNumber: 'TOOL-BPN-008', state: 'UNDER_REPAIR', conditionLabel: 'Under Repair (Screen Damage)', currentWarehouseId: whBpn.id },
    });
    serialMap.set('TOOL-BPN-006', fluke6);
    serialMap.set('TOOL-BPN-007', fluke7);
    serialMap.set('TOOL-BPN-008', fluke8);

    const bpnInFlukeItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: bpnInMove2.id, itemId: flukeItem.id, quantity: 3 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: bpnInFlukeItem.id, itemSerialId: fluke6.id },
        { stockMovementItemId: bpnInFlukeItem.id, itemSerialId: fluke7.id },
        { stockMovementItemId: bpnInFlukeItem.id, itemSerialId: fluke8.id },
      ],
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'INCOMING_STOCK',
        entityName: 'StockMovement',
        entityId: bpnInMove2.id,
        payload: { movementNumber: bpnInMove2.movementNumber, referenceNumber: bpnInMove2.referenceNumber, warehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-01-25T14:45:00Z'),
      },
    });

    // Incoming 3: JKT Restock (Feb 01, 2026)
    const cableItem = itemMap.get('Electrical Cable NYY 4x16mm');
    const glovesItem = itemMap.get('Heavy Duty Cut-Resistant Safety Gloves');

    const jktInMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-IN-JKT-20260201-001',
        movementType: MovementType.INCOMING,
        movementDate: new Date('2026-02-01T11:00:00Z'),
        destinationWarehouseId: whJkt.id,
        referenceNumber: 'PO-JKT-2026-003',
        notes: 'Direct supplier delivery to Jakarta staging depot',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: jktInMove.id, itemId: cableItem.id, quantity: 300 },
    });
    await prisma.warehouseStock.create({
      data: { warehouseId: whJkt.id, itemId: cableItem.id, quantity: 300 },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: jktInMove.id, itemId: glovesItem.id, quantity: 50 },
    });
    await prisma.warehouseStock.create({
      data: { warehouseId: whJkt.id, itemId: glovesItem.id, quantity: 50 },
    });

    const drillJkt3 = await prisma.itemSerial.create({
      data: { itemId: drillItem.id, serialNumber: 'TOOL-JKT-003', state: 'STANDBY_GOOD', conditionLabel: 'Standby Good', currentWarehouseId: whJkt.id },
    });
    serialMap.set('TOOL-JKT-003', drillJkt3);

    const jktInDrillItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: jktInMove.id, itemId: drillItem.id, quantity: 1 },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: jktInDrillItem.id, itemSerialId: drillJkt3.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'INCOMING_STOCK',
        entityName: 'StockMovement',
        entityId: jktInMove.id,
        payload: { movementNumber: jktInMove.movementNumber, referenceNumber: jktInMove.referenceNumber, warehouse: 'Warehouse Jakarta' },
        createdAt: new Date('2026-02-01T11:15:00Z'),
      },
    });
    console.log('✓ Seeded 3 Incoming Movements (2 BPN, 1 JKT) with multi-condition assets and audit logs');

    console.log('--- 11. Seeding Outgoing Movements & Dispatches ---');
    const cableTieItem = itemMap.get('Heavy Duty Cable Tie 300mm');
    const helmetItem = itemMap.get('Safety Helmet White (ANSI Z89.1)');
    const bracketItem = itemMap.get('Steel Support Bracket 50mm');
    const fiberItem = itemMap.get('Fiber Optic Cable 24 Core Armored');
    const trayItem = itemMap.get('Heavy Duty Cable Tray Ladder 3m');

    // Outgoing 1: To CPA Offshore Platform Maintenance (Feb 10, 2026)
    const outMove1 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-OUT-BPN-20260210-001',
        movementType: MovementType.OUTGOING,
        movementDate: new Date('2026-02-10T09:15:00Z'),
        sourceWarehouseId: whBpn.id,
        projectId: projectCpa.id,
        notes: 'Project dispatch for CPA-01 offshore maintenance campaign',
        createdById: admin.id,
      },
    });

    // 150m cable out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove1.id, itemId: cableItem.id, quantity: 150 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableItem.id } },
      data: { quantity: { decrement: 150 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectCpa.id, itemId: cableItem.id, quantity: 150 },
    });

    // 100 pcs cable ties out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove1.id, itemId: cableTieItem.id, quantity: 100 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableTieItem.id } },
      data: { quantity: { decrement: 100 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectCpa.id, itemId: cableTieItem.id, quantity: 100 },
    });

    // 6 pcs safety helmets out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove1.id, itemId: helmetItem.id, quantity: 6 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: helmetItem.id } },
      data: { quantity: { decrement: 6 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectCpa.id, itemId: helmetItem.id, quantity: 6 },
    });

    // 1 multimeter deployed (TOOL-BPN-001)
    const outMove1FlukeItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove1.id, itemId: flukeItem.id, quantity: 1 },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: outMove1FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-001').id },
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-001').id },
      data: { state: 'DEPLOY', currentWarehouseId: null, currentProjectId: projectCpa.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'OUTGOING_DISPATCH',
        entityName: 'StockMovement',
        entityId: outMove1.id,
        payload: { movementNumber: outMove1.movementNumber, project: projectCpa.name, warehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-02-10T09:20:00Z'),
      },
    });

    // Outgoing 2: To Handil 2 Gas Compressor Overhaul (Feb 15, 2026)
    const outMove2 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-OUT-BPN-20260215-002',
        movementType: MovementType.OUTGOING,
        movementDate: new Date('2026-02-15T10:30:00Z'),
        sourceWarehouseId: whBpn.id,
        projectId: projectHandil.id,
        notes: 'Dispatched mechanical overhaul brackets and electrical tools to Handil 2',
        createdById: admin.id,
      },
    });

    // 40 pcs steel brackets out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove2.id, itemId: bracketItem.id, quantity: 40 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: bracketItem.id } },
      data: { quantity: { decrement: 40 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectHandil.id, itemId: bracketItem.id, quantity: 40 },
    });

    // 20 rolls electrical tape out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove2.id, itemId: tapeItem.id, quantity: 20 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: tapeItem.id } },
      data: { quantity: { decrement: 20 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectHandil.id, itemId: tapeItem.id, quantity: 20 },
    });

    // 10 pairs safety gloves out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove2.id, itemId: glovesItem.id, quantity: 10 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: glovesItem.id } },
      data: { quantity: { decrement: 10 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectHandil.id, itemId: glovesItem.id, quantity: 10 },
    });

    // 2 multimeters deployed (TOOL-BPN-002, TOOL-BPN-003)
    const outMove2FlukeItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove2.id, itemId: flukeItem.id, quantity: 2 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: outMove2FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-002').id },
        { stockMovementItemId: outMove2FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-003').id },
      ],
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-002').id },
      data: { state: 'DEPLOY', currentWarehouseId: null, currentProjectId: projectHandil.id },
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-003').id },
      data: { state: 'DEPLOY', currentWarehouseId: null, currentProjectId: projectHandil.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'OUTGOING_DISPATCH',
        entityName: 'StockMovement',
        entityId: outMove2.id,
        payload: { movementNumber: outMove2.movementNumber, project: projectHandil.name, warehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-02-15T10:40:00Z'),
      },
    });

    // Outgoing 3: To Senipah Terminal Upgrade (Feb 20, 2026)
    const outMove3 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-OUT-BPN-20260220-003',
        movementType: MovementType.OUTGOING,
        movementDate: new Date('2026-02-20T11:00:00Z'),
        sourceWarehouseId: whBpn.id,
        projectId: projectSenipah.id,
        notes: 'Telecom and fiber installation kit for Senipah upgrade',
        createdById: admin.id,
      },
    });

    // 200m fiber optic out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove3.id, itemId: fiberItem.id, quantity: 200 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: fiberItem.id } },
      data: { quantity: { decrement: 200 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectSenipah.id, itemId: fiberItem.id, quantity: 200 },
    });

    // 20 pcs cable tray out
    await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove3.id, itemId: trayItem.id, quantity: 20 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: trayItem.id } },
      data: { quantity: { decrement: 20 } },
    });
    await prisma.projectStock.create({
      data: { projectId: projectSenipah.id, itemId: trayItem.id, quantity: 20 },
    });

    // 1 fusion splicer deployed (TOOL-BPN-004)
    const outMove3SplicerItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: outMove3.id, itemId: splicerItem.id, quantity: 1 },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: outMove3SplicerItem.id, itemSerialId: serialMap.get('TOOL-BPN-004').id },
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-004').id },
      data: { state: 'DEPLOY', currentWarehouseId: null, currentProjectId: projectSenipah.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'OUTGOING_DISPATCH',
        entityName: 'StockMovement',
        entityId: outMove3.id,
        payload: { movementNumber: outMove3.movementNumber, project: projectSenipah.name, warehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-02-20T11:15:00Z'),
      },
    });
    console.log('✓ Seeded 3 Outgoing Movements across projects with deployed serials and audit logs');

    console.log('--- 12. Seeding Project Returns ---');
    // Return 1: From CPA-01 back to BPN (Feb 25, 2026)
    // Return 30m unused cable NYY and return TOOL-BPN-001 in STANDBY_GOOD
    const retMove1 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-RET-BPN-20260225-001',
        movementType: MovementType.RETURN,
        movementDate: new Date('2026-02-25T13:00:00Z'),
        projectId: projectCpa.id,
        destinationWarehouseId: whBpn.id,
        notes: 'Excess cable and completed multimeter return from CPA-01',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: retMove1.id, itemId: cableItem.id, quantity: 30 },
    });
    await prisma.projectStock.update({
      where: { projectId_itemId: { projectId: projectCpa.id, itemId: cableItem.id } },
      data: { quantity: { decrement: 30 } },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableItem.id } },
      data: { quantity: { increment: 30 } },
    });

    // Return TOOL-BPN-001 in STANDBY_GOOD
    const retMove1FlukeItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: retMove1.id, itemId: flukeItem.id, quantity: 1 },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: retMove1FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-001').id },
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-001').id },
      data: { state: 'STANDBY_GOOD', conditionLabel: 'Standby Good (Post-Inspection)', currentWarehouseId: whBpn.id, currentProjectId: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'RETURN_STOCK',
        entityName: 'StockMovement',
        entityId: retMove1.id,
        payload: { movementNumber: retMove1.movementNumber, fromProject: projectCpa.name, toWarehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-02-25T13:15:00Z'),
      },
    });

    // Return 2: From HDL-03 back to BPN with condition degradation (Feb 28, 2026)
    // Return TOOL-BPN-002 (STANDBY_BAD) and TOOL-BPN-003 (UNDER_REPAIR) + 10 pcs unused Steel Bracket
    const retMove2 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-RET-BPN-20260228-002',
        movementType: MovementType.RETURN,
        movementDate: new Date('2026-02-28T15:30:00Z'),
        projectId: projectHandil.id,
        destinationWarehouseId: whBpn.id,
        notes: 'Handil 2 tool demobilization with field inspection damage reports',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: retMove2.id, itemId: bracketItem.id, quantity: 10 },
    });
    await prisma.projectStock.update({
      where: { projectId_itemId: { projectId: projectHandil.id, itemId: bracketItem.id } },
      data: { quantity: { decrement: 10 } },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: bracketItem.id } },
      data: { quantity: { increment: 10 } },
    });

    const retMove2FlukeItem = await prisma.stockMovementItem.create({
      data: { stockMovementId: retMove2.id, itemId: flukeItem.id, quantity: 2 },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: retMove2FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-002').id },
        { stockMovementItemId: retMove2FlukeItem.id, itemSerialId: serialMap.get('TOOL-BPN-003').id },
      ],
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-002').id },
      data: { state: 'STANDBY_BAD', conditionLabel: 'Standby Bad (Fuse Blown in Field)', currentWarehouseId: whBpn.id, currentProjectId: null },
    });
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-003').id },
      data: { state: 'UNDER_REPAIR', conditionLabel: 'Under Repair (Calibration Drift)', currentWarehouseId: whBpn.id, currentProjectId: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'RETURN_STOCK',
        entityName: 'StockMovement',
        entityId: retMove2.id,
        payload: { movementNumber: retMove2.movementNumber, fromProject: projectHandil.name, toWarehouse: 'Warehouse Balikpapan' },
        createdAt: new Date('2026-02-28T15:45:00Z'),
      },
    });
    console.log('✓ Seeded 2 Project Returns with partial bulk returns & condition transitions');

    console.log('--- 13. Seeding Inventory Adjustments ---');
    // Adjustment 1: Bulk Opname Adjustment (March 01, 2026) - 10 pcs Cable Ties discarded/damaged
    const adjMove1 = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-ADJ-BPN-20260301-001',
        movementType: MovementType.ADJUSTMENT,
        movementDate: new Date('2026-03-01T09:00:00Z'),
        destinationWarehouseId: whBpn.id,
        notes: 'Physical stock reconciliation: 10 damaged units discarded during quarterly cycle count',
        createdById: admin.id,
      },
    });

    await prisma.stockMovementItem.create({
      data: { stockMovementId: adjMove1.id, itemId: cableTieItem.id, quantity: -10 },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableTieItem.id } },
      data: { quantity: { decrement: 10 } },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ADJUSTMENT_STOCK',
        entityName: 'StockMovement',
        entityId: adjMove1.id,
        payload: { movementNumber: adjMove1.movementNumber, item: cableTieItem.name, delta: -10, reason: 'Physical stock reconciliation' },
        createdAt: new Date('2026-03-01T09:10:00Z'),
      },
    });

    // Adjustment 2: Serialized Status Adjustment (March 02, 2026)
    // TOOL-BPN-007 (was STANDBY_BAD) sent to service workshop -> state becomes UNDER_REPAIR
    await prisma.itemSerial.update({
      where: { id: serialMap.get('TOOL-BPN-007').id },
      data: { state: 'UNDER_REPAIR', conditionLabel: 'Sent to Authorized Fluke Service Center' },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ADJUSTMENT_STOCK',
        entityName: 'ItemSerial',
        entityId: serialMap.get('TOOL-BPN-007').id,
        payload: { serialNumber: 'TOOL-BPN-007', previousState: 'STANDBY_BAD', newState: 'UNDER_REPAIR', reason: 'Sent for inspection and repair' },
        createdAt: new Date('2026-03-02T10:00:00Z'),
      },
    });
    console.log('✓ Seeded Inventory Adjustments (Bulk Reconciliation & Serial Condition updates)');

    console.log('--- 14. Seeding Delivery Orders ---');
    await prisma.doSequence.create({
      data: { year: 2026, currentSequence: 2 },
    });

    // DO 1 (Issued): For Outgoing 1 (CPA-01)
    const do1Snapshot = {
      doNumber: '001/ALS-BPN/DO-PHM/II/2026',
      date: '2026-02-10T09:15:00.000Z',
      activity: 'CPA Platform Electrical Maintenance Supplies Dispatch',
      notes: 'All items inspected and verified by Logistics Admin before vessel departure.',
      client: {
        id: phmClient.id,
        name: phmClient.name,
        clientType: phmClient.clientType,
        address: phmClient.address,
        phone: phmClient.phone,
        email: phmClient.email,
      },
      attn: {
        id: budiContact.id,
        name: budiContact.name,
        phone: budiContact.phone,
        email: budiContact.email,
      },
      project: {
        id: projectCpa.id,
        name: projectCpa.name,
        siteCode: projectCpa.siteCode,
        referenceNumber: projectCpa.referenceNumber,
        location: projectCpa.location,
      },
      warehouse: {
        id: whBpn.id,
        name: whBpn.name,
        cityCode: whBpn.cityCode,
        location: whBpn.location,
      },
      items: [
        { itemNo: 1, itemId: cableItem.id, name: cableItem.name, brand: cableItem.brand, modelNumber: cableItem.modelNumber, quantity: 150, unitSymbol: 'm', pic: 'Ir. Budi Santoso', remarks: 'Good Condition', serials: [] },
        { itemNo: 2, itemId: cableTieItem.id, name: cableTieItem.name, brand: cableTieItem.brand, modelNumber: cableTieItem.modelNumber, quantity: 100, unitSymbol: 'pcs', pic: 'Ir. Budi Santoso', remarks: 'Good Condition', serials: [] },
        { itemNo: 3, itemId: helmetItem.id, name: helmetItem.name, brand: helmetItem.brand, modelNumber: helmetItem.modelNumber, quantity: 6, unitSymbol: 'pcs', pic: 'Ir. Budi Santoso', remarks: 'Good Condition', serials: [] },
        { itemNo: 4, itemId: flukeItem.id, name: flukeItem.name, brand: flukeItem.brand, modelNumber: flukeItem.modelNumber, quantity: 1, unitSymbol: 'unit', pic: 'Ir. Budi Santoso', remarks: 'Calibrated True-RMS', serials: ['TOOL-BPN-001'] },
      ],
    };

    const do1 = await prisma.deliveryOrder.create({
      data: {
        doNumber: '001/ALS-BPN/DO-PHM/II/2026',
        stockMovementId: outMove1.id,
        clientId: phmClient.id,
        projectId: projectCpa.id,
        sourceWarehouseId: whBpn.id,
        date: new Date('2026-02-10T09:15:00Z'),
        activity: 'CPA Platform Electrical Maintenance Supplies Dispatch',
        status: OrderStatus.ISSUED,
        issuedAt: new Date('2026-02-10T09:30:00Z'),
        issuedById: admin.id,
        createdById: admin.id,
        snapshots: do1Snapshot,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE_DELIVERY_ORDER',
        entityName: 'DeliveryOrder',
        entityId: do1.id,
        payload: { doNumber: do1.doNumber, status: 'DRAFT', project: projectCpa.name },
        createdAt: new Date('2026-02-10T09:18:00Z'),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ISSUE_DELIVERY_ORDER',
        entityName: 'DeliveryOrder',
        entityId: do1.id,
        payload: { doNumber: do1.doNumber, previousStatus: 'DRAFT', newStatus: 'ISSUED' },
        createdAt: new Date('2026-02-10T09:30:00Z'),
      },
    });

    // DO 2 (Issued): For Outgoing 2 (Handil 2)
    const do2Snapshot = {
      doNumber: '002/ALS-BPN/DO-OTHER/II/2026',
      date: '2026-02-15T10:30:00.000Z',
      activity: 'Handil 2 Gas Compressor Overhaul Hardware Dispatch',
      notes: 'Delivered via Marine Crew Boat from Balikpapan Base',
      client: {
        id: totalClient.id,
        name: totalClient.name,
        clientType: totalClient.clientType,
        address: totalClient.address,
        phone: totalClient.phone,
        email: totalClient.email,
      },
      attn: {
        id: dewiContact.id,
        name: dewiContact.name,
        phone: dewiContact.phone,
        email: dewiContact.email,
      },
      project: {
        id: projectHandil.id,
        name: projectHandil.name,
        siteCode: projectHandil.siteCode,
        referenceNumber: projectHandil.referenceNumber,
        location: projectHandil.location,
      },
      warehouse: {
        id: whBpn.id,
        name: whBpn.name,
        cityCode: whBpn.cityCode,
        location: whBpn.location,
      },
      items: [
        { itemNo: 1, itemId: bracketItem.id, name: bracketItem.name, brand: bracketItem.brand, modelNumber: bracketItem.modelNumber, quantity: 40, unitSymbol: 'pcs', pic: 'Dewi Lestari', remarks: 'Good Condition', serials: [] },
        { itemNo: 2, itemId: tapeItem.id, name: tapeItem.name, brand: tapeItem.brand, modelNumber: tapeItem.modelNumber, quantity: 20, unitSymbol: 'roll', pic: 'Dewi Lestari', remarks: 'Good Condition', serials: [] },
        { itemNo: 3, itemId: glovesItem.id, name: glovesItem.name, brand: glovesItem.brand, modelNumber: glovesItem.modelNumber, quantity: 10, unitSymbol: 'pair', pic: 'Dewi Lestari', remarks: 'Good Condition', serials: [] },
        { itemNo: 4, itemId: flukeItem.id, name: flukeItem.name, brand: flukeItem.brand, modelNumber: flukeItem.modelNumber, quantity: 2, unitSymbol: 'unit', pic: 'Dewi Lestari', remarks: 'Calibrated', serials: ['TOOL-BPN-002', 'TOOL-BPN-003'] },
      ],
    };

    const do2 = await prisma.deliveryOrder.create({
      data: {
        doNumber: '002/ALS-BPN/DO-OTHER/II/2026',
        stockMovementId: outMove2.id,
        clientId: totalClient.id,
        projectId: projectHandil.id,
        sourceWarehouseId: whBpn.id,
        date: new Date('2026-02-15T10:30:00Z'),
        activity: 'Handil 2 Gas Compressor Overhaul Hardware Dispatch',
        status: OrderStatus.ISSUED,
        issuedAt: new Date('2026-02-15T10:45:00Z'),
        issuedById: admin.id,
        createdById: admin.id,
        snapshots: do2Snapshot,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE_DELIVERY_ORDER',
        entityName: 'DeliveryOrder',
        entityId: do2.id,
        payload: { doNumber: do2.doNumber, status: 'DRAFT', project: projectHandil.name },
        createdAt: new Date('2026-02-15T10:35:00Z'),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ISSUE_DELIVERY_ORDER',
        entityName: 'DeliveryOrder',
        entityId: do2.id,
        payload: { doNumber: do2.doNumber, previousStatus: 'DRAFT', newStatus: 'ISSUED' },
        createdAt: new Date('2026-02-15T10:45:00Z'),
      },
    });

    // DO 3 (Draft): For Outgoing 3 (Senipah)
    const do3 = await prisma.deliveryOrder.create({
      data: {
        doNumber: '003/ALS-BPN/DO-PHM/II/2026',
        stockMovementId: outMove3.id,
        clientId: phmClient.id,
        projectId: projectSenipah.id,
        sourceWarehouseId: whBpn.id,
        date: new Date('2026-02-20T11:00:00Z'),
        activity: 'Senipah Metering Station Telecom Cable Deployment',
        status: OrderStatus.DRAFT,
        createdById: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE_DELIVERY_ORDER',
        entityName: 'DeliveryOrder',
        entityId: do3.id,
        payload: { doNumber: do3.doNumber, status: 'DRAFT', project: projectSenipah.name },
        createdAt: new Date('2026-02-20T11:10:00Z'),
      },
    });
    console.log('✓ Seeded 3 Delivery Orders (2 Issued with snapshots, 1 Draft) and audit logs');

    console.log('--- 15. Seeding Shipping Labels ---');
    // Label 1: From DO 1 (A6 Landscape, Fragile: YES)
    const label1 = await prisma.shippingLabel.create({
      data: {
        deliveryOrderId: do1.id,
        sourceType: 'DO',
        shipDate: new Date('2026-02-10T10:00:00Z'),
        recipientName: phmClient.name,
        attnName: budiContact.name,
        destination: projectCpa.location,
        referenceNumber: projectCpa.referenceNumber,
        doNumber: do1.doNumber,
        senderName: 'PT ALSSA Corporindo',
        senderAddress: 'Jl. Mulawarman No. 88, RT 01, Sepinggan, Balikpapan Selatan',
        senderPhone: '+62542 765432',
        isFragile: true,
        handlingNote: 'KEEP DRY • HANDLE WITH CARE',
        labelWidth: 148,
        labelHeight: 105,
        notes: 'Dispatched via Marine Logistics Handil Base',
        createdById: admin.id,
      },
    });

    // Label 2: From DO 2 (A6 Landscape, Fragile: NO)
    const label2 = await prisma.shippingLabel.create({
      data: {
        deliveryOrderId: do2.id,
        sourceType: 'DO',
        shipDate: new Date('2026-02-15T11:00:00Z'),
        recipientName: totalClient.name,
        attnName: dewiContact.name,
        destination: projectHandil.location,
        referenceNumber: projectHandil.referenceNumber,
        doNumber: do2.doNumber,
        senderName: 'PT ALSSA Corporindo',
        senderAddress: 'Jl. Mulawarman No. 88, RT 01, Sepinggan, Balikpapan Selatan',
        senderPhone: '+62542 765432',
        isFragile: false,
        handlingNote: 'DIRECT SITE DELIVERY',
        labelWidth: 148,
        labelHeight: 105,
        notes: 'Courier: PT Trans Pratama Express',
        createdById: admin.id,
      },
    });

    // Label 3: Standalone Dispatch (A5 Landscape, Fragile: YES)
    const label3 = await prisma.shippingLabel.create({
      data: {
        deliveryOrderId: null,
        sourceType: 'STANDALONE',
        shipDate: new Date('2026-02-22T09:30:00Z'),
        recipientName: phmClient.name,
        attnName: ahmadContact.name,
        destination: projectSenipah.location,
        referenceNumber: projectSenipah.referenceNumber,
        doNumber: 'STANDALONE-202602-001',
        senderName: 'PT ALSSA Corporindo',
        senderAddress: 'Jl. Mulawarman No. 88, RT 01, Sepinggan, Balikpapan Selatan',
        senderPhone: '+62542 765432',
        isFragile: true,
        handlingNote: 'FRAGILE OPTICAL EQUIPMENT • DO NOT DROP',
        labelWidth: 210,
        labelHeight: 148,
        notes: 'Express courier shipment for critical metering components',
        createdById: admin.id,
      },
    });

    for (const lbl of [label1, label2, label3]) {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE_SHIPPING_LABEL',
          entityName: 'ShippingLabel',
          entityId: lbl.id,
          payload: { recipientName: lbl.recipientName, destination: lbl.destination, isFragile: lbl.isFragile, size: (lbl.labelWidth ?? 148) >= 200 ? 'A5' : 'A6' },
          createdAt: new Date(lbl.shipDate),
        },
      });
    }
    console.log('✓ Seeded 3 Shipping Labels (A6 DO Fragile, A6 DO Standard, A5 Standalone Fragile) and audit logs');

    console.log('--- 16. Automated Stock Ledger Consistency Validation ---');
    // Validate that warehouse stocks and project stocks match mathematical movement sum
    const whStocks = await prisma.warehouseStock.findMany({ include: { item: true, warehouse: true } });
    const projStocks = await prisma.projectStock.findMany({ include: { item: true, project: true } });
    const serials = await prisma.itemSerial.findMany({ include: { item: true } });

    console.log(`Checking ${whStocks.length} Warehouse stock ledger entries...`);
    for (const ws of whStocks) {
      console.log(`  [${ws.warehouse.cityCode}] ${ws.item.name}: ${ws.quantity} ${ws.item.unitId ? 'units' : ''}`);
    }

    console.log(`Checking ${projStocks.length} Project stock ledger entries...`);
    for (const ps of projStocks) {
      console.log(`  [Project ${ps.project.name}] ${ps.item.name}: ${ps.quantity}`);
    }

    console.log(`Checking ${serials.length} Serialized asset locations and states...`);
    let inconsistencies = 0;
    for (const s of serials) {
      if (s.state === 'DEPLOY') {
        if (!s.currentProjectId || s.currentWarehouseId) {
          console.error(`  ERROR: Deployed serial ${s.serialNumber} must be in a project, not warehouse!`);
          inconsistencies++;
        }
      } else {
        if (!s.currentWarehouseId || s.currentProjectId) {
          console.error(`  ERROR: Standby/Repair serial ${s.serialNumber} must be in warehouse, not project!`);
          inconsistencies++;
        }
      }
    }

    if (inconsistencies === 0) {
      console.log('✓ Stock Consistency Validation PASSED: 0 mismatches found across all ledgers.');
    } else {
      throw new Error(`Stock Consistency Validation FAILED with ${inconsistencies} mismatches.`);
    }

    console.log('=====================================================');
    console.log('--- Development Seed Rebuild Completed Successfully ---');
    console.log('=====================================================');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error seeding database:', e);
  process.exit(1);
});
