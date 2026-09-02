import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { TrackingType, OrderStatus } from '../../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getSummary() {
    const settings = await this.settingsService.getAllSettings();
    const lowStockThreshold = settings.inventory?.lowStockThreshold || 5;

    const [
      totalItems,
      bulkAgg,
      totalSerialized,
      deployedSerialized,
      underRepairSerialized,
      activeProjects,
      draftDeliveryOrders,
      issuedDeliveryOrders,
      bulkItemsWithStock,
      recentMovements,
      recentDeliveryOrders,
    ] = await Promise.all([
      // 1. Total active item masters
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

      // 3. Total active Serialized Assets
      this.prisma.itemSerial.count({
        where: {
          item: { trackingType: TrackingType.SERIALIZED, isActive: true },
        },
      }),

      // 4. Deployed Serialized Assets at projects
      this.prisma.itemSerial.count({
        where: {
          currentProjectId: { not: null },
          item: { trackingType: TrackingType.SERIALIZED, isActive: true },
        },
      }),

      // 5. Serialized units Under Repair
      this.prisma.itemSerial.count({
        where: {
          item: { trackingType: TrackingType.SERIALIZED, isActive: true },
          OR: [
            { state: 'UNDER_REPAIR' },
            { conditionLabel: 'Under Repair' },
          ],
        },
      }),

      // 6. Active projects count
      this.prisma.project.count({
        where: { status: 'ACTIVE' },
      }),

      // 7. Draft Delivery Orders
      this.prisma.deliveryOrder.count({
        where: { status: OrderStatus.DRAFT },
      }),

      // 8. Issued Delivery Orders
      this.prisma.deliveryOrder.count({
        where: { status: OrderStatus.ISSUED },
      }),

      // 9. Bulk items with their warehouse stock totals for stock health calculation
      this.prisma.item.findMany({
        where: { trackingType: TrackingType.BULK, isActive: true },
        select: {
          id: true,
          name: true,
          warehouseStocks: { select: { quantity: true } },
        },
      }),

      // 10. Recent movements (latest 6)
      this.prisma.stockMovement.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          destinationWarehouse: { select: { name: true, cityCode: true } },
          sourceWarehouse: { select: { name: true, cityCode: true } },
          project: { select: { name: true, siteCode: true, location: true } },
          createdBy: { select: { name: true } },
          items: {
            select: {
              quantity: true,
              item: { select: { name: true, trackingType: true, unit: { select: { symbol: true, name: true } } } },
              movementSerials: {
                select: {
                  itemSerial: { select: { serialNumber: true } },
                },
              },
            },
          },
        },
      }),

      // 11. Recent Delivery Orders (latest 6)
      this.prisma.deliveryOrder.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { name: true, siteCode: true } },
          client: { select: { name: true } },
          items: { select: { quantity: true } },
        },
      }),
    ]);

    // Calculate Stock Health for bulk items
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let normalStockCount = 0;

    bulkItemsWithStock.forEach((item) => {
      const totalQty = item.warehouseStocks.reduce((sum, ws) => sum + ws.quantity, 0);
      if (totalQty === 0) {
        outOfStockCount++;
      } else if (totalQty <= lowStockThreshold) {
        lowStockCount++;
      } else {
        normalStockCount++;
      }
    });

    const totalBulkStock = bulkAgg._sum.quantity || 0;

    const formattedRecentMovements = recentMovements.map((m) => {
      let fromLocation = 'External Supplier';
      let toLocation = 'Warehouse Hub';

      if (m.movementType === 'INITIAL') {
        fromLocation = 'Opening Balance';
        toLocation = m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || 'Warehouse';
      } else if (m.movementType === 'INCOMING') {
        fromLocation = 'External / Supplier';
        toLocation = m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || 'Warehouse';
      } else if (m.movementType === 'OUTGOING') {
        fromLocation = m.sourceWarehouse?.cityCode || m.sourceWarehouse?.name || 'Warehouse';
        toLocation = m.project ? `${m.project.siteCode ? `[${m.project.siteCode}] ` : ''}${m.project.name}` : 'Project';
      } else if (m.movementType === 'RETURN') {
        fromLocation = m.project ? `${m.project.siteCode ? `[${m.project.siteCode}] ` : ''}${m.project.name}` : 'Project';
        toLocation = m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || 'Warehouse';
      } else if (m.movementType === 'ADJUSTMENT') {
        fromLocation = 'Audit';
        toLocation = m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || 'Warehouse';
      }

      const totalQty = m.items.reduce((acc, curr) => acc + curr.quantity, 0);
      const firstItem = m.items[0];
      const firstItemName = firstItem?.item?.name || 'N/A';
      const firstItemSerials = firstItem?.movementSerials || [];
      const serialSn = firstItemSerials[0]?.itemSerial?.serialNumber || null;

      return {
        id: m.id,
        movementNumber: m.movementNumber,
        movementType: m.movementType,
        movementDate: m.movementDate ? m.movementDate.toISOString() : m.createdAt.toISOString(),
        fromLocation,
        toLocation,
        itemCount: totalQty,
        firstItemName,
        serialNumber: serialSn,
        createdBy: m.createdBy?.name || 'System',
        notes: m.notes,
      };
    });

    const formattedRecentDOs = recentDeliveryOrders.map((doDoc) => ({
      id: doDoc.id,
      doNumber: doDoc.doNumber,
      projectName: doDoc.project?.name || doDoc.projectName || 'Project',
      siteCode: doDoc.project?.siteCode || doDoc.siteCode || null,
      clientName: doDoc.client?.name || doDoc.clientCompanyName || 'Client',
      date: doDoc.date ? doDoc.date.toISOString() : doDoc.createdAt.toISOString(),
      status: doDoc.status,
      itemCount: doDoc.items.reduce((sum, it) => sum + it.quantity, 0),
    }));

    return {
      summary: {
        totalItems,
        totalBulkStock,
        totalSerialized,
        deployedSerialized,
        underRepairSerialized,
        activeProjects,
        draftDeliveryOrders,
        issuedDeliveryOrders,
        lowStockThreshold,
      },
      stockHealth: {
        normal: normalStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        underRepair: underRepairSerialized,
        deployed: deployedSerialized,
      },
      recentMovements: formattedRecentMovements,
      recentDeliveryOrders: formattedRecentDOs,
    };
  }
}
