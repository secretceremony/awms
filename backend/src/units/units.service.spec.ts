import { Test, TestingModule } from '@nestjs/testing';
import { UnitsService } from './units.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';

describe('UnitsService', () => {
  let service: UnitsService;

  const mockPrisma = {
    unit: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn().mockResolvedValue({}),
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
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new unit', async () => {
      const mockUnit = {
        id: 1,
        name: 'Kilogram',
        symbol: 'kg',
        description: 'Mass',
        isActive: true,
      };
      mockPrisma.unit.findUnique.mockResolvedValue(null);
      mockPrisma.unit.create.mockResolvedValue(mockUnit);

      const result = await service.create(
        { name: 'Kilogram', symbol: 'kg', description: 'Mass' },
        1,
      );
      expect(result).toEqual(mockUnit);
      expect(mockPrisma.unit.create).toHaveBeenCalledWith({
        data: {
          name: 'Kilogram',
          symbol: 'kg',
          description: 'Mass',
          isActive: true,
        },
      });
      expect(mockAuditLogs.logAction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if unit name already exists', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({ id: 1, name: 'Kilogram' });
      await expect(service.create({ name: 'Kilogram' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of units', async () => {
      const mockUnits = [{ id: 1, name: 'Kilogram', symbol: 'kg' }];
      mockPrisma.unit.findMany.mockResolvedValue(mockUnits);
      mockPrisma.unit.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'kg',
        status: 'active',
      });
      expect(result.data).toEqual(mockUnits);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('update', () => {
    it('should successfully update a unit', async () => {
      const mockUnit = {
        id: 1,
        name: 'Kilogram',
        symbol: 'kg',
        isActive: true,
      };
      mockPrisma.unit.findUnique.mockResolvedValue(mockUnit);
      mockPrisma.unit.update.mockResolvedValue({ ...mockUnit, symbol: 'kilo' });

      const result = await service.update(1, { symbol: 'kilo' }, 1);
      expect(result.symbol).toEqual('kilo');
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active unit', async () => {
      const mockUnit = {
        id: 1,
        name: 'Kilogram',
        symbol: 'kg',
        isActive: true,
      };
      mockPrisma.unit.findUnique.mockResolvedValue(mockUnit);
      mockPrisma.unit.update.mockResolvedValue({
        ...mockUnit,
        isActive: false,
      });

      const result = await service.deactivate(1, 1);
      expect(result.isActive).toBe(false);
    });
  });
});
