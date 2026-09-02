import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma } from '../../generated/prisma/client.js';

interface AuditLogPayload {
  oldValues?: any;
  newValues?: any;
  [key: string]: any;
}

export interface AuditLogFilterDto extends PaginationDto {
  action?: string;
  entityName?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: number | null,
    action: string,
    entityName: string,
    entityId: number | null,
    payload?: AuditLogPayload,
    ipAddress?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityName,
        entityId,
        payload: payload as Prisma.InputJsonValue,
        ipAddress,
      },
    });
  }

  async findAll(paginationDto: AuditLogFilterDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: Prisma.AuditLogWhereInput = {};

    if (paginationDto.action && paginationDto.action !== 'all') {
      where.action = { equals: paginationDto.action, mode: 'insensitive' };
    }

    if (paginationDto.entityName && paginationDto.entityName !== 'all') {
      where.entityName = { equals: paginationDto.entityName, mode: 'insensitive' };
    }

    if (paginationDto.userId) {
      where.userId = Number(paginationDto.userId);
    }

    if (paginationDto.dateFrom || paginationDto.dateTo) {
      where.createdAt = {};
      if (paginationDto.dateFrom) {
        where.createdAt.gte = new Date(paginationDto.dateFrom);
      }
      if (paginationDto.dateTo) {
        const to = new Date(paginationDto.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (paginationDto.search) {
      const s = paginationDto.search.trim();
      const searchConditions: Prisma.AuditLogWhereInput[] = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityName: { contains: s, mode: 'insensitive' } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];

      where.AND = [{ OR: searchConditions }];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log #${id} not found`);
    }

    return log;
  }
}
