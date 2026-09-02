import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '../../generated/prisma/client.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn().mockResolvedValue({}),
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
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a project with user/company and reference number', async () => {
      const mockCustomer = { id: 1, name: 'Company A', isActive: true };
      const mockProject = {
        id: 1,
        name: 'Project Alpha',
        location: 'Jakarta',
        referenceNumber: 'PO-2026-001',
        attnName: 'Pak Budi',
        leaderName: 'Andi',
        status: ProjectStatus.ACTIVE,
        customerId: 1,
        customer: mockCustomer,
        startedAt: new Date('2026-09-01'),
        endedAt: new Date('2026-09-30'),
        isActive: true,
      };

      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await service.create(
        {
          name: 'Project Alpha',
          location: 'Jakarta',
          referenceNumber: 'PO-2026-001',
          attnName: 'Pak Budi',
          leaderName: 'Andi',
          customerId: 1,
          startedAt: '2026-09-01',
          endedAt: '2026-09-30',
        },
        1,
      );

      expect(result).toEqual(mockProject);
      expect(mockAuditLogs.logAction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if customerId is missing', async () => {
      await expect(
        service.create(
          {
            name: 'Project Internal',
            location: 'Warehouse A',
            customerId: undefined as any,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if customer is inactive', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 2,
        name: 'Inactive Co',
        isActive: false,
      });

      await expect(
        service.create(
          {
            name: 'Project Beta',
            location: 'Bandung',
            customerId: 2,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endedAt is earlier than startedAt', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 1,
        name: 'Company A',
        isActive: true,
      });

      await expect(
        service.create(
          {
            name: 'Project Gamma',
            location: 'Surabaya',
            customerId: 1,
            startedAt: '2026-09-30',
            endedAt: '2026-09-01',
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update status to COMPLETED and log audit', async () => {
      const existingProject = {
        id: 1,
        name: 'Project Alpha',
        status: ProjectStatus.ACTIVE,
        customer: { id: 1, name: 'Company A' },
      };
      const updatedProject = {
        ...existingProject,
        status: ProjectStatus.COMPLETED,
      };

      mockPrisma.project.findUnique.mockResolvedValue(existingProject);
      mockPrisma.project.update.mockResolvedValue(updatedProject);

      const result = await service.updateStatus(
        1,
        { status: ProjectStatus.COMPLETED },
        1,
      );

      expect(result.status).toBe(ProjectStatus.COMPLETED);
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'UPDATE_STATUS',
        'projects',
        1,
        expect.anything(),
      );
    });
  });
});
