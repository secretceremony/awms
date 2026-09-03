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

  async checkDuplicate(name: string, brand?: string, modelNumber?: string, excludeId?: number) {
    const trimmedName = name?.trim();
    if (!trimmedName) return { isDuplicate: false, matches: [] };

    const trimmedBrand = brand?.trim();
    const trimmedMN = modelNumber?.trim();

    const orConditions: Prisma.ItemWhereInput[] = [
      { name: { equals: trimmedName, mode: 'insensitive' } },
    ];

    if (trimmedMN) {
      orConditions.push({ modelNumber: { equals: trimmedMN, mode: 'insensitive' } });
    }

    if (trimmedBrand && trimmedMN) {
      orConditions.push({
        AND: [
          { brand: { equals: trimmedBrand, mode: 'insensitive' } },
          { modelNumber: { equals: trimmedMN, mode: 'insensitive' } },
        ],
      });
    }

    const matches = await this.prisma.item.findMany({
      where: {
        isActive: true,
        ...(excludeId && { id: { not: excludeId } }),
        OR: orConditions,
      },
      include: {
        unit: { select: { id: true, name: true, symbol: true } },
      },
      take: 5,
    });

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
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
          { modelNumber: { contains: search, mode: 'insensitive' } },
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
              id: true,
              name: true,
              symbol: true,
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
            id: true,
            name: true,
            symbol: true,
          },
        },
        warehouseStocks: {
          where: { quantity: { gt: 0 } },
          include: {
            warehouse: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async getItemBalances(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        unit: {
          select: { id: true, name: true, symbol: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.trackingType === 'BULK') {
      // 1. Warehouse Stocks for BULK
      const warehouseStocks = await this.prisma.warehouseStock.findMany({
        where: { itemId: id, quantity: { gt: 0 } },
        include: {
          warehouse: {
            select: { id: true, name: true, cityCode: true, city: true, location: true },
          },
        },
        orderBy: { warehouse: { name: 'asc' } },
      });

      // 2. Project Stocks for BULK (if deployed to client project sites)
      const projectStocks = await this.prisma.projectStock.findMany({
        where: { itemId: id, quantity: { gt: 0 } },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              siteCode: true,
              location: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { project: { name: 'asc' } },
      });

      const totalWarehouseQty = warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
      const totalProjectQty = projectStocks.reduce((sum, ps) => sum + ps.quantity, 0);

      return {
        itemId: item.id,
        itemName: item.name,
        trackingType: item.trackingType,
        unit: item.unit?.symbol || item.unit?.name || 'pcs',
        totalQuantity: totalWarehouseQty + totalProjectQty,
        totalWarehouseQuantity: totalWarehouseQty,
        totalProjectQuantity: totalProjectQty,
        warehouseStocks,
        projectStocks,
      };
    }

    // SERIALIZED tracking type: source of truth is item_serials table
    const [totalSerials, deployedCount, inWarehouseCount, standbyGoodCount, underRepairCount] =
      await Promise.all([
        this.prisma.itemSerial.count({ where: { itemId: id } }),
        this.prisma.itemSerial.count({ where: { itemId: id, currentProjectId: { not: null } } }),
        this.prisma.itemSerial.count({
          where: { itemId: id, currentWarehouseId: { not: null }, currentProjectId: null },
        }),
        this.prisma.itemSerial.count({
          where: { itemId: id, state: 'STANDBY_GOOD' },
        }),
        this.prisma.itemSerial.count({
          where: { itemId: id, state: 'UNDER_REPAIR' },
        }),
      ]);

    return {
      itemId: item.id,
      itemName: item.name,
      trackingType: item.trackingType,
      unit: item.unit?.symbol || item.unit?.name || 'pcs',
      totalQuantity: totalSerials,
      inWarehouseQuantity: inWarehouseCount,
      deployedQuantity: deployedCount,
      standbyGoodQuantity: standbyGoodCount,
      underRepairQuantity: underRepairCount,
      warehouseStocks: [],
      projectStocks: [],
    };
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
          currentWarehouse: { select: { id: true, name: true, cityCode: true } },
          currentProject: { select: { id: true, name: true, location: true } },
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
