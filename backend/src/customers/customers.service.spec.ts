import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockPrisma = {
    customer: {
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
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a customer', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Telkom Indonesia',
        code: 'TELKOM',
        attnName: 'Pak Budi',
        email: 'budi@telkom.co.id',
        phone: '0812345678',
        address: 'Gatot Subroto',
        isActive: true,
      };
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(
        {
          name: 'Telkom Indonesia',
          code: 'TELKOM',
          attnName: 'Pak Budi',
          email: 'budi@telkom.co.id',
          phone: '0812345678',
          address: 'Gatot Subroto',
        },
        1,
      );

      expect(result).toEqual(mockCustomer);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'Telkom Indonesia',
          code: 'TELKOM',
          attnName: 'Pak Budi',
          email: 'budi@telkom.co.id',
          phone: '0812345678',
          address: 'Gatot Subroto',
          isActive: true,
        },
      });
    });

    it('should allow customer without code or email', async () => {
      const mockCustomer = {
        id: 2,
        name: 'No Code Customer',
        code: null,
        attnName: null,
        email: null,
        phone: null,
        address: null,
        isActive: true,
      };
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create({ name: 'No Code Customer' }, 1);
      expect(result.code).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should throw BadRequestException if duplicate code provided', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 1,
        code: 'TELKOM',
      });

      await expect(
        service.create({ name: 'Telkom New', code: 'TELKOM' }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
