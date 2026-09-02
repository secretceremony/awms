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

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

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

    // Check unique name if updated
    if (name && name !== warehouse.name) {
      const existing = await this.prisma.warehouse.findUnique({
        where: { name },
      });
      if (existing) {
        throw new BadRequestException('Warehouse name already exists');
      }
    }

    // City code is permanently immutable on update!
    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(city && { city }),
        ...(location && { location }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'warehouses', id, {
      oldValues: {
        name: warehouse.name,
        city: warehouse.city,
        cityCode: warehouse.cityCode,
        location: warehouse.location,
      },
      newValues: {
        name: updatedWarehouse.name,
        city: updatedWarehouse.city,
        cityCode: updatedWarehouse.cityCode,
        location: updatedWarehouse.location,
      },
    });

    return updatedWarehouse;
  }

  async deactivate(id: number, userId: number) {
    const warehouse = await this.findOne(id);

    if (!warehouse.isActive) {
      throw new BadRequestException(
        `Warehouse "${warehouse.name}" is already inactive`,
      );
    }

    // Rule 10: Check if active stock exists
    const [bulkStockCount, serialCount] = await Promise.all([
      this.prisma.warehouseStock.count({
        where: { warehouseId: id, quantity: { gt: 0 } },
      }),
      this.prisma.itemSerial.count({
        where: { currentWarehouseId: id },
      }),
    ]);

    if (bulkStockCount > 0 || serialCount > 0) {
      throw new BadRequestException(
        `Cannot deactivate warehouse "${warehouse.name}" because it still contains active stock (${bulkStockCount} bulk item(s), ${serialCount} serial number(s)). Please transfer or adjust all inventory to 0 before deactivating.`,
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

  async reactivate(id: number, userId: number) {
    const warehouse = await this.findOne(id);

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogs.logAction(userId, 'REACTIVATE', 'warehouses', id, {
      oldValues: { name: warehouse.name, isActive: false },
      newValues: { name: warehouse.name, isActive: true },
    });

    return updatedWarehouse;
  }

  async delete(id: number, userId: number) {
    const warehouse = await this.findOne(id);

    // Rule 10: Delete only if Warehouse has NEVER been referenced
    const [srcMovements, dstMovements, doCount, wsCount, serialCount] = await Promise.all([
      this.prisma.stockMovement.count({ where: { sourceWarehouseId: id } }),
      this.prisma.stockMovement.count({ where: { destinationWarehouseId: id } }),
      this.prisma.deliveryOrder.count({ where: { sourceWarehouseId: id } }),
      this.prisma.warehouseStock.count({ where: { warehouseId: id } }),
      this.prisma.itemSerial.count({ where: { currentWarehouseId: id } }),
    ]);

    if (srcMovements > 0 || dstMovements > 0 || doCount > 0 || wsCount > 0 || serialCount > 0) {
      throw new BadRequestException(
        `Cannot delete warehouse "${warehouse.name}" because historical movements or inventory records exist. You may deactivate it instead.`,
      );
    }

    await this.prisma.warehouse.delete({ where: { id } });

    await this.auditLogs.logAction(userId, 'DELETE', 'warehouses', id, {
      oldValues: {
        name: warehouse.name,
        city: warehouse.city,
        cityCode: warehouse.cityCode,
        location: warehouse.location,
      },
    });

    return { message: `Warehouse "${warehouse.name}" deleted successfully.` };
  }

  async getStocks(
    warehouseId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    await this.findOne(warehouseId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

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
        const serials = await this.prisma.itemSerial.findMany({
          where: {
            itemId: item.id,
            currentWarehouseId: warehouseId,
          },
          orderBy: { serialNumber: 'asc' },
        });

        serialNumbers = serials.map((s) => s.serialNumber);
      }

      data.push({
        itemId: item.id,
        itemName: item.name,
        brand: item.brand || item.name,
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
    const lower = trimmedCity.toLowerCase();

    // Canonical City Codes (Rule 8)
    if (lower === 'balikpapan') return 'BPN';
    if (lower === 'jakarta') return 'JKT';

    // 1. Same city check (Multiple warehouses in same city share city code - Rule 9)
    const existingSameCity = await this.prisma.warehouse.findFirst({
      where: { city: { equals: trimmedCity, mode: 'insensitive' } },
    });
    if (existingSameCity && existingSameCity.cityCode) {
      return existingSameCity.cityCode;
    }

    const cleanCity = trimmedCity.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanCity.length < 3) {
      return (cleanCity + 'XXX').substring(0, 3);
    }

    return cleanCity.substring(0, 3);
  }
}
