import { Test, TestingModule } from '@nestjs/testing';
import { UnitsService } from './units.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';

describe('UnitsService', () => {
  let service: UnitsService;
  let prisma: PrismaService;

  const mockPrisma = {
    unit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    item: {
      count: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new unit with normalized lowercase symbol', async () => {
      const createDto = {
        name: 'Pieces',
        symbol: 'PCS',
      };
      const mockUnit = { id: 1, name: 'Pieces', symbol: 'pcs', isActive: true };

      mockPrisma.unit.findFirst.mockResolvedValue(null);
      mockPrisma.unit.create.mockResolvedValue(mockUnit);

      const result = await service.create(createDto, 1);
      expect(result).toEqual(mockUnit);
      expect(mockPrisma.unit.create).toHaveBeenCalledWith({
        data: {
          name: 'Pieces',
          symbol: 'pcs',
          isActive: true,
        },
      });
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'CREATE',
        'units',
        1,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if unit name already exists case-insensitively', async () => {
      const createDto = {
        name: 'Pieces',
        symbol: 'pcs',
      };

      mockPrisma.unit.findFirst.mockResolvedValueOnce({ id: 1, name: 'pieces', symbol: 'pcs' });

      await expect(service.create(createDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should block delete if assigned to items', async () => {
      const mockUnit = { id: 1, name: 'Pcs', symbol: 'pcs', isActive: true };
      mockPrisma.unit.findUnique.mockResolvedValue(mockUnit);
      mockPrisma.item.count.mockResolvedValue(3); // 3 items reference this unit

      await expect(service.delete(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
