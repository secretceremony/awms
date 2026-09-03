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

    // Clean up dependent child tables in proper order for local dev
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

    console.log('--- Seeding Clean Master and Operational Dataset ---');

    // 1. Seed Logistics Admin User (Roberta Pungki)
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
    console.log(`✓ Seeded Logistics Admin: Roberta Pungki (${adminEmail})`);

    // 2. Seed Units
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

    // 3. Seed Cities (Balikpapan -> BPN, Jakarta -> JKT)
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

    // 4. Seed Verified Warehouses
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
    console.log('✓ Seeded Warehouses: Warehouse Balikpapan (BPN), Warehouse Jakarta (JKT)');

    // 5. Seed Verified Company & System Settings
    const defaultSettings = [
      { key: 'inventory.lowStockThreshold', value: '5', description: 'Global threshold for bulk stock low-level indicators' },
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
    console.log('✓ Seeded System & Company Settings');

    // 6. Seed Items across ALL 4 Material Types
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
      // 3. TOOLS (Bulk and Serialized)
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
    }
    console.log(`✓ Seeded ${itemsData.length} Items covering MAIN_MATERIAL, CONSUMABLE, TOOLS, HSE_MATERIAL`);

    // 7. Seed Clients & Contacts (PHM & OTHER)
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
    console.log('✓ Seeded Clients: Pertamina Hulu Mahakam (PHM), TotalEnergies E&P Indonesie (OTHER)');

    // 8. Seed Projects (Active & Completed)
    const phmClient = clientMap.get('Pertamina Hulu Mahakam');
    const budiContact = contactMap.get('Pertamina Hulu Mahakam:Ir. Budi Santoso');
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
        clientContactId: budiContact.id,
        referenceNumber: 'PO-PHM-2026-0940',
        siteCode: 'SNP-02',
        location: 'Senipah Onshore Terminal, Kutai Kartanegara',
        status: ProjectStatus.ACTIVE,
        startedAt: new Date('2026-02-01'),
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
    console.log('✓ Seeded Projects: 2 Active (CPA-01, SNP-02) and 1 Completed (BPN-TEL-01)');

    // 9. Seed Initial Stock Movements and Stock Ledger
    const whBpn = warehouseMap.get('BPN');
    const whJkt = warehouseMap.get('JKT');

    const bpnInitialMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-INIT-BPN-20260101-001',
        movementType: MovementType.INITIAL,
        movementDate: new Date('2026-01-05T08:30:00Z'),
        destinationWarehouseId: whBpn.id,
        notes: 'Initial opening stock intake for Balikpapan Central Warehouse',
        createdById: admin.id,
      },
    });

    const jktInitialMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-INIT-JKT-20260101-002',
        movementType: MovementType.INITIAL,
        movementDate: new Date('2026-01-06T08:30:00Z'),
        destinationWarehouseId: whJkt.id,
        notes: 'Initial opening stock intake for Jakarta Central Warehouse',
        createdById: admin.id,
      },
    });

    // Bulk stock initial quantities (BPN)
    const bpnBulkItems = [
      { name: 'Electrical Cable NYY 4x16mm', qty: 500 },
      { name: 'Fiber Optic Cable 24 Core Armored', qty: 1000 },
      { name: 'Steel Support Bracket 50mm', qty: 150 },
      { name: 'Heavy Duty Cable Tie 300mm', qty: 800 },
      { name: 'Vinyl Electrical Tape Black', qty: 120 },
      { name: 'Industrial Cleaning Cloth Pack', qty: 50 },
      { name: 'Heavy Duty Ratchet Crimping Tool', qty: 10 },
      { name: 'Safety Helmet White (ANSI Z89.1)', qty: 60 },
      { name: 'High-Visibility Reflective Safety Vest', qty: 80 },
      { name: 'Heavy Duty Cut-Resistant Safety Gloves', qty: 100 },
      { name: 'Steel Toe Safety Work Shoes S3', qty: 40 },
    ];

    for (const bi of bpnBulkItems) {
      const it = itemMap.get(bi.name);
      await prisma.stockMovementItem.create({
        data: {
          stockMovementId: bpnInitialMove.id,
          itemId: it.id,
          quantity: bi.qty,
        },
      });
      await prisma.warehouseStock.create({
        data: {
          warehouseId: whBpn.id,
          itemId: it.id,
          quantity: bi.qty,
        },
      });
    }

    // Bulk stock initial quantities (JKT)
    const jktBulkItems = [
      { name: 'Electrical Cable NYY 4x16mm', qty: 200 },
      { name: 'Heavy Duty Cable Tie 300mm', qty: 300 },
      { name: 'Safety Helmet White (ANSI Z89.1)', qty: 30 },
    ];

    for (const bi of jktBulkItems) {
      const it = itemMap.get(bi.name);
      await prisma.stockMovementItem.create({
        data: {
          stockMovementId: jktInitialMove.id,
          itemId: it.id,
          quantity: bi.qty,
        },
      });
      await prisma.warehouseStock.create({
        data: {
          warehouseId: whJkt.id,
          itemId: it.id,
          quantity: bi.qty,
        },
      });
    }

    // 10. Seed Serialized Assets (Fluke Multimeter & Fujikura Splicer)
    const flukeItem = itemMap.get('Digital Multimeter True-RMS');
    const splicerItem = itemMap.get('Core Optical Fiber Fusion Splicer');

    // Serialized in BPN
    const mmBpn1 = await prisma.itemSerial.create({
      data: {
        itemId: flukeItem.id,
        serialNumber: 'MM-BPN-001',
        state: 'STANDBY_GOOD',
        conditionLabel: 'Standby Good',
        currentWarehouseId: whBpn.id,
      },
    });

    const mmBpn2 = await prisma.itemSerial.create({
      data: {
        itemId: flukeItem.id,
        serialNumber: 'MM-BPN-002',
        state: 'STANDBY_GOOD',
        conditionLabel: 'Standby Good',
        currentWarehouseId: whBpn.id,
      },
    });

    const toolBpn1 = await prisma.itemSerial.create({
      data: {
        itemId: splicerItem.id,
        serialNumber: 'TOOL-BPN-001',
        state: 'STANDBY_GOOD',
        conditionLabel: 'Standby Good',
        currentWarehouseId: whBpn.id,
      },
    });

    // Record initial movement items for BPN serials
    const bpnFlukeMoveItem = await prisma.stockMovementItem.create({
      data: {
        stockMovementId: bpnInitialMove.id,
        itemId: flukeItem.id,
        quantity: 2,
      },
    });
    await prisma.stockMovementItemSerial.createMany({
      data: [
        { stockMovementItemId: bpnFlukeMoveItem.id, itemSerialId: mmBpn1.id },
        { stockMovementItemId: bpnFlukeMoveItem.id, itemSerialId: mmBpn2.id },
      ],
    });

    const bpnSplicerMoveItem = await prisma.stockMovementItem.create({
      data: {
        stockMovementId: bpnInitialMove.id,
        itemId: splicerItem.id,
        quantity: 1,
      },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: bpnSplicerMoveItem.id, itemSerialId: toolBpn1.id },
    });

    // Serialized in JKT
    const toolJkt1 = await prisma.itemSerial.create({
      data: {
        itemId: splicerItem.id,
        serialNumber: 'TOOL-JKT-001',
        state: 'STANDBY_GOOD',
        conditionLabel: 'Standby Good',
        currentWarehouseId: whJkt.id,
      },
    });
    const jktSplicerMoveItem = await prisma.stockMovementItem.create({
      data: {
        stockMovementId: jktInitialMove.id,
        itemId: splicerItem.id,
        quantity: 1,
      },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: jktSplicerMoveItem.id, itemSerialId: toolJkt1.id },
    });

    console.log('✓ Seeded Initial Stock Movements and Serialized Assets with correct states');

    // 11. Seed Sample Outgoing Movement + Delivery Order + Shipping Label
    const cableItem = itemMap.get('Electrical Cable NYY 4x16mm');
    const cableTieItem = itemMap.get('Heavy Duty Cable Tie 300mm');

    const outgoingMove = await prisma.stockMovement.create({
      data: {
        movementNumber: 'MV-OUT-BPN-20260210-001',
        movementType: MovementType.OUTGOING,
        movementDate: new Date('2026-02-10T09:15:00Z'),
        sourceWarehouseId: whBpn.id,
        projectId: projectCpa.id,
        notes: 'Project dispatch for CPA-01 offshore maintenance',
        createdById: admin.id,
      },
    });

    // 100m cable out
    await prisma.stockMovementItem.create({
      data: {
        stockMovementId: outgoingMove.id,
        itemId: cableItem.id,
        quantity: 100,
      },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableItem.id } },
      data: { quantity: { decrement: 100 } },
    });
    await prisma.projectStock.create({
      data: {
        projectId: projectCpa.id,
        itemId: cableItem.id,
        quantity: 100,
      },
    });

    // 50 pcs cable tie out
    await prisma.stockMovementItem.create({
      data: {
        stockMovementId: outgoingMove.id,
        itemId: cableTieItem.id,
        quantity: 50,
      },
    });
    await prisma.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: whBpn.id, itemId: cableTieItem.id } },
      data: { quantity: { decrement: 50 } },
    });
    await prisma.projectStock.create({
      data: {
        projectId: projectCpa.id,
        itemId: cableTieItem.id,
        quantity: 50,
      },
    });

    // 1 serial unit MM-BPN-001 deployed to project
    const outFlukeItem = await prisma.stockMovementItem.create({
      data: {
        stockMovementId: outgoingMove.id,
        itemId: flukeItem.id,
        quantity: 1,
      },
    });
    await prisma.stockMovementItemSerial.create({
      data: { stockMovementItemId: outFlukeItem.id, itemSerialId: mmBpn1.id },
    });
    await prisma.itemSerial.update({
      where: { id: mmBpn1.id },
      data: {
        state: 'DEPLOY',
        currentWarehouseId: null,
        currentProjectId: projectCpa.id,
      },
    });

    // Seed Issued Delivery Order for this Outgoing
    await prisma.doSequence.create({
      data: {
        year: 2026,
        currentSequence: 1,
      },
    });

    const doSnapshot = {
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
        {
          itemNo: 1,
          itemId: cableItem.id,
          name: cableItem.name,
          brand: cableItem.brand,
          modelNumber: cableItem.modelNumber,
          quantity: 100,
          unitSymbol: 'm',
          pic: 'Ir. Budi Santoso',
          remarks: 'Good Condition',
          serials: [],
        },
        {
          itemNo: 2,
          itemId: cableTieItem.id,
          name: cableTieItem.name,
          brand: cableTieItem.brand,
          modelNumber: cableTieItem.modelNumber,
          quantity: 50,
          unitSymbol: 'pcs',
          pic: 'Ir. Budi Santoso',
          remarks: 'Good Condition',
          serials: [],
        },
        {
          itemNo: 3,
          itemId: flukeItem.id,
          name: flukeItem.name,
          brand: flukeItem.brand,
          modelNumber: flukeItem.modelNumber,
          quantity: 1,
          unitSymbol: 'unit',
          pic: 'Ir. Budi Santoso',
          remarks: 'Good Condition',
          serials: ['MM-BPN-001'],
        },
      ],
    };

    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        doNumber: '001/ALS-BPN/DO-PHM/II/2026',
        stockMovementId: outgoingMove.id,
        clientId: phmClient.id,
        projectId: projectCpa.id,
        sourceWarehouseId: whBpn.id,
        date: new Date('2026-02-10T09:15:00Z'),
        activity: 'CPA Platform Electrical Maintenance Supplies Dispatch',
        status: OrderStatus.ISSUED,
        issuedAt: new Date('2026-02-10T09:30:00Z'),
        issuedById: admin.id,
        createdById: admin.id,
        snapshots: doSnapshot,
      },
    });

    // Seed Sample Shipping Label
    await prisma.shippingLabel.create({
      data: {
        deliveryOrderId: deliveryOrder.id,
        sourceType: 'DO',
        shipDate: new Date('2026-02-10T10:00:00Z'),
        recipientName: phmClient.name,
        attnName: budiContact.name,
        destination: projectCpa.location,
        referenceNumber: projectCpa.referenceNumber,
        doNumber: deliveryOrder.doNumber,
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

    console.log('✓ Seeded Coherent Sample Transactions (Outgoing -> Delivery Order -> Shipping Label)');
    console.log('--- Development Seed Rebuild Completed Successfully ---');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error seeding database:', e);
  process.exit(1);
});
