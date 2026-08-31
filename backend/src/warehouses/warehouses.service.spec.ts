import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesService } from './warehouses.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';

describe('WarehousesService', () => {
  let service: WarehousesService;

  const mockPrisma = {
    warehouse: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    warehouseStock: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    itemSerial: {
      findMany: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new warehouse', async () => {
      const mockWarehouse = {
        id: 1,
        name: 'Main WH',
        city: 'Jakarta',
        cityCode: 'JAK',
        location: 'Cawang',
        description: 'Main hub',
        isActive: true,
      };
      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      mockPrisma.warehouse.findFirst.mockResolvedValue(null);
      mockPrisma.warehouse.create.mockResolvedValue(mockWarehouse);

      const result = await service.create(
        {
          name: 'Main WH',
          city: 'Jakarta',
          location: 'Cawang',
          description: 'Main hub',
        },
        1,
      );
      expect(result).toEqual(mockWarehouse);
      expect(mockPrisma.warehouse.create).toHaveBeenCalledWith({
        data: {
          name: 'Main WH',
          city: 'Jakarta',
          cityCode: 'JAK',
          location: 'Cawang',
          description: 'Main hub',
          isActive: true,
        },
      });
      expect(mockAuditLogs.logAction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if warehouse name already exists', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({
        id: 1,
        name: 'Main WH',
      });
      await expect(
        service.create(
          {
            name: 'Main WH',
            city: 'Jakarta',
            cityCode: 'JKT',
            location: 'Cawang',
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of warehouses', async () => {
      const mockWarehouses = [{ id: 1, name: 'Main WH' }];
      mockPrisma.warehouse.findMany.mockResolvedValue(mockWarehouses);
      mockPrisma.warehouse.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Main',
        status: 'active',
      });
      expect(result.data).toEqual(mockWarehouses);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('getStocks', () => {
    it('should return paginated stocks for a warehouse', async () => {
      const mockWarehouse = { id: 1, name: 'Main WH' };
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockWarehouse);

      const mockStocks = [
        {
          id: 1,
          quantity: 100,
          item: {
            id: 10,
            name: 'Bulk Item',
            sku: 'SKU-BULK',
            trackingType: 'BULK',
            unit: { name: 'Pcs' },
          },
        },
      ];
      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.warehouseStock.count.mockResolvedValue(1);

      const result = await service.getStocks(1, { page: 1, limit: 10 });
      const firstItem = result.data[0] as Record<string, unknown>;
      expect(firstItem.itemName).toEqual('Bulk Item');
      expect(firstItem.quantity).toEqual(100);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active warehouse', async () => {
      const mockWarehouse = { id: 1, name: 'Main WH', isActive: true };
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockPrisma.warehouse.update.mockResolvedValue({
        ...mockWarehouse,
        isActive: false,
      });

      const result = await service.deactivate(1, 1);
      expect(result.isActive).toBe(false);
    });
  });
});
