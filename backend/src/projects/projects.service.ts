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
    const siteCode = createProjectDto.siteCode?.trim() || null;
    const referenceNumber = createProjectDto.referenceNumber?.trim() || null;
    const clientId = createProjectDto.clientId || createProjectDto.customerId;
    const clientContactId = createProjectDto.clientContactId ?? null;

    if (!clientId) {
      throw new BadRequestException('Client is required for a project');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client || !client.isActive) {
      throw new BadRequestException(
        'Selected client is inactive or not found',
      );
    }

    if (clientContactId) {
      const contact = await this.prisma.clientContact.findFirst({
        where: { id: clientContactId, clientId },
      });
      if (!contact || !contact.isActive) {
        throw new BadRequestException(
          'Selected contact does not belong to this client or is inactive',
        );
      }
    }

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

    const project = await this.prisma.project.create({
      data: {
        name,
        location,
        siteCode,
        referenceNumber,
        status: ProjectStatus.ACTIVE,
        startedAt,
        endedAt,
        clientId,
        clientContactId,
      },
      include: {
        client: true,
        clientContact: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'projects', project.id, {
      newValues: {
        name,
        location,
        siteCode,
        referenceNumber,
        status: ProjectStatus.ACTIVE,
        startedAt,
        endedAt,
        clientId,
        clientContactId,
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
    const clientId = paginationDto.clientId || paginationDto.customerId;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.ProjectWhereInput = {};

    if (status && status !== 'all') {
      const normalizedStatus = status.trim().toUpperCase();
      if (normalizedStatus === 'ACTIVE') {
        whereClause.status = ProjectStatus.ACTIVE;
      } else if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'ARCHIVED') {
        whereClause.status = ProjectStatus.COMPLETED;
      }
    }

    if (clientId) {
      whereClause.clientId = clientId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { siteCode: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        {
          client: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          clientContact: {
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
          client: true,
          clientContact: true,
          _count: {
            select: {
              projectStocks: true,
              deliveryOrders: true,
            },
          },
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
        client: true,
        clientContact: true,
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

    if (project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException('Completed project is read-only. Reactivate project to make changes.');
    }

    const name = updateProjectDto.name?.trim();
    const location = updateProjectDto.location?.trim();
    const siteCode =
      updateProjectDto.siteCode !== undefined
        ? updateProjectDto.siteCode?.trim() || null
        : undefined;
    const referenceNumber =
      updateProjectDto.referenceNumber !== undefined
        ? updateProjectDto.referenceNumber?.trim() || null
        : undefined;
    const clientId = updateProjectDto.clientId || updateProjectDto.customerId;
    const clientContactId = updateProjectDto.clientContactId;

    const targetClientId = clientId || project.clientId;

    if (clientId && clientId !== project.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client || !client.isActive) {
        throw new BadRequestException(
          'Selected client is inactive or not found',
        );
      }
    }

    if (clientContactId !== undefined && clientContactId !== null) {
      const contact = await this.prisma.clientContact.findFirst({
        where: { id: clientContactId, clientId: targetClientId },
      });
      if (!contact || !contact.isActive) {
        throw new BadRequestException(
          'Selected contact does not belong to this client or is inactive',
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
        ...(siteCode !== undefined && { siteCode }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(clientId !== undefined && { clientId }),
        ...(clientContactId !== undefined && { clientContactId }),
        ...(updateProjectDto.startedAt !== undefined && { startedAt }),
        ...(updateProjectDto.endedAt !== undefined && { endedAt }),
      },
      include: {
        client: true,
        clientContact: true,
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'projects', id, {
      oldValues: {
        name: project.name,
        location: project.location,
        siteCode: project.siteCode,
        referenceNumber: project.referenceNumber,
        clientId: project.clientId,
        clientContactId: project.clientContactId,
        startedAt: project.startedAt,
        endedAt: project.endedAt,
      },
      newValues: {
        name: updatedProject.name,
        location: updatedProject.location,
        siteCode: updatedProject.siteCode,
        referenceNumber: updatedProject.referenceNumber,
        clientId: updatedProject.clientId,
        clientContactId: updatedProject.clientContactId,
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

    let endedAt = project.endedAt;

    // Rule 18 & 19: Complete Project with Stock warning check & auto-set End Date
    if (updateStatusDto.status === ProjectStatus.COMPLETED && project.status === ProjectStatus.ACTIVE) {
      const [bulkStockCount, serialCount] = await Promise.all([
        this.prisma.projectStock.count({
          where: { projectId: id, quantity: { gt: 0 } },
        }),
        this.prisma.itemSerial.count({
          where: { currentProjectId: id },
        }),
      ]);

      if ((bulkStockCount > 0 || serialCount > 0) && !updateStatusDto.confirmRemainingStock) {
        throw new BadRequestException({
          message: `This project still has inventory assigned to it (${bulkStockCount} bulk item(s), ${serialCount} serial number(s)). Please confirm completion.`,
          requiresConfirmation: true,
          remainingBulkStock: bulkStockCount,
          remainingSerials: serialCount,
        });
      }

      if (!endedAt) {
        endedAt = new Date();
      }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
        endedAt,
      },
      include: { client: true, clientContact: true },
    });

    await this.auditLogs.logAction(userId, 'UPDATE_STATUS', 'projects', id, {
      oldValues: { status: project.status, endedAt: project.endedAt },
      newValues: { status: updatedProject.status, endedAt: updatedProject.endedAt },
    });

    return updatedProject;
  }

  async reactivate(id: number, userId: number) {
    return this.updateStatus(id, { status: ProjectStatus.ACTIVE }, userId);
  }

  async delete(id: number, userId: number) {
    const project = await this.findOne(id);

    // Rule 20: Delete only if completely unreferenced
    const [doCount, stockMovementCount, projectStockCount, serialCount] = await Promise.all([
      this.prisma.deliveryOrder.count({ where: { projectId: id } }),
      this.prisma.stockMovement.count({ where: { projectId: id } }),
      this.prisma.projectStock.count({ where: { projectId: id } }),
      this.prisma.itemSerial.count({ where: { currentProjectId: id } }),
    ]);

    if (doCount > 0 || stockMovementCount > 0 || projectStockCount > 0 || serialCount > 0) {
      throw new BadRequestException(
        `Cannot delete project "${project.name}" because transactional records or equipment references exist. You may mark it as Completed instead.`,
      );
    }

    await this.prisma.project.delete({ where: { id } });

    await this.auditLogs.logAction(userId, 'DELETE', 'projects', id, {
      oldValues: {
        name: project.name,
        location: project.location,
        siteCode: project.siteCode,
        referenceNumber: project.referenceNumber,
        status: project.status,
        clientId: project.clientId,
      },
    });

    return { message: `Project "${project.name}" deleted successfully.` };
  }
}
