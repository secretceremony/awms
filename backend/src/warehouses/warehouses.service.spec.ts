import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesService } from './warehouses.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prisma: PrismaService;

  const mockPrisma = {
    warehouse: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    warehouseStock: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    itemSerial: {
      count: jest.fn(),
    },
    stockMovement: {
      count: jest.fn(),
    },
    deliveryOrder: {
      count: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn(),
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
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a warehouse with canonical cityCode JKT for Jakarta', async () => {
      const createDto = {
        name: 'Main WH',
        city: 'Jakarta',
        location: 'Cawang',
      };
      const mockWarehouse = { id: 1, ...createDto, cityCode: 'JKT', isActive: true };

      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      mockPrisma.warehouse.findFirst.mockResolvedValue(null);
      mockPrisma.warehouse.create.mockResolvedValue(mockWarehouse);

      const result = await service.create(createDto, 1);
      expect(result).toEqual(mockWarehouse);
      expect(mockPrisma.warehouse.create).toHaveBeenCalledWith({
        data: {
          name: 'Main WH',
          city: 'Jakarta',
          cityCode: 'JKT',
          location: 'Cawang',
          isActive: true,
        },
      });
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'CREATE',
        'warehouses',
        1,
        expect.any(Object),
      );
    });

    it('should generate canonical cityCode BPN for Balikpapan', async () => {
      const createDto = {
        name: 'Balikpapan Hub',
        city: 'Balikpapan',
        location: 'Kariangau',
      };
      const mockWarehouse = { id: 2, ...createDto, cityCode: 'BPN', isActive: true };

      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      mockPrisma.warehouse.findFirst.mockResolvedValue(null);
      mockPrisma.warehouse.create.mockResolvedValue(mockWarehouse);

      const result = await service.create(createDto, 1);
      expect(result.cityCode).toBe('BPN');
    });
  });

  describe('deactivate', () => {
    it('should block deactivation if warehouse has active stock', async () => {
      const mockWarehouse = { id: 1, name: 'Main WH', isActive: true };
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockPrisma.warehouseStock.count.mockResolvedValue(5); // 5 bulk stock records
      mockPrisma.itemSerial.count.mockResolvedValue(0);

      await expect(service.deactivate(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should deactivate if warehouse has 0 stock', async () => {
      const mockWarehouse = { id: 1, name: 'Main WH', isActive: true };
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockPrisma.warehouseStock.count.mockResolvedValue(0);
      mockPrisma.itemSerial.count.mockResolvedValue(0);
      mockPrisma.warehouse.update.mockResolvedValue({ ...mockWarehouse, isActive: false });

      const result = await service.deactivate(1, 1);
      expect(result.isActive).toBe(false);
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'DEACTIVATE',
        'warehouses',
        1,
        expect.any(Object),
      );
    });
  });
});
