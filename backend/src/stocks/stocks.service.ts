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
    paginationDto: PaginationDto & { trackingType?: string; warehouseId?: number },
  ): Promise<PaginatedResult<StockRow>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search?.trim().toLowerCase();
    const trackingFilter = paginationDto.trackingType?.toUpperCase();
    const warehouseFilter = paginationDto.warehouseId ? Number(paginationDto.warehouseId) : undefined;

    const rows: StockRow[] = [];

    // 1. Bulk Items & Stocks
    if (!trackingFilter || trackingFilter === 'ALL' || trackingFilter === 'BULK') {
      const bulkItems = await this.prisma.item.findMany({
        where: {
          trackingType: TrackingType.BULK,
          isActive: true,
        },
        include: {
          unit: { select: { name: true, symbol: true } },
          warehouseStocks: {
            where: {
              ...(warehouseFilter && { warehouseId: warehouseFilter }),
            },
            include: {
              warehouse: { select: { id: true, name: true, cityCode: true, location: true } },
            },
          },
          stockMovementItems: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      for (const item of bulkItems) {
        const regDate =
          item.stockMovementItems[0]?.createdAt?.toISOString() ||
          item.createdAt?.toISOString();

        const activeStocks = item.warehouseStocks.filter((ws) => ws.quantity > 0);

        if (activeStocks.length > 0) {
          for (const stock of activeStocks) {
            const locName = stock.warehouse.cityCode || stock.warehouse.name;
            rows.push({
              id: `bulk-wh-${stock.warehouseId}-item-${item.id}`,
              itemId: item.id,
              registeredDate: regDate,
              location: locName,
              locationType: 'WAREHOUSE',
              itemName: item.name,
              brand: item.brand,
              modelNumber: item.modelNumber,
              serialNumber: '-',
              trackingType: 'BULK',
              quantity: stock.quantity,
              unit: item.unit.name,
              unitSymbol: item.unit.symbol || item.unit.name,
              condition: '-',
              currentStatus: 'In Warehouse',
              notes: '-',
            });
          }
        } else if (!warehouseFilter) {
          // Unassigned / 0 quantity bulk item
          rows.push({
            id: `bulk-item-${item.id}-nostock`,
            itemId: item.id,
            registeredDate: regDate,
            location: '-',
            locationType: 'NONE',
            itemName: item.name,
            brand: item.brand,
            modelNumber: item.modelNumber,
            serialNumber: '-',
            trackingType: 'BULK',
            quantity: 0,
            unit: item.unit.name,
            unitSymbol: item.unit.symbol || item.unit.name,
            condition: '-',
            currentStatus: 'Out of Stock',
            notes: '-',
          });
        }
      }
    }

    // 2. Serialized Items & Serials
    if (!trackingFilter || trackingFilter === 'ALL' || trackingFilter === 'SERIALIZED') {
      const serializedItems = await this.prisma.item.findMany({
        where: {
          trackingType: TrackingType.SERIALIZED,
          isActive: true,
        },
        include: {
          unit: { select: { name: true, symbol: true } },
          itemSerials: {
            where: {
              ...(warehouseFilter && { currentWarehouseId: warehouseFilter }),
            },
            include: {
              currentWarehouse: { select: { id: true, name: true, cityCode: true } },
              currentProject: { select: { id: true, name: true, location: true } },
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
          },
          stockMovementItems: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      for (const item of serializedItems) {
        const itemRegDate =
          item.stockMovementItems[0]?.createdAt?.toISOString() ||
          item.createdAt?.toISOString();

        if (item.itemSerials.length > 0) {
          for (const s of item.itemSerials) {
            const regDate =
              s.movementSerials[0]?.stockMovementItem?.stockMovement?.createdAt?.toISOString() ||
              s.createdAt?.toISOString() ||
              itemRegDate;

            let locName = '-';
            let locType: 'WAREHOUSE' | 'PROJECT' | 'NONE' = 'NONE';
            let currentStatus = 'In Warehouse';

            if (s.currentProjectId && s.currentProject) {
              locName = s.currentProject.name || s.currentProject.location;
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
              itemId: item.id,
              registeredDate: regDate,
              location: locName,
              locationType: locType,
              itemName: item.name,
              brand: item.brand,
              modelNumber: item.modelNumber,
              serialNumber: s.serialNumber,
              trackingType: 'SERIALIZED',
              quantity: 1,
              unit: item.unit.name,
              unitSymbol: item.unit.symbol || item.unit.name,
              condition: conditionDisplay,
              currentStatus,
              notes: s.notes || '-',
            });
          }
        } else if (!warehouseFilter) {
          // Serialized item without serial records yet
          rows.push({
            id: `ser-item-${item.id}-nostock`,
            itemId: item.id,
            registeredDate: itemRegDate,
            location: '-',
            locationType: 'NONE',
            itemName: item.name,
            brand: item.brand,
            modelNumber: item.modelNumber,
            serialNumber: '-',
            trackingType: 'SERIALIZED',
            quantity: 0,
            unit: item.unit.name,
            unitSymbol: item.unit.symbol || item.unit.name,
            condition: '-',
            currentStatus: 'Out of Stock',
            notes: '-',
          });
        }
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
