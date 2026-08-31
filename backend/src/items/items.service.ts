import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.ItemWhereInput = {
      isActive: true, // Only show active items by default
      ...(search && {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          unit: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { sku: 'asc' },
      }),
      this.prisma.item.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async deactivate(itemId: number, userId: number) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    if (!item.isActive) {
      throw new BadRequestException(`Item ${item.sku} is already deactivated`);
    }

    // 1. Integrity check: verify item has no active stocks in warehouses
    const whStock = await this.prisma.warehouseStock.aggregate({
      where: { itemId: item.id },
      _sum: { quantity: true },
    });

    const whQty = whStock._sum.quantity || 0;
    if (whQty > 0) {
      throw new BadRequestException(
        `Cannot deactivate item ${item.sku} because it currently holds active stock (${whQty}) in warehouses`,
      );
    }

    // 2. Integrity check: verify item has no active stocks in projects
    const projStock = await this.prisma.projectStock.aggregate({
      where: { itemId: item.id },
      _sum: { quantity: true },
    });

    const projQty = projStock._sum.quantity || 0;
    if (projQty > 0) {
      throw new BadRequestException(
        `Cannot deactivate item ${item.sku} because it currently holds active stock (${projQty}) in projects`,
      );
    }

    // 3. Update status to inactive (Soft Delete)
    const updatedItem = await this.prisma.item.update({
      where: { id: item.id },
      data: { isActive: false },
    });

    // 4. Record action in audit log
    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'items', item.id, {
      oldValues: { sku: item.sku, name: item.name, isActive: true },
      newValues: { sku: item.sku, name: item.name, isActive: false },
    });

    return updatedItem;
  }
}
export type { PaginatedResult };
