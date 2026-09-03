import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { TrackingType, Prisma } from '../../generated/prisma/client.js';

export interface StockRow {
  id: string;
  itemId: number;
  warehouseId?: number | null;
  registeredDate: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT' | 'NONE';
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string;
  unitSymbol: string;
  condition: string;
  currentStatus: string;
  notes: string;
}

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockList(
    paginationDto: PaginationDto & {
      trackingType?: string;
      warehouseId?: number;
      status?: string;
    },
  ): Promise<PaginatedResult<StockRow>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search?.trim();
    const trackingFilter = paginationDto.trackingType?.toUpperCase();
    const warehouseFilter = paginationDto.warehouseId
      ? Number(paginationDto.warehouseId)
      : undefined;
    const statusParam = paginationDto.status?.trim().toLowerCase();

    const lowStockSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'inventory.lowStockThreshold' },
    });
    const lowStockThreshold = lowStockSetting
      ? parseInt(lowStockSetting.value, 10)
      : 5;

    // Helper functions for status checking
    const isSerializedStatus =
      statusParam === 'deploy' ||
      statusParam === 'deployed' ||
      statusParam === 'in warehouse' ||
      statusParam === 'in_warehouse' ||
      statusParam === 'under repair' ||
      statusParam === 'under_repair' ||
      statusParam === 'standby good' ||
      statusParam === 'standby_good' ||
      statusParam === 'standby bad' ||
      statusParam === 'standby_bad';

    const isBulkStatus =
      statusParam === 'low stock' ||
      statusParam === 'low_stock' ||
      statusParam === 'normal' ||
      statusParam === 'out of stock' ||
      statusParam === 'out_of_stock';

    // 1. If only BULK is requested (or status matches bulk-specific status)
    if (
      trackingFilter === 'BULK' ||
      (isBulkStatus && trackingFilter !== 'SERIALIZED')
    ) {
      return this.getBulkStockList({
        page,
        limit,
        search,
        warehouseId: warehouseFilter,
        statusParam,
        lowStockThreshold,
      });
    }

    // 2. If only SERIALIZED is requested (or status matches serialized-specific status)
    if (
      trackingFilter === 'SERIALIZED' ||
      (isSerializedStatus && trackingFilter !== 'BULK')
    ) {
      return this.getSerializedStockList({
        page,
        limit,
        search,
        warehouseId: warehouseFilter,
        statusParam,
      });
    }

    // 3. If ALL tracking types are requested
    return this.getCombinedStockList({
      page,
      limit,
      search,
      warehouseId: warehouseFilter,
      statusParam,
      lowStockThreshold,
    });
  }

  private async getBulkStockList(params: {
    page: number;
    limit: number;
    search?: string;
    warehouseId?: number;
    statusParam?: string;
    lowStockThreshold: number;
  }): Promise<PaginatedResult<StockRow>> {
    const { page, limit, search, warehouseId, statusParam, lowStockThreshold } =
      params;
    const { skip, take } = getSkipAndTake(page, limit);

    // Build Prisma query condition on warehouseStock
    const where: Prisma.WarehouseStockWhereInput = {
      item: {
        trackingType: TrackingType.BULK,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { modelNumber: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      ...(warehouseId && { warehouseId }),
    };

    if (statusParam === 'low stock' || statusParam === 'low_stock') {
      where.quantity = { gt: 0, lte: lowStockThreshold };
    } else if (statusParam === 'normal') {
      where.quantity = { gt: lowStockThreshold };
    } else if (statusParam === 'out of stock' || statusParam === 'out_of_stock') {
      where.quantity = { equals: 0 };
    }

    const [stocks, total] = await Promise.all([
      this.prisma.warehouseStock.findMany({
        where,
        skip,
        take,
        include: {
          warehouse: {
            select: { id: true, name: true, cityCode: true, location: true },
          },
          item: {
            include: {
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
      }),
      this.prisma.warehouseStock.count({ where }),
    ]);

    const rows: StockRow[] = stocks.map((s) => {
      const regDate =
        s.item.stockMovementItems[0]?.createdAt?.toISOString() ||
        s.createdAt.toISOString();
      const statusLabel =
        s.quantity === 0
          ? 'Out of Stock'
          : s.quantity <= lowStockThreshold
          ? 'Low Stock'
          : 'Normal';

      return {
        id: `bulk-wh-${s.warehouseId}-item-${s.itemId}`,
        itemId: s.itemId,
        warehouseId: s.warehouseId,
        registeredDate: regDate,
        location: s.warehouse.cityCode || s.warehouse.name,
        locationType: 'WAREHOUSE',
        itemName: s.item.name,
        brand: s.item.brand,
        modelNumber: s.item.modelNumber,
        serialNumber: '-',
        trackingType: 'BULK',
        quantity: s.quantity,
        unit: s.item.unit.name,
        unitSymbol: s.item.unit.symbol || s.item.unit.name,
        condition: '-',
        currentStatus: statusLabel,
        notes: '-',
      };
    });

    return createPaginationResult(rows, total, page, limit);
  }

  private async getSerializedStockList(params: {
    page: number;
    limit: number;
    search?: string;
    warehouseId?: number;
    statusParam?: string;
  }): Promise<PaginatedResult<StockRow>> {
    const { page, limit, search, warehouseId, statusParam } = params;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: Prisma.ItemSerialWhereInput = {
      item: {
        trackingType: TrackingType.SERIALIZED,
        isActive: true,
      },
      ...(warehouseId && { currentWarehouseId: warehouseId }),
    };

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { brand: { contains: search, mode: 'insensitive' } } },
        { item: { modelNumber: { contains: search, mode: 'insensitive' } } },
        { currentWarehouse: { name: { contains: search, mode: 'insensitive' } } },
        { currentProject: { name: { contains: search, mode: 'insensitive' } } },
        { currentProject: { siteCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (statusParam === 'deploy' || statusParam === 'deployed') {
      where.currentProjectId = { not: null };
    } else if (statusParam === 'in warehouse' || statusParam === 'in_warehouse') {
      where.currentWarehouseId = { not: null };
      where.currentProjectId = null;
    } else if (statusParam === 'under repair' || statusParam === 'under_repair') {
      where.OR = [
        { state: 'UNDER_REPAIR' },
        { conditionLabel: { contains: 'repair', mode: 'insensitive' } },
      ];
    } else if (statusParam === 'standby good' || statusParam === 'standby_good') {
      where.state = 'STANDBY_GOOD';
    } else if (statusParam === 'standby bad' || statusParam === 'standby_bad') {
      where.state = 'STANDBY_BAD';
    }

    const [serials, total] = await Promise.all([
      this.prisma.itemSerial.findMany({
        where,
        skip,
        take,
        include: {
          currentWarehouse: {
            select: { id: true, name: true, cityCode: true },
          },
          currentProject: {
            select: { id: true, name: true, location: true, siteCode: true },
          },
          item: {
            include: {
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { serialNumber: 'asc' }],
      }),
      this.prisma.itemSerial.count({ where }),
    ]);

    const rows: StockRow[] = serials.map((s) => {
      let locName = '-';
      let locType: 'WAREHOUSE' | 'PROJECT' | 'NONE' = 'NONE';
      let currentStatus = 'In Warehouse';

      if (s.currentProjectId && s.currentProject) {
        locName =
          s.currentProject.siteCode ||
          s.currentProject.name ||
          s.currentProject.location;
        locType = 'PROJECT';
        currentStatus = 'Deploy';
      } else if (s.currentWarehouse) {
        locName = s.currentWarehouse.cityCode || s.currentWarehouse.name;
        locType = 'WAREHOUSE';
        const condLower = (s.conditionLabel || s.state || '').toLowerCase();
        if (s.state === 'UNDER_REPAIR' || condLower.includes('repair')) {
          currentStatus = 'Under Repair';
        } else if (s.state === 'STANDBY_BAD' || condLower.includes('bad')) {
          currentStatus = 'Standby Bad';
        } else if (s.state === 'STANDBY_GOOD' || condLower.includes('good')) {
          currentStatus = 'Standby Good';
        } else {
          currentStatus = 'In Warehouse';
        }
      } else {
        currentStatus = 'Out of Stock';
      }

      const conditionDisplay =
        s.conditionLabel ||
        (s.state === 'STANDBY_GOOD'
          ? 'Standby Good'
          : s.state === 'STANDBY_BAD'
          ? 'Standby Bad'
          : s.state === 'UNDER_REPAIR'
          ? 'Under Repair'
          : s.state);

      return {
        id: `ser-${s.id}`,
        itemId: s.itemId,
        warehouseId: s.currentWarehouseId,
        registeredDate: s.createdAt.toISOString(),
        location: locName,
        locationType: locType,
        itemName: s.item.name,
        brand: s.item.brand,
        modelNumber: s.item.modelNumber,
        serialNumber: s.serialNumber,
        trackingType: 'SERIALIZED',
        quantity: 1,
        unit: s.item.unit.name,
        unitSymbol: s.item.unit.symbol || s.item.unit.name,
        condition: conditionDisplay,
        currentStatus,
        notes: s.notes || '-',
      };
    });

    return createPaginationResult(rows, total, page, limit);
  }

  private async getCombinedStockList(params: {
    page: number;
    limit: number;
    search?: string;
    warehouseId?: number;
    statusParam?: string;
    lowStockThreshold: number;
  }): Promise<PaginatedResult<StockRow>> {
    const { page, limit, search, warehouseId, statusParam, lowStockThreshold } =
      params;
    const { skip, take } = getSkipAndTake(page, limit);

    // 1. Build Bulk Where & Count
    const bulkWhere: Prisma.WarehouseStockWhereInput = {
      item: {
        trackingType: TrackingType.BULK,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { modelNumber: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      ...(warehouseId && { warehouseId }),
    };

    if (statusParam === 'low stock' || statusParam === 'low_stock') {
      bulkWhere.quantity = { gt: 0, lte: lowStockThreshold };
    } else if (statusParam === 'normal') {
      bulkWhere.quantity = { gt: lowStockThreshold };
    } else if (statusParam === 'out of stock' || statusParam === 'out_of_stock') {
      bulkWhere.quantity = { equals: 0 };
    }

    // 2. Build Serialized Where & Count
    const serialWhere: Prisma.ItemSerialWhereInput = {
      item: {
        trackingType: TrackingType.SERIALIZED,
        isActive: true,
      },
      ...(warehouseId && { currentWarehouseId: warehouseId }),
    };

    if (search) {
      serialWhere.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { brand: { contains: search, mode: 'insensitive' } } },
        { item: { modelNumber: { contains: search, mode: 'insensitive' } } },
        { currentWarehouse: { name: { contains: search, mode: 'insensitive' } } },
        { currentProject: { name: { contains: search, mode: 'insensitive' } } },
        { currentProject: { siteCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [bulkCount, serialCount] = await Promise.all([
      this.prisma.warehouseStock.count({ where: bulkWhere }),
      this.prisma.itemSerial.count({ where: serialWhere }),
    ]);

    const total = bulkCount + serialCount;
    const rows: StockRow[] = [];

    // Determine how many bulk and serial items to fetch for current page
    if (skip < bulkCount) {
      const bulkTake = Math.min(take, bulkCount - skip);
      const bulkStocks = await this.prisma.warehouseStock.findMany({
        where: bulkWhere,
        skip,
        take: bulkTake,
        include: {
          warehouse: {
            select: { id: true, name: true, cityCode: true, location: true },
          },
          item: {
            include: {
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
      });

      for (const s of bulkStocks) {
        const regDate =
          s.item.stockMovementItems[0]?.createdAt?.toISOString() ||
          s.createdAt.toISOString();
        const statusLabel =
          s.quantity === 0
            ? 'Out of Stock'
            : s.quantity <= lowStockThreshold
            ? 'Low Stock'
            : 'Normal';

        rows.push({
          id: `bulk-wh-${s.warehouseId}-item-${s.itemId}`,
          itemId: s.itemId,
          warehouseId: s.warehouseId,
          registeredDate: regDate,
          location: s.warehouse.cityCode || s.warehouse.name,
          locationType: 'WAREHOUSE',
          itemName: s.item.name,
          brand: s.item.brand,
          modelNumber: s.item.modelNumber,
          serialNumber: '-',
          trackingType: 'BULK',
          quantity: s.quantity,
          unit: s.item.unit.name,
          unitSymbol: s.item.unit.symbol || s.item.unit.name,
          condition: '-',
          currentStatus: statusLabel,
          notes: '-',
        });
      }

      // If page still needs serialized items
      const remainingTake = take - rows.length;
      if (remainingTake > 0 && serialCount > 0) {
        const serials = await this.prisma.itemSerial.findMany({
          where: serialWhere,
          skip: 0,
          take: remainingTake,
          include: {
            currentWarehouse: {
              select: { id: true, name: true, cityCode: true },
            },
            currentProject: {
              select: { id: true, name: true, location: true, siteCode: true },
            },
            item: {
              include: {
                unit: { select: { name: true, symbol: true } },
                stockMovementItems: {
                  take: 1,
                  orderBy: { createdAt: 'asc' },
                  select: { createdAt: true },
                },
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { serialNumber: 'asc' }],
        });

        for (const s of serials) {
          let locName = '-';
          let locType: 'WAREHOUSE' | 'PROJECT' | 'NONE' = 'NONE';
          let currentStatus = 'In Warehouse';

          if (s.currentProjectId && s.currentProject) {
            locName =
              s.currentProject.siteCode ||
              s.currentProject.name ||
              s.currentProject.location;
            locType = 'PROJECT';
            currentStatus = 'Deploy';
          } else if (s.currentWarehouse) {
            locName = s.currentWarehouse.cityCode || s.currentWarehouse.name;
            locType = 'WAREHOUSE';
            const condLower = (s.conditionLabel || s.state || '').toLowerCase();
            if (s.state === 'UNDER_REPAIR' || condLower.includes('repair')) {
              currentStatus = 'Under Repair';
            } else if (s.state === 'STANDBY_BAD' || condLower.includes('bad')) {
              currentStatus = 'Standby Bad';
            } else if (s.state === 'STANDBY_GOOD' || condLower.includes('good')) {
              currentStatus = 'Standby Good';
            } else {
              currentStatus = 'In Warehouse';
            }
          } else {
            currentStatus = 'Out of Stock';
          }

          const conditionDisplay =
            s.conditionLabel ||
            (s.state === 'STANDBY_GOOD'
              ? 'Standby Good'
              : s.state === 'STANDBY_BAD'
              ? 'Standby Bad'
              : s.state === 'UNDER_REPAIR'
              ? 'Under Repair'
              : s.state);

          rows.push({
            id: `ser-${s.id}`,
            itemId: s.itemId,
            warehouseId: s.currentWarehouseId,
            registeredDate: s.createdAt.toISOString(),
            location: locName,
            locationType: locType,
            itemName: s.item.name,
            brand: s.item.brand,
            modelNumber: s.item.modelNumber,
            serialNumber: s.serialNumber,
            trackingType: 'SERIALIZED',
            quantity: 1,
            unit: s.item.unit.name,
            unitSymbol: s.item.unit.symbol || s.item.unit.name,
            condition: conditionDisplay,
            currentStatus,
            notes: s.notes || '-',
          });
        }
      }
    } else {
      // Entire page is in serialized range
      const serialSkip = skip - bulkCount;
      const serials = await this.prisma.itemSerial.findMany({
        where: serialWhere,
        skip: serialSkip,
        take,
        include: {
          currentWarehouse: {
            select: { id: true, name: true, cityCode: true },
          },
          currentProject: {
            select: { id: true, name: true, location: true, siteCode: true },
          },
          item: {
            include: {
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { serialNumber: 'asc' }],
      });

      for (const s of serials) {
        let locName = '-';
        let locType: 'WAREHOUSE' | 'PROJECT' | 'NONE' = 'NONE';
        let currentStatus = 'In Warehouse';

        if (s.currentProjectId && s.currentProject) {
          locName =
            s.currentProject.siteCode ||
            s.currentProject.name ||
            s.currentProject.location;
          locType = 'PROJECT';
          currentStatus = 'Deploy';
        } else if (s.currentWarehouse) {
          locName = s.currentWarehouse.cityCode || s.currentWarehouse.name;
          locType = 'WAREHOUSE';
          const condLower = (s.conditionLabel || s.state || '').toLowerCase();
          if (s.state === 'UNDER_REPAIR' || condLower.includes('repair')) {
            currentStatus = 'Under Repair';
          } else if (s.state === 'STANDBY_BAD' || condLower.includes('bad')) {
            currentStatus = 'Standby Bad';
          } else if (s.state === 'STANDBY_GOOD' || condLower.includes('good')) {
            currentStatus = 'Standby Good';
          } else {
            currentStatus = 'In Warehouse';
          }
        } else {
          currentStatus = 'Out of Stock';
        }

        const conditionDisplay =
          s.conditionLabel ||
          (s.state === 'STANDBY_GOOD'
            ? 'Standby Good'
            : s.state === 'STANDBY_BAD'
            ? 'Standby Bad'
            : s.state === 'UNDER_REPAIR'
            ? 'Under Repair'
            : s.state);

        rows.push({
          id: `ser-${s.id}`,
          itemId: s.itemId,
          warehouseId: s.currentWarehouseId,
          registeredDate: s.createdAt.toISOString(),
          location: locName,
          locationType: locType,
          itemName: s.item.name,
          brand: s.item.brand,
          modelNumber: s.item.modelNumber,
          serialNumber: s.serialNumber,
          trackingType: 'SERIALIZED',
          quantity: 1,
          unit: s.item.unit.name,
          unitSymbol: s.item.unit.symbol || s.item.unit.name,
          condition: conditionDisplay,
          currentStatus,
          notes: s.notes || '-',
        });
      }
    }

    return createPaginationResult(rows, total, page, limit);
  }
}
