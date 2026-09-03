import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryOrdersService } from './delivery-orders.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  ProjectStatus,
  TrackingType,
} from '../../generated/prisma/client.js';

describe('DeliveryOrdersService', () => {
  let service: DeliveryOrdersService;

  const mockPrisma: any = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: any) => Promise<any>) =>
        callback(mockPrisma),
      ),
    project: {
      findUnique: jest.fn(),
    },
    warehouse: {
      findUnique: jest.fn(),
    },
    item: {
      findUnique: jest.fn(),
    },
    warehouseStock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    projectStock: {
      upsert: jest.fn(),
    },
    itemSerial: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    deliveryOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deliveryOrderItem: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    deliveryOrderItemSerial: {
      create: jest.fn(),
    },
    doSequence: {
      upsert: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    stockMovementItem: {
      create: jest.fn(),
    },
    stockMovementItemSerial: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: (tx: any) => Promise<any>) =>
      callback(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryOrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<DeliveryOrdersService>(DeliveryOrdersService);
  });

  describe('createDraft validation rules', () => {
    it('should throw BadRequestException if project has no Reference Number', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 10,
        name: 'Alpha Project',
        status: ProjectStatus.ACTIVE,
        referenceNumber: null, // missing!
        client: { id: 1, name: 'Client A', isActive: true },
      });

      await expect(
        service.createDraft(1, {
          projectId: 10,
          date: '2026-09-02',
          activity: 'Mobilization',
          items: [{ itemId: 1, quantity: 5 }],
        }),
      ).rejects.toThrow(
        'This project requires a Reference Number before a Delivery Order can be created.',
      );
    });

    it('should throw BadRequestException if project is completed or inactive', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 10,
        name: 'Completed Project',
        status: ProjectStatus.COMPLETED,
        referenceNumber: 'PO-12345',
        client: { id: 1, name: 'Client A', isActive: true },
      });

      await expect(
        service.createDraft(1, {
          projectId: 10,
          date: '2026-09-02',
          activity: 'Mobilization',
          items: [{ itemId: 1, quantity: 5 }],
        }),
      ).rejects.toThrow(
        'Cannot create or modify Delivery Order for a non-active or completed project.',
      );
    });

    it('should reject mixed warehouse selection', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 10,
        name: 'Project Alpha',
        status: ProjectStatus.ACTIVE,
        referenceNumber: 'PO-9988',
        client: { id: 1, name: 'Client A', isActive: true },
      });

      mockPrisma.item.findUnique
        .mockResolvedValueOnce({
          id: 1,
          name: 'Radio Unit',
          trackingType: TrackingType.SERIALIZED,
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 2,
          name: 'Antenna Unit',
          trackingType: TrackingType.SERIALIZED,
          isActive: true,
        });

      mockPrisma.itemSerial.findUnique
        .mockResolvedValueOnce({
          id: 101,
          serialNumber: 'SN-001',
          itemId: 1,
          state: 'STANDBY_GOOD',
          currentWarehouseId: 1, // Warehouse 1
          currentProjectId: null,
        })
        .mockResolvedValueOnce({
          id: 102,
          serialNumber: 'SN-002',
          itemId: 2,
          state: 'STANDBY_GOOD',
          currentWarehouseId: 2, // Warehouse 2 (DIFFERENT!)
          currentProjectId: null,
        });

      await expect(
        service.createDraft(1, {
          projectId: 10,
          date: '2026-09-02',
          activity: 'Rig Install',
          items: [
            { itemId: 1, quantity: 1, serialNumbers: ['SN-001'] },
            { itemId: 2, quantity: 1, serialNumbers: ['SN-002'] },
          ],
        }),
      ).rejects.toThrow(
        'All items and serial numbers in a Delivery Order must come from the same Warehouse. Mixed warehouse selection is rejected.',
      );
    });

    it('should create a draft and record audit log without mutating inventory stock', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 10,
        name: 'Project Alpha',
        status: ProjectStatus.ACTIVE,
        referenceNumber: 'PO-9988',
        clientId: 1,
        client: { id: 1, name: 'Client A', isActive: true },
      });

      mockPrisma.item.findUnique.mockResolvedValue({
        id: 1,
        name: 'Bulk Cable',
        trackingType: TrackingType.BULK,
        isActive: true,
        unit: { name: 'Meter', symbol: 'm' },
      });

      mockPrisma.warehouseStock.findMany.mockResolvedValue([
        { warehouseId: 1, quantity: 100, warehouse: { id: 1, name: 'BPN Main', isActive: true } },
      ]);

      mockPrisma.warehouse.findUnique.mockResolvedValue({
        id: 1,
        name: 'BPN Main',
        cityCode: 'BPN',
        isActive: true,
      });

      mockPrisma.deliveryOrder.create.mockResolvedValue({
        id: 55,
        status: OrderStatus.DRAFT,
        projectId: 10,
        sourceWarehouseId: 1,
      });

      mockPrisma.deliveryOrderItem.create.mockResolvedValue({
        id: 101,
        deliveryOrderId: 55,
        itemId: 1,
        quantity: 20,
      });

      mockPrisma.deliveryOrder.findUnique.mockResolvedValue({
        id: 55,
        status: OrderStatus.DRAFT,
        projectId: 10,
        sourceWarehouseId: 1,
        items: [{ id: 101, itemId: 1, quantity: 20 }],
      });

      const result = await service.createDraft(1, {
        projectId: 10,
        date: '2026-09-02',
        activity: 'Cable Supply',
        items: [{ itemId: 1, quantity: 20 }],
      });

      expect(result.id).toBe(55);
      expect(mockPrisma.warehouseStock.update).not.toHaveBeenCalled();
      expect(mockAuditLogsService.logAction).toHaveBeenCalledWith(
        1,
        'CREATE_DRAFT',
        'delivery_orders',
        55,
        expect.any(Object),
      );
    });
  });

  describe('issueDeliveryOrder workflow', () => {
    it('should generate standard DO number format and execute atomic outgoing stock mutation', async () => {
      const mockDoDraft = {
        id: 77,
        status: OrderStatus.DRAFT,
        date: new Date('2026-09-15'),
        activity: 'Rig Site Supply',
        notes: 'Handle with care',
        projectId: 10,
        sourceWarehouseId: 1,
        client: { id: 1, name: 'PT Pertamina Hulu Mahakam', clientType: 'PHM' },
        project: {
          id: 10,
          name: 'Mahakam Field Expansion',
          status: ProjectStatus.ACTIVE,
          siteCode: 'MH-01',
          location: 'East Kalimantan',
          referenceNumber: 'PO-PHM-2026-009',
          clientId: 1,
          client: { id: 1, name: 'PT Pertamina Hulu Mahakam', clientType: 'PHM', isActive: true },
          clientContact: { id: 5, name: 'Budi Site PIC', phone: '0812345678', email: 'budi@phm.com' },
        },
        sourceWarehouse: {
          id: 1,
          name: 'Balikpapan Central Hub',
          cityCode: 'BPN',
          city: 'Balikpapan',
          location: 'Kariangau',
          isActive: true,
        },
        items: [
          {
            id: 201,
            itemId: 1,
            itemName: 'Industrial Safety Helmet',
            brand: 'MSA',
            modelNumber: 'V-Gard',
            trackingType: TrackingType.BULK,
            quantity: 10,
            unitName: 'Pieces',
            unitSymbol: 'pcs',
            itemSerials: [],
            item: { id: 1, name: 'Industrial Safety Helmet', trackingType: TrackingType.BULK, isActive: true },
          },
        ],
      };

      mockPrisma.deliveryOrder.findUnique.mockResolvedValue(mockDoDraft);
      mockPrisma.project.findUnique.mockResolvedValue(mockDoDraft.project);
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockDoDraft.sourceWarehouse);
      mockPrisma.item.findUnique.mockResolvedValue(mockDoDraft.items[0].item);
      mockPrisma.warehouseStock.findMany.mockResolvedValue([
        { warehouseId: 1, quantity: 50, warehouse: { id: 1, name: 'Balikpapan Central Hub', isActive: true } },
      ]);
      mockPrisma.warehouseStock.findUnique.mockResolvedValue({
        id: 501,
        warehouseId: 1,
        itemId: 1,
        quantity: 50,
      });

      mockPrisma.doSequence.upsert.mockResolvedValue({
        year: 2026,
        currentSequence: 1,
      });

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 999,
        movementNumber: 'MV-OUT-DO-1234',
      });
      mockPrisma.deliveryOrder.update.mockResolvedValue({
        ...mockDoDraft,
        doNumber: '001/ALS-BPN/DO-PHM/IX/2026',
        status: OrderStatus.ISSUED,
        issuedAt: new Date(),
      });

      const issued = await service.issueDeliveryOrder(77, 1);

      expect(issued.doNumber).toBe('001/ALS-BPN/DO-PHM/IX/2026');
      expect(mockPrisma.deliveryOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({
            doNumber: '001/ALS-BPN/DO-PHM/IX/2026',
            status: OrderStatus.ISSUED,
          }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
