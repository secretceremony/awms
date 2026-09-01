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
    it('should successfully create a project with customer', async () => {
      const mockCustomer = { id: 1, name: 'Telkom', isActive: true };
      const mockProject = {
        id: 1,
        name: 'Project Alpha',
        location: 'Jakarta',
        jobNo: 'JOB-001',
        attnName: 'Pak Budi',
        leaderName: 'Andi',
        activity: 'Installation',
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
          jobNo: 'JOB-001',
          attnName: 'Pak Budi',
          leaderName: 'Andi',
          activity: 'Installation',
          customerId: 1,
          startedAt: '2026-09-01',
          endedAt: '2026-09-30',
        },
        1,
      );

      expect(result).toEqual(mockProject);
      expect(mockAuditLogs.logAction).toHaveBeenCalled();
    });

    it('should allow project creation without customer', async () => {
      const mockProject = {
        id: 2,
        name: 'Project Internal',
        location: 'Warehouse A',
        jobNo: null,
        attnName: null,
        leaderName: null,
        activity: null,
        status: ProjectStatus.ACTIVE,
        customerId: null,
        customer: null,
        startedAt: null,
        endedAt: null,
        isActive: true,
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await service.create(
        {
          name: 'Project Internal',
          location: 'Warehouse A',
        },
        1,
      );

      expect(result.customerId).toBeNull();
      expect(mockPrisma.customer.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if customer is inactive', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 1,
        name: 'Telkom',
        isActive: false,
      });

      await expect(
        service.create(
          {
            name: 'Project Alpha',
            location: 'Jakarta',
            customerId: 1,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endedAt is earlier than startedAt', async () => {
      await expect(
        service.create(
          {
            name: 'Project Invalid Date',
            location: 'Jakarta',
            startedAt: '2026-09-30',
            endedAt: '2026-09-01',
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Project Alpha', status: ProjectStatus.ACTIVE },
      ];
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);
      mockPrisma.project.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Alpha',
        status: 'ACTIVE',
      });
      expect(result.data).toEqual(mockProjects);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('findOne', () => {
    it('should return project detail with relations', async () => {
      const mockProject = {
        id: 1,
        name: 'Project Alpha',
        customer: { id: 1, name: 'Telkom' },
        projectStocks: [],
        deliveryOrders: [],
      };
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne(1);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update project status', async () => {
      const mockProject = {
        id: 1,
        name: 'Project Alpha',
        status: ProjectStatus.ACTIVE,
      };
      const updatedMock = { ...mockProject, status: ProjectStatus.COMPLETED };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.project.update.mockResolvedValue(updatedMock);

      const result = await service.updateStatus(
        1,
        { status: ProjectStatus.COMPLETED },
        1,
      );
      expect(result.status).toBe(ProjectStatus.COMPLETED);
      expect(mockAuditLogs.logAction).toHaveBeenCalled();
    });
  });
});
