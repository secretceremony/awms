import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { TrackingType } from '../../generated/prisma/client.js';

export interface StockRow {
  id: string;
  itemId: number;
  date: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  serialNumbers?: string[];
  quantity: number;
  unit: string;
  unitSymbol: string | null;
  condition?: string | null;
  state?: string | null;
}

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockList(
    paginationDto: PaginationDto & { trackingType?: string; warehouseId?: number },
  ): Promise<PaginatedResult<StockRow>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search?.trim().toLowerCase();
    const trackingFilter = paginationDto.trackingType?.toUpperCase();
    const warehouseFilter = paginationDto.warehouseId ? Number(paginationDto.warehouseId) : undefined;

    const rows: StockRow[] = [];

    // 1. Fetch Bulk Stocks from warehouse_stocks (if not filtering SERIALIZED only)
    if (!trackingFilter || trackingFilter === 'ALL' || trackingFilter === 'BULK') {
      const whStocks = await this.prisma.warehouseStock.findMany({
        where: {
          quantity: { gt: 0 },
          item: {
            trackingType: TrackingType.BULK,
            isActive: true,
          },
          ...(warehouseFilter && { warehouseId: warehouseFilter }),
        },
        include: {
          warehouse: { select: { id: true, name: true, location: true } },
          item: {
            select: {
              id: true,
              name: true,
              brand: true,
              modelNumber: true,
              trackingType: true,
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
      });

      for (const stock of whStocks) {
        const latestDate =
          stock.item.stockMovementItems[0]?.createdAt?.toISOString() ||
          new Date().toISOString();

        rows.push({
          id: `bulk-wh-${stock.warehouseId}-item-${stock.itemId}`,
          itemId: stock.itemId,
          date: latestDate,
          location: stock.warehouse.name,
          locationType: 'WAREHOUSE',
          itemName: stock.item.name,
          brand: stock.item.brand,
          modelNumber: stock.item.modelNumber,
          trackingType: 'BULK',
          quantity: stock.quantity,
          unit: stock.item.unit.name,
          unitSymbol: stock.item.unit.symbol,
        });
      }
    }

    // 2. Fetch Serialized Stocks from item_serials (if not filtering BULK only)
    if (!trackingFilter || trackingFilter === 'ALL' || trackingFilter === 'SERIALIZED') {
      const serials = await this.prisma.itemSerial.findMany({
        where: {
          item: {
            trackingType: TrackingType.SERIALIZED,
            isActive: true,
          },
          OR: [
            { currentWarehouseId: { not: null } },
            { currentProjectId: { not: null } },
          ],
          ...(warehouseFilter && { currentWarehouseId: warehouseFilter }),
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              brand: true,
              modelNumber: true,
              trackingType: true,
              unit: { select: { name: true, symbol: true } },
            },
          },
          currentWarehouse: { select: { id: true, name: true } },
          currentProject: { select: { id: true, name: true, jobNo: true } },
        },
        orderBy: [{ itemId: 'asc' }, { serialNumber: 'asc' }],
      });

      // Group serials by (itemId + location)
      const serialMap = new Map<string, {
        itemId: number;
        date: string;
        location: string;
        locationType: 'WAREHOUSE' | 'PROJECT';
        itemName: string;
        brand: string | null;
        modelNumber: string | null;
        trackingType: 'SERIALIZED';
        serialNumbers: string[];
        unit: string;
        unitSymbol: string | null;
        state: string;
        condition: string | null;
      }>();

      for (const s of serials) {
        const locName = s.currentWarehouse?.name || s.currentProject?.name || 'Unassigned';
        const locType = s.currentWarehouse ? 'WAREHOUSE' : 'PROJECT';
        const key = `ser-item-${s.itemId}-loc-${locType}-${s.currentWarehouseId || s.currentProjectId}`;

        if (!serialMap.has(key)) {
          serialMap.set(key, {
            itemId: s.itemId,
            date: s.updatedAt.toISOString(),
            location: locName,
            locationType: locType,
            itemName: s.item.name,
            brand: s.item.brand,
            modelNumber: s.item.modelNumber,
            trackingType: 'SERIALIZED',
            serialNumbers: [s.serialNumber],
            unit: s.item.unit.name,
            unitSymbol: s.item.unit.symbol,
            state: s.state,
            condition: s.conditionLabel,
          });
        } else {
          const entry = serialMap.get(key)!;
          entry.serialNumbers.push(s.serialNumber);
          if (new Date(s.updatedAt) > new Date(entry.date)) {
            entry.date = s.updatedAt.toISOString();
          }
        }
      }

      for (const [key, val] of serialMap.entries()) {
        rows.push({
          id: key,
          itemId: val.itemId,
          date: val.date,
          location: val.location,
          locationType: val.locationType,
          itemName: val.itemName,
          brand: val.brand,
          modelNumber: val.modelNumber,
          trackingType: 'SERIALIZED',
          serialNumbers: val.serialNumbers,
          quantity: val.serialNumbers.length,
          unit: val.unit,
          unitSymbol: val.unitSymbol,
          state: val.state,
          condition: val.condition,
        });
      }
    }

    // 3. In-memory Filter by search if provided
    let filtered = rows;
    if (search) {
      filtered = rows.filter((r) => {
        const matchesName = r.itemName.toLowerCase().includes(search);
        const matchesBrand = r.brand?.toLowerCase().includes(search);
        const matchesMN = r.modelNumber?.toLowerCase().includes(search);
        const matchesLoc = r.location.toLowerCase().includes(search);
        const matchesSN = r.serialNumbers?.some((sn) =>
          sn.toLowerCase().includes(search),
        );
        return matchesName || matchesBrand || matchesMN || matchesLoc || matchesSN;
      });
    }

    // Sort by latest date
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Paginate
    const total = filtered.length;
    const { skip, take } = getSkipAndTake(page, limit);
    const paginated = filtered.slice(skip, skip + take);

    return createPaginationResult(paginated, total, page, limit);
  }
}
