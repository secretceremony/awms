import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '../../generated/prisma/client.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  const mockPrisma = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    clientContact: {
      findFirst: jest.fn(),
    },
    projectStock: {
      count: jest.fn(),
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
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new project with client and siteCode', async () => {
      const createDto = {
        name: 'Alpha Expansion',
        clientId: 1,
        location: 'Handil Site',
        siteCode: 'HDL-01',
        referenceNumber: 'PO-2026-999',
      };
      const mockProject = {
        id: 1,
        ...createDto,
        status: ProjectStatus.ACTIVE,
        clientContactId: null,
        startedAt: null,
        endedAt: null,
      };

      mockPrisma.client.findUnique.mockResolvedValue({ id: 1, name: 'Company A', isActive: true });
      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 1);
      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Alpha Expansion',
          clientId: 1,
          clientContactId: null,
          location: 'Handil Site',
          siteCode: 'HDL-01',
          referenceNumber: 'PO-2026-999',
          status: ProjectStatus.ACTIVE,
          startedAt: null,
          endedAt: null,
        },
        include: {
          client: true,
          clientContact: true,
        },
      });
    });

    it('should throw BadRequestException if endedAt is earlier than startedAt', async () => {
      const createDto = {
        name: 'Invalid Dates',
        clientId: 1,
        location: 'Site A',
        startedAt: '2026-05-01',
        endedAt: '2026-04-01',
      };

      mockPrisma.client.findUnique.mockResolvedValue({ id: 1, name: 'Company A', isActive: true });

      await expect(service.create(createDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should require confirmation if project still has remaining stock', async () => {
      const mockProject = {
        id: 1,
        name: 'Active Project',
        status: ProjectStatus.ACTIVE,
        endedAt: null,
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectStock.count.mockResolvedValue(2); // 2 bulk stock
      mockPrisma.itemSerial.count.mockResolvedValue(1); // 1 serial

      await expect(
        service.updateStatus(1, { status: ProjectStatus.COMPLETED }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete project if confirmRemainingStock is true', async () => {
      const mockProject = {
        id: 1,
        name: 'Active Project',
        status: ProjectStatus.ACTIVE,
        endedAt: null,
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectStock.count.mockResolvedValue(2);
      mockPrisma.itemSerial.count.mockResolvedValue(1);
      mockPrisma.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.COMPLETED,
        endedAt: new Date(),
      });

      const result = await service.updateStatus(
        1,
        { status: ProjectStatus.COMPLETED, confirmRemainingStock: true },
        1,
      );
      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });
  });
});
