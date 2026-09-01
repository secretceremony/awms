import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto.js';
import { ProjectsPaginationDto } from './dto/projects-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma, ProjectStatus } from '../../generated/prisma/client.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: number) {
    const name = createProjectDto.name.trim();
    const location = createProjectDto.location.trim();
    const jobNo = createProjectDto.jobNo?.trim() || null;
    const attnName = createProjectDto.attnName?.trim() || null;
    const leaderName = createProjectDto.leaderName?.trim() || null;
    const activity = createProjectDto.activity?.trim() || null;
    const customerId = createProjectDto.customerId ?? null;

    const startedAt = createProjectDto.startedAt
      ? new Date(createProjectDto.startedAt)
      : null;
    const endedAt = createProjectDto.endedAt
      ? new Date(createProjectDto.endedAt)
      : null;

    if (startedAt && endedAt && endedAt < startedAt) {
      throw new BadRequestException(
        'End date cannot be earlier than start date',
      );
    }

    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException(
          'Selected customer is inactive or not found',
        );
      }
    }

    const project = await this.prisma.project.create({
      data: {
        name,
        location,
        jobNo,
        attnName,
        leaderName,
        activity,
        status: ProjectStatus.ACTIVE,
        startedAt,
        endedAt,
        customerId,
        isActive: true,
      },
      include: {
        customer: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'projects', project.id, {
      newValues: {
        name,
        location,
        jobNo,
        attnName,
        leaderName,
        activity,
        status: ProjectStatus.ACTIVE,
        startedAt,
        endedAt,
        customerId,
      },
    });

    return project;
  }

  async findAll(
    paginationDto: ProjectsPaginationDto,
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const status = paginationDto.status;
    const customerId = paginationDto.customerId;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.ProjectWhereInput = {};

    if (status) {
      const normalizedStatus = status.trim().toUpperCase();
      if (normalizedStatus === 'ACTIVE') {
        whereClause.status = ProjectStatus.ACTIVE;
      } else if (normalizedStatus === 'COMPLETED') {
        whereClause.status = ProjectStatus.COMPLETED;
      } else if (normalizedStatus === 'ARCHIVED') {
        whereClause.status = ProjectStatus.ARCHIVED;
      }
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { jobNo: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        projectStocks: {
          include: {
            item: {
              include: {
                unit: true,
              },
            },
          },
        },
        deliveryOrders: {
          select: {
            id: true,
            doNumber: true,
            date: true,
            status: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, userId: number) {
    const project = await this.findOne(id);

    const name = updateProjectDto.name?.trim();
    const location = updateProjectDto.location?.trim();
    const jobNo =
      updateProjectDto.jobNo !== undefined
        ? updateProjectDto.jobNo?.trim() || null
        : undefined;
    const attnName =
      updateProjectDto.attnName !== undefined
        ? updateProjectDto.attnName?.trim() || null
        : undefined;
    const leaderName =
      updateProjectDto.leaderName !== undefined
        ? updateProjectDto.leaderName?.trim() || null
        : undefined;
    const activity =
      updateProjectDto.activity !== undefined
        ? updateProjectDto.activity?.trim() || null
        : undefined;
    const customerId = updateProjectDto.customerId;

    if (customerId && customerId !== project.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException(
          'Selected customer is inactive or not found',
        );
      }
    }

    const startedAt =
      updateProjectDto.startedAt !== undefined
        ? updateProjectDto.startedAt
          ? new Date(updateProjectDto.startedAt)
          : null
        : project.startedAt;

    const endedAt =
      updateProjectDto.endedAt !== undefined
        ? updateProjectDto.endedAt
          ? new Date(updateProjectDto.endedAt)
          : null
        : project.endedAt;

    if (startedAt && endedAt && endedAt < startedAt) {
      throw new BadRequestException(
        'End date cannot be earlier than start date',
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(location && { location }),
        ...(jobNo !== undefined && { jobNo }),
        ...(attnName !== undefined && { attnName }),
        ...(leaderName !== undefined && { leaderName }),
        ...(activity !== undefined && { activity }),
        ...(customerId !== undefined && { customerId }),
        ...(updateProjectDto.startedAt !== undefined && { startedAt }),
        ...(updateProjectDto.endedAt !== undefined && { endedAt }),
      },
      include: {
        customer: true,
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'projects', id, {
      oldValues: {
        name: project.name,
        location: project.location,
        jobNo: project.jobNo,
        attnName: project.attnName,
        leaderName: project.leaderName,
        activity: project.activity,
        customerId: project.customerId,
        startedAt: project.startedAt,
        endedAt: project.endedAt,
      },
      newValues: {
        name: updatedProject.name,
        location: updatedProject.location,
        jobNo: updatedProject.jobNo,
        attnName: updatedProject.attnName,
        leaderName: updatedProject.leaderName,
        activity: updatedProject.activity,
        customerId: updatedProject.customerId,
        startedAt: updatedProject.startedAt,
        endedAt: updatedProject.endedAt,
      },
    });

    return updatedProject;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateProjectStatusDto,
    userId: number,
  ) {
    const project = await this.findOne(id);

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: { customer: true },
    });

    await this.auditLogs.logAction(userId, 'UPDATE_STATUS', 'projects', id, {
      oldValues: { status: project.status },
      newValues: { status: updatedProject.status },
    });

    return updatedProject;
  }
}
