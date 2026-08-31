import { Injectable } from '@nestjs/common';
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

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const { skip, take } = getSkipAndTake(page, limit);

    // Apply search filter if provided
    const whereClause: Prisma.AuditLogWhereInput = search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' } },
            { entityName: { contains: search, mode: 'insensitive' } },
            {
              user: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
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
      this.prisma.auditLog.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }
}
