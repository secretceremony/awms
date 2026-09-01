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
  registeredDate: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
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
    paginationDto: PaginationDto & { trackingType?: string; warehouseId?: number },
  ): Promise<PaginatedResult<StockRow>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search?.trim().toLowerCase();
    const trackingFilter = paginationDto.trackingType?.toUpperCase();
    const warehouseFilter = paginationDto.warehouseId ? Number(paginationDto.warehouseId) : undefined;

    const rows: StockRow[] = [];

    // 1. Fetch Bulk Stocks from warehouse_stocks (ONE ROW PER ITEM + CURRENT LOCATION)
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
          warehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          item: {
            select: {
              id: true,
              name: true,
              brand: true,
              modelNumber: true,
              trackingType: true,
              createdAt: true,
              unit: { select: { name: true, symbol: true } },
              stockMovementItems: {
                take: 1,
                orderBy: { createdAt: 'asc' }, // First recorded movement
                select: { createdAt: true },
              },
            },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
      });

      for (const stock of whStocks) {
        // Stable registration date
        const regDate =
          stock.item.stockMovementItems[0]?.createdAt?.toISOString() ||
          stock.createdAt?.toISOString() ||
          stock.item.createdAt?.toISOString();

        // Short readable location: cityCode if available, otherwise warehouse name
        const locName = stock.warehouse.cityCode || stock.warehouse.name;

        rows.push({
          id: `bulk-wh-${stock.warehouseId}-item-${stock.itemId}`,
          itemId: stock.itemId,
          registeredDate: regDate,
          location: locName,
          locationType: 'WAREHOUSE',
          itemName: stock.item.name,
          brand: stock.item.brand,
          modelNumber: stock.item.modelNumber,
          serialNumber: '-',
          trackingType: 'BULK',
          quantity: stock.quantity,
          unit: stock.item.unit.name,
          unitSymbol: stock.item.unit.symbol || stock.item.unit.name,
          condition: '-',
          currentStatus: 'In Warehouse',
          notes: '-',
        });
      }
    }

    // 2. Fetch Serialized Stocks from item_serials (ONE ROW PER SERIAL NUMBER)
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
              createdAt: true,
              unit: { select: { name: true, symbol: true } },
            },
          },
          currentWarehouse: { select: { id: true, name: true, cityCode: true } },
          currentProject: { select: { id: true, name: true, jobNo: true, location: true } },
          movementSerials: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: {
              stockMovementItem: {
                select: {
                  stockMovement: {
                    select: { createdAt: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { serialNumber: 'asc' }],
      });

      for (const s of serials) {
        // Registered Date: prefer first movement date or serial creation date
        const regDate =
          s.movementSerials[0]?.stockMovementItem?.stockMovement?.createdAt?.toISOString() ||
          s.createdAt?.toISOString() ||
          s.item.createdAt?.toISOString();

        // Short readable location label
        let locName = 'Unassigned';
        let locType: 'WAREHOUSE' | 'PROJECT' = 'WAREHOUSE';
        let currentStatus = 'In Warehouse';

        if (s.currentProjectId && s.currentProject) {
          locName = s.currentProject.jobNo || s.currentProject.name || s.currentProject.location;
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
        }

        const conditionDisplay = s.conditionLabel || (s.state === 'STANDBY_GOOD' ? 'Standby Good' : s.state === 'STANDBY_BAD' ? 'Standby Bad' : s.state === 'UNDER_REPAIR' ? 'Under Repair' : s.state);

        rows.push({
          id: `ser-${s.id}`,
          itemId: s.itemId,
          registeredDate: regDate,
          location: locName,
          locationType: locType,
          itemName: s.item.name,
          brand: s.item.brand,
          modelNumber: s.item.modelNumber,
          serialNumber: s.serialNumber,
          trackingType: 'SERIALIZED',
          quantity: 1, // Always 1 for individual serial
          unit: s.item.unit.name,
          unitSymbol: s.item.unit.symbol || s.item.unit.name,
          condition: conditionDisplay,
          currentStatus,
          notes: s.notes || '-',
        });
      }
    }

    // 3. Search filter
    let filtered = rows;
    if (search) {
      filtered = rows.filter((r) => {
        const matchesName = r.itemName.toLowerCase().includes(search);
        const matchesBrand = r.brand?.toLowerCase().includes(search);
        const matchesMN = r.modelNumber?.toLowerCase().includes(search);
        const matchesLoc = r.location.toLowerCase().includes(search);
        const matchesSN = r.serialNumber !== '-' && r.serialNumber.toLowerCase().includes(search);
        const matchesStatus = r.currentStatus.toLowerCase().includes(search);
        const matchesCondition = r.condition.toLowerCase().includes(search);
        const matchesNotes = r.notes !== '-' && r.notes.toLowerCase().includes(search);
        return (
          matchesName ||
          matchesBrand ||
          matchesMN ||
          matchesLoc ||
          matchesSN ||
          matchesStatus ||
          matchesCondition ||
          matchesNotes
        );
      });
    }

    // 4. Sort by Registered Date (descending)
    filtered.sort(
      (a, b) => new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime(),
    );

    // 5. Paginate
    const total = filtered.length;
    const { skip, take } = getSkipAndTake(page, limit);
    const paginated = filtered.slice(skip, skip + take);

    return createPaginationResult(paginated, total, page, limit);
  }
}
