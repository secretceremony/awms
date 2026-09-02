import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { TrackingType, MovementType } from '../../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalItems,
      bulkAgg,
      totalSerializedItems,
      incomingCount,
      outgoingCount,
      activeProjects,
      deliveryOrdersCount,
      recentMovements,
    ] = await Promise.all([
      // 1. Total active master items
      this.prisma.item.count({
        where: { isActive: true },
      }),

      // 2. Total Bulk Stock from warehouse_stocks
      this.prisma.warehouseStock.aggregate({
        where: {
          quantity: { gt: 0 },
          item: { trackingType: TrackingType.BULK, isActive: true },
        },
        _sum: { quantity: true },
      }),

      // 3. Total active Serialized Devices currently in warehouses or deployed to projects
      this.prisma.itemSerial.count({
        where: {
          item: { trackingType: TrackingType.SERIALIZED, isActive: true },
          OR: [
            { currentWarehouseId: { not: null } },
            { currentProjectId: { not: null } },
          ],
        },
      }),

      // 4. Incoming stock movements count
      this.prisma.stockMovement.count({
        where: { movementType: MovementType.INCOMING },
      }),

      // 5. Outgoing stock movements count
      this.prisma.stockMovement.count({
        where: { movementType: MovementType.OUTGOING },
      }),

      // 6. Active projects count
      this.prisma.project.count({
        where: { isActive: true },
      }),

      // 7. Delivery orders count
      this.prisma.deliveryOrder.count(),

      // 8. Recent 5 movements
      this.prisma.stockMovement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          destinationWarehouse: { select: { name: true, cityCode: true } },
          sourceWarehouse: { select: { name: true, cityCode: true } },
          project: { select: { name: true, jobNo: true } },
          createdBy: { select: { name: true } },
          items: {
            select: {
              quantity: true,
              item: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const totalBulkStock = bulkAgg._sum.quantity || 0;
    const currentStock = totalBulkStock + totalSerializedItems;

    const formattedRecentMovements = recentMovements.map((m) => {
      let location = '-';
      if (m.destinationWarehouse) {
        location = m.destinationWarehouse.cityCode || m.destinationWarehouse.name;
      } else if (m.sourceWarehouse) {
        location = m.sourceWarehouse.cityCode || m.sourceWarehouse.name;
      } else if (m.project) {
        location = m.project.jobNo || m.project.name;
      }

      const totalItemsCount = m.items.reduce((acc, curr) => acc + curr.quantity, 0);

      return {
        id: m.id,
        movementNumber: m.movementNumber,
        movementType: m.movementType,
        date: m.createdAt.toISOString(),
        location,
        createdBy: m.createdBy?.name || '-',
        itemCount: totalItemsCount,
        firstItemName: m.items[0]?.item?.name || 'N/A',
      };
    });

    return {
      totalItems,
      totalBulkStock,
      totalSerializedItems,
      currentStock,
      incomingCount,
      outgoingCount,
      activeProjects,
      deliveryOrders: deliveryOrdersCount,
      recentMovements: formattedRecentMovements,
    };
  }
}
