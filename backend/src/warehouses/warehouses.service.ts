import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { WarehousesPaginationDto } from './dto/warehouses-pagination.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createWarehouseDto: CreateWarehouseDto, userId: number) {
    const name = createWarehouseDto.name.trim();
    const city = createWarehouseDto.city.trim();
    const cityCode = await this.generateCityCode(city);
    const location = createWarehouseDto.location.trim();
    const description = createWarehouseDto.description?.trim();

    // Unique name check
    const existing = await this.prisma.warehouse.findUnique({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('Warehouse name already exists');
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        name,
        city,
        cityCode,
        location,
        description,
        isActive: true,
      },
    });

    await this.auditLogs.logAction(
      userId,
      'CREATE',
      'warehouses',
      warehouse.id,
      {
        newValues: {
          name,
          city,
          cityCode,
          location,
          description,
          isActive: true,
        },
      },
    );

    return warehouse;
  }

  async findAll(
    paginationDto: WarehousesPaginationDto,
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const status = paginationDto.status; // active, inactive, all
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.WarehouseWhereInput = {};

    // Filter by status
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { cityCode: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.warehouse.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  async update(
    id: number,
    updateWarehouseDto: UpdateWarehouseDto,
    userId: number,
  ) {
    const warehouse = await this.findOne(id);

    const name = updateWarehouseDto.name?.trim();
    const city = updateWarehouseDto.city?.trim();
    const location = updateWarehouseDto.location?.trim();
    const description = updateWarehouseDto.description?.trim();

    let cityCode = warehouse.cityCode;
    if (city && city !== warehouse.city) {
      const hasHistory = await this.prisma.warehouse.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              sourceStockMovements: true,
              destinationStockMovements: true,
              deliveryOrders: true,
            },
          },
        },
      });
      const isReferenced = hasHistory
        ? hasHistory._count.sourceStockMovements > 0 ||
          hasHistory._count.destinationStockMovements > 0 ||
          hasHistory._count.deliveryOrders > 0
        : false;

      if (!isReferenced) {
        cityCode = await this.generateCityCode(city);
      }
    }

    // Check unique name if updated
    if (name && name !== warehouse.name) {
      const existing = await this.prisma.warehouse.findUnique({
        where: { name },
      });
      if (existing) {
        throw new BadRequestException('Warehouse name already exists');
      }
    }

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(city && { city }),
        cityCode,
        ...(location && { location }),
        ...(description !== undefined && { description }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'warehouses', id, {
      oldValues: {
        name: warehouse.name,
        city: warehouse.city,
        cityCode: warehouse.cityCode,
        location: warehouse.location,
        description: warehouse.description,
      },
      newValues: {
        name: updatedWarehouse.name,
        city: updatedWarehouse.city,
        cityCode: updatedWarehouse.cityCode,
        location: updatedWarehouse.location,
        description: updatedWarehouse.description,
      },
    });

    return updatedWarehouse;
  }

  async deactivate(id: number, userId: number) {
    const warehouse = await this.findOne(id);

    if (!warehouse.isActive) {
      throw new BadRequestException(
        `Warehouse ${warehouse.name} is already inactive`,
      );
    }

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'warehouses', id, {
      oldValues: { name: warehouse.name, isActive: true },
      newValues: { name: warehouse.name, isActive: false },
    });

    return updatedWarehouse;
  }

  async getStocks(
    warehouseId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    // Verify warehouse exists
    await this.findOne(warehouseId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    // Fetch warehouse stock records
    const [warehouseStocks, total] = await Promise.all([
      this.prisma.warehouseStock.findMany({
        where: { warehouseId },
        include: {
          item: {
            include: {
              unit: true,
            },
          },
        },
        skip,
        take,
        orderBy: { item: { name: 'asc' } },
      }),
      this.prisma.warehouseStock.count({
        where: { warehouseId },
      }),
    ]);

    const data = [];
    for (const ws of warehouseStocks) {
      const item = ws.item;
      let serialNumbers: string[] = [];

      if (item.trackingType === 'SERIALIZED') {
        // Fetch active serial numbers in this warehouse
        const serials = await this.prisma.itemSerial.findMany({
          where: {
            itemId: item.id,
            status: 'IN_STOCK',
          },
          include: {
            movementSerials: {
              include: {
                stockMovementItem: {
                  include: {
                    stockMovement: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        });

        // Filter for serials whose latest movement was to this warehouse
        const activeSerials = serials.filter((s) => {
          const latestMovement =
            s.movementSerials[0]?.stockMovementItem?.stockMovement;
          return latestMovement?.destinationWarehouseId === warehouseId;
        });

        serialNumbers = activeSerials.map((s) => s.serialNumber);
      }

      data.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        trackingType: item.trackingType,
        quantity: ws.quantity,
        unit: item.unit?.name || null,
        symbol: item.unit?.symbol || null,
        serialNumbers:
          item.trackingType === 'SERIALIZED' ? serialNumbers : undefined,
      });
    }

    return createPaginationResult(data, total, page, limit);
  }

  private async generateCityCode(city: string): Promise<string> {
    const trimmedCity = city.trim();
    // 1. Same city check
    const existingSameCity = await this.prisma.warehouse.findFirst({
      where: { city: { equals: trimmedCity, mode: 'insensitive' } },
    });
    if (existingSameCity && existingSameCity.cityCode) {
      return existingSameCity.cityCode;
    }

    const cleanCity = trimmedCity.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanCity.length < 3) {
      // Pad with 'X'
      const base = (cleanCity + 'XXX').substring(0, 2);
      for (let i = 1; i <= 9; i++) {
        const candidate = `${base}${i}`;
        const conflict = await this.prisma.warehouse.findFirst({
          where: { cityCode: candidate },
        });
        if (!conflict) return candidate;
      }
      throw new BadRequestException('Could not generate unique city code');
    }

    // Try first 3 letters
    const opt1 = cleanCity.substring(0, 3);
    const conflict1 = await this.prisma.warehouse.findFirst({
      where: { cityCode: opt1 },
    });
    if (!conflict1) return opt1;

    // Try some combinations of 3 characters:
    // 0, 1, 3
    if (cleanCity.length >= 4) {
      const opt = cleanCity[0] + cleanCity[1] + cleanCity[3];
      const conflict = await this.prisma.warehouse.findFirst({
        where: { cityCode: opt },
      });
      if (!conflict) return opt;
    }
    // 0, 2, 3
    if (cleanCity.length >= 4) {
      const opt = cleanCity[0] + cleanCity[2] + cleanCity[3];
      const conflict = await this.prisma.warehouse.findFirst({
        where: { cityCode: opt },
      });
      if (!conflict) return opt;
    }

    // Fallback: 2 letters + digit
    const base = cleanCity.substring(0, 2);
    for (let i = 1; i <= 9; i++) {
      const candidate = `${base}${i}`;
      const conflict = await this.prisma.warehouse.findFirst({
        where: { cityCode: candidate },
      });
      if (!conflict) return candidate;
    }

    throw new BadRequestException('Could not generate unique city code');
  }
}
