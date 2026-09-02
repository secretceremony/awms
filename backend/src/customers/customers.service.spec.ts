import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientType } from '../../generated/prisma/client.js';

describe('CustomersService (Clients)', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockPrisma = {
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    clientContact: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    deliveryOrder: {
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockAuditLogs = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a client', async () => {
      const createDto = {
        name: 'Company A',
        clientType: ClientType.PHM,
        email: 'user@comp-a.com',
        phone: '+62812345678',
        address: 'Jl. Sudirman No. 1',
      };
      const mockClient = { id: 1, ...createDto, isActive: true };

      mockPrisma.client.create.mockResolvedValue(mockClient);

      const result = await service.create(createDto, 1);
      expect(result).toEqual(mockClient);
      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: {
          name: 'Company A',
          clientType: ClientType.PHM,
          email: 'user@comp-a.com',
          phone: '+62812345678',
          address: 'Jl. Sudirman No. 1',
          isActive: true,
        },
      });
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'CREATE',
        'clients',
        1,
        expect.any(Object),
      );
    });

    it('should allow client without optional email or phone', async () => {
      const createDto = {
        name: 'Company B',
        clientType: ClientType.OTHER,
      };
      const mockClient = {
        id: 2,
        name: 'Company B',
        clientType: ClientType.OTHER,
        email: null,
        phone: null,
        address: null,
        isActive: true,
      };

      mockPrisma.client.create.mockResolvedValue(mockClient);

      const result = await service.create(createDto, 1);
      expect(result).toEqual(mockClient);
    });
  });

  describe('deactivate', () => {
    it('should block deactivation if client has active projects', async () => {
      const mockClient = { id: 1, name: 'Company A', isActive: true };
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);
      mockPrisma.project.count.mockResolvedValue(2); // 2 active projects

      await expect(service.deactivate(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should deactivate if no active projects', async () => {
      const mockClient = { id: 1, name: 'Company A', isActive: true };
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, isActive: false });

      const result = await service.deactivate(1, 1);
      expect(result.isActive).toBe(false);
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'DEACTIVATE',
        'clients',
        1,
        expect.any(Object),
      );
    });
  });
});
