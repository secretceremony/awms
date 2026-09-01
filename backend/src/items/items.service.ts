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
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createItemDto: CreateItemDto, userId: number) {
    const item = await this.prisma.item.create({
      data: createItemDto,
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'items', item.id, {
      newValues: item,
    });

    return item;
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.ItemWhereInput = {
      isActive: true, // Only show active items by default
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
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
        orderBy: { id: 'asc' },
      }),
      this.prisma.item.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        unit: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto, userId: number) {
    const item = await this.findOne(id);

    if (updateItemDto.trackingType && updateItemDto.trackingType !== item.trackingType) {
      const whStock = await this.prisma.warehouseStock.aggregate({
        where: { itemId: id },
        _sum: { quantity: true },
      });
      const whQty = whStock._sum.quantity || 0;

      const projStock = await this.prisma.projectStock.aggregate({
        where: { itemId: id },
        _sum: { quantity: true },
      });
      const projQty = projStock._sum.quantity || 0;

      if (whQty > 0 || projQty > 0) {
        throw new BadRequestException(
          `Cannot change tracking type for item ${id} because it currently holds active stock`,
        );
      }
    }

    const updatedItem = await this.prisma.item.update({
      where: { id },
      data: updateItemDto,
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'items', id, {
      oldValues: item,
      newValues: updatedItem,
    });

    return updatedItem;
  }

  async getItemSerials(id: number, paginationDto: PaginationDto) {
    const item = await this.findOne(id);
    if (item.trackingType !== 'SERIALIZED') {
      throw new BadRequestException(`Item ${id} is not serialized`);
    }

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);
    const search = paginationDto.search;

    const whereClause: Prisma.ItemSerialWhereInput = {
      itemId: id,
      ...(search && {
        serialNumber: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.itemSerial.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          currentWarehouse: { select: { name: true } },
          currentProject: { select: { name: true } },
        },
        orderBy: { serialNumber: 'asc' },
      }),
      this.prisma.itemSerial.count({
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
      throw new BadRequestException(`Item ${item.name} is already deactivated`);
    }

    // 1. Integrity check: verify item has no active stocks in warehouses
    const whStock = await this.prisma.warehouseStock.aggregate({
      where: { itemId: item.id },
      _sum: { quantity: true },
    });

    const whQty = whStock._sum.quantity || 0;
    if (whQty > 0) {
      throw new BadRequestException(
        `Cannot deactivate item ${item.name} because it currently holds active stock (${whQty}) in warehouses`,
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
        `Cannot deactivate item ${item.name} because it currently holds active stock (${projQty}) in projects`,
      );
    }

    // 3. Update status to inactive (Soft Delete)
    const updatedItem = await this.prisma.item.update({
      where: { id: item.id },
      data: { isActive: false },
    });

    // 4. Record action in audit log
    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'items', item.id, {
      oldValues: { name: item.name, isActive: true },
      newValues: { name: item.name, isActive: false },
    });

    return updatedItem;
  }
}
export type { PaginatedResult };
