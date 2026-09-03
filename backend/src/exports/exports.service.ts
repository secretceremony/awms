import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import ExcelJS from 'exceljs';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private styleHeaderRow(row: ExcelJS.Row) {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2250A1' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    row.height = 24;
  }

  private autoFitColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      if (column.header) {
        maxLength = Math.max(maxLength, column.header.toString().length + 4);
      }
      column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value !== null && cell.value !== undefined) {
          const valStr = cell.value instanceof Date ? 'DD/MM/YYYY' : cell.value.toString();
          maxLength = Math.max(maxLength, Math.min(valStr.length + 3, 50));
        }
      });
      column.width = maxLength;
    });
  }

  private formatDate(date?: Date | string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateTime(date?: Date | string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  async generateWorkbook(generatedBy = 'Roberta Pungki'): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = generatedBy;
    workbook.lastModifiedBy = generatedBy;
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Stock List
    const stockSheet = workbook.addWorksheet('Stock List');
    stockSheet.columns = [
      { header: 'Item Name', key: 'itemName' },
      { header: 'Brand', key: 'brand' },
      { header: 'Tracking Type', key: 'trackingType' },
      { header: 'Location / Warehouse', key: 'warehouse' },
      { header: 'Allocated Project', key: 'project' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Condition', key: 'condition' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Status', key: 'status' },
      { header: 'Last Updated', key: 'updatedAt' },
    ];
    this.styleHeaderRow(stockSheet.getRow(1));

    // Serialized stock
    const serials = await this.prisma.itemSerial.findMany({
      include: {
        item: { include: { unit: true } },
        currentWarehouse: true,
        currentProject: true,
      },
      orderBy: { id: 'desc' },
    });

    for (const s of serials) {
      stockSheet.addRow({
        itemName: s.item?.name || '—',
        brand: s.item?.brand || '—',
        trackingType: 'SERIALIZED',
        warehouse: s.currentWarehouse?.name || '—',
        project: s.currentProject?.name || '—',
        serialNumber: s.serialNumber || '—',
        condition: s.conditionLabel || 'Good',
        quantity: 1,
        unit: s.item?.unit?.symbol || 'pcs',
        status: s.state || 'STANDBY_GOOD',
        updatedAt: this.formatDate(s.updatedAt),
      });
    }

    // Bulk stock
    const bulkStocks = await this.prisma.warehouseStock.findMany({
      include: {
        item: { include: { unit: true } },
        warehouse: true,
      },
      orderBy: { id: 'desc' },
    });

    for (const b of bulkStocks) {
      if (b.item.trackingType === 'BULK') {
        stockSheet.addRow({
          itemName: b.item.name,
          brand: b.item.brand || '—',
          trackingType: 'BULK',
          warehouse: b.warehouse?.name || '—',
          project: '—',
          serialNumber: '—',
          condition: 'Good',
          quantity: b.quantity,
          unit: b.item.unit?.symbol || 'pcs',
          status: b.quantity > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
          updatedAt: this.formatDate(b.updatedAt),
        });
      }
    }
    this.autoFitColumns(stockSheet);

    // 2. Master Items
    const itemsSheet = workbook.addWorksheet('Items');
    itemsSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Item Name', key: 'name' },
      { header: 'Brand', key: 'brand' },
      { header: 'Model Number', key: 'modelNumber' },
      { header: 'Tracking Type', key: 'trackingType' },
      { header: 'Unit', key: 'unit' },
      { header: 'Status', key: 'status' },
      { header: 'Created Date', key: 'createdAt' },
    ];
    this.styleHeaderRow(itemsSheet.getRow(1));

    const allItems = await this.prisma.item.findMany({
      include: { unit: true },
      orderBy: { id: 'asc' },
    });
    for (const it of allItems) {
      itemsSheet.addRow({
        id: it.id,
        name: it.name,
        brand: it.brand || '—',
        modelNumber: it.modelNumber || '—',
        trackingType: it.trackingType,
        unit: it.unit?.symbol || 'pcs',
        status: it.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: this.formatDate(it.createdAt),
      });
    }
    this.autoFitColumns(itemsSheet);

    // 3. Clients
    const clientsSheet = workbook.addWorksheet('Clients');
    clientsSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Client / Company Name', key: 'name' },
      { header: 'Client Type', key: 'clientType' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Address', key: 'address' },
      { header: 'Status', key: 'status' },
    ];
    this.styleHeaderRow(clientsSheet.getRow(1));

    const clients = await this.prisma.client.findMany({
      orderBy: { id: 'asc' },
    });
    for (const c of clients) {
      clientsSheet.addRow({
        id: c.id,
        name: c.name,
        clientType: c.clientType,
        email: c.email || '—',
        phone: c.phone || '—',
        address: c.address || '—',
        status: c.isActive ? 'ACTIVE' : 'INACTIVE',
      });
    }
    this.autoFitColumns(clientsSheet);

    // 4. Client Contacts
    const contactsSheet = workbook.addWorksheet('Client Contacts');
    contactsSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Client Company', key: 'clientName' },
      { header: 'Contact Name (Attn)', key: 'name' },
      { header: 'Phone', key: 'phone' },
      { header: 'Email', key: 'email' },
      { header: 'Status', key: 'status' },
    ];
    this.styleHeaderRow(contactsSheet.getRow(1));

    const contacts = await this.prisma.clientContact.findMany({
      include: { client: true },
      orderBy: { id: 'asc' },
    });
    for (const cc of contacts) {
      contactsSheet.addRow({
        id: cc.id,
        clientName: cc.client?.name || '—',
        name: cc.name,
        phone: cc.phone || '—',
        email: cc.email || '—',
        status: cc.isActive ? 'ACTIVE' : 'INACTIVE',
      });
    }
    this.autoFitColumns(contactsSheet);

    // 5. Warehouses
    const whSheet = workbook.addWorksheet('Warehouses');
    whSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Warehouse Name', key: 'name' },
      { header: 'City', key: 'city' },
      { header: 'City Code', key: 'cityCode' },
      { header: 'Location Details', key: 'location' },
      { header: 'Status', key: 'status' },
    ];
    this.styleHeaderRow(whSheet.getRow(1));

    const warehouses = await this.prisma.warehouse.findMany({
      orderBy: { id: 'asc' },
    });
    for (const w of warehouses) {
      whSheet.addRow({
        id: w.id,
        name: w.name,
        city: w.city,
        cityCode: w.cityCode,
        location: w.location,
        status: w.isActive ? 'ACTIVE' : 'INACTIVE',
      });
    }
    this.autoFitColumns(whSheet);

    // 6. Projects
    const projectsSheet = workbook.addWorksheet('Projects');
    projectsSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Project Name', key: 'name' },
      { header: 'Site Code', key: 'siteCode' },
      { header: 'Client', key: 'clientName' },
      { header: 'Location', key: 'location' },
      { header: 'Reference Number', key: 'referenceNumber' },
      { header: 'Status', key: 'status' },
      { header: 'Created Date', key: 'createdAt' },
    ];
    this.styleHeaderRow(projectsSheet.getRow(1));

    const projects = await this.prisma.project.findMany({
      include: { client: true },
      orderBy: { id: 'asc' },
    });
    for (const p of projects) {
      projectsSheet.addRow({
        id: p.id,
        name: p.name,
        siteCode: p.siteCode || '—',
        clientName: p.client?.name || '—',
        location: p.location || '—',
        referenceNumber: p.referenceNumber || '—',
        status: p.status,
        createdAt: this.formatDate(p.createdAt),
      });
    }
    this.autoFitColumns(projectsSheet);

    // 7. Incoming / Returns
    const incomingSheet = workbook.addWorksheet('Incoming');
    incomingSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'movementNumber' },
      { header: 'Type', key: 'type' },
      { header: 'Warehouse', key: 'warehouse' },
      { header: 'Source Project', key: 'project' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Reference No', key: 'referenceNumber' },
      { header: 'Created By', key: 'createdBy' },
      { header: 'Notes', key: 'notes' },
    ];
    this.styleHeaderRow(incomingSheet.getRow(1));

    const incomingMovements = await this.prisma.stockMovement.findMany({
      where: { movementType: { in: ['INCOMING', 'RETURN'] } },
      include: {
        destinationWarehouse: true,
        project: true,
        createdBy: true,
        items: {
          include: {
            item: { include: { unit: true } },
            movementSerials: { include: { itemSerial: true } },
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    });
    for (const m of incomingMovements) {
      for (const it of m.items) {
        const snList = it.movementSerials.map((s) => s.itemSerial?.serialNumber).filter(Boolean).join(', ');
        incomingSheet.addRow({
          date: this.formatDate(m.movementDate),
          movementNumber: m.movementNumber,
          type: m.movementType,
          warehouse: m.destinationWarehouse?.name || '—',
          project: m.project?.name || '—',
          itemName: it.item?.name || '—',
          serialNumber: snList || '—',
          quantity: it.quantity,
          unit: it.item?.unit?.symbol || 'pcs',
          referenceNumber: m.referenceNumber || '—',
          createdBy: m.createdBy?.name || '—',
          notes: m.notes || '—',
        });
      }
    }
    this.autoFitColumns(incomingSheet);

    // 8. Outgoing
    const outgoingSheet = workbook.addWorksheet('Outgoing');
    outgoingSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'movementNumber' },
      { header: 'DO Number', key: 'doNumber' },
      { header: 'Source Warehouse', key: 'warehouse' },
      { header: 'Destination Project', key: 'project' },
      { header: 'Client Company', key: 'client' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Created By', key: 'createdBy' },
      { header: 'Notes / Remarks', key: 'notes' },
    ];
    this.styleHeaderRow(outgoingSheet.getRow(1));

    const outgoingMovements = await this.prisma.stockMovement.findMany({
      where: { movementType: 'OUTGOING' },
      include: {
        sourceWarehouse: true,
        project: { include: { client: true } },
        createdBy: true,
        deliveryOrder: true,
        items: {
          include: {
            item: { include: { unit: true } },
            movementSerials: { include: { itemSerial: true } },
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    });
    for (const m of outgoingMovements) {
      for (const it of m.items) {
        const snList = it.movementSerials.map((s) => s.itemSerial?.serialNumber).filter(Boolean).join(', ');
        outgoingSheet.addRow({
          date: this.formatDate(m.movementDate),
          movementNumber: m.movementNumber,
          doNumber: m.deliveryOrder?.doNumber || m.referenceNumber || '—',
          warehouse: m.sourceWarehouse?.name || '—',
          project: m.project?.name || '—',
          client: m.project?.client?.name || '—',
          itemName: it.item?.name || '—',
          serialNumber: snList || '—',
          quantity: it.quantity,
          unit: it.item?.unit?.symbol || 'pcs',
          createdBy: m.createdBy?.name || '—',
          notes: m.notes || '—',
        });
      }
    }
    this.autoFitColumns(outgoingSheet);

    // 9. Movement History (All)
    const historySheet = workbook.addWorksheet('Movement History');
    historySheet.columns = [
      { header: 'Movement ID', key: 'id' },
      { header: 'Movement No', key: 'movementNumber' },
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement Type', key: 'type' },
      { header: 'Source Warehouse', key: 'sourceWarehouse' },
      { header: 'Destination Warehouse', key: 'destWarehouse' },
      { header: 'Project', key: 'project' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Reference', key: 'referenceNumber' },
      { header: 'Created By', key: 'createdBy' },
      { header: 'Notes', key: 'notes' },
    ];
    this.styleHeaderRow(historySheet.getRow(1));

    const allMovements = await this.prisma.stockMovement.findMany({
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        project: true,
        createdBy: true,
        items: {
          include: {
            item: { include: { unit: true } },
            movementSerials: { include: { itemSerial: true } },
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    });
    for (const m of allMovements) {
      for (const it of m.items) {
        const snList = it.movementSerials.map((s) => s.itemSerial?.serialNumber).filter(Boolean).join(', ');
        historySheet.addRow({
          id: m.id,
          movementNumber: m.movementNumber,
          date: this.formatDate(m.movementDate),
          type: m.movementType,
          sourceWarehouse: m.sourceWarehouse?.name || '—',
          destWarehouse: m.destinationWarehouse?.name || '—',
          project: m.project?.name || '—',
          itemName: it.item?.name || '—',
          serialNumber: snList || '—',
          quantity: it.quantity,
          unit: it.item?.unit?.symbol || 'pcs',
          referenceNumber: m.referenceNumber || '—',
          createdBy: m.createdBy?.name || '—',
          notes: m.notes || '—',
        });
      }
    }
    this.autoFitColumns(historySheet);

    // 10. Delivery Orders
    const doSheet = workbook.addWorksheet('Delivery Orders');
    doSheet.columns = [
      { header: 'DO ID', key: 'id' },
      { header: 'DO Number', key: 'doNumber' },
      { header: 'Status', key: 'status' },
      { header: 'DO Date', key: 'date' },
      { header: 'Client Company', key: 'client' },
      { header: 'Attn', key: 'attn' },
      { header: 'Project', key: 'project' },
      { header: 'Site Code', key: 'siteCode' },
      { header: 'Reference No', key: 'referenceNumber' },
      { header: 'Activity', key: 'activity' },
      { header: 'Source Warehouse', key: 'warehouse' },
      { header: 'Prepared By', key: 'createdBy' },
      { header: 'Issued At', key: 'issuedAt' },
      { header: 'Notes', key: 'notes' },
    ];
    this.styleHeaderRow(doSheet.getRow(1));

    const dos = await this.prisma.deliveryOrder.findMany({
      include: {
        client: true,
        project: true,
        sourceWarehouse: true,
        createdBy: true,
      },
      orderBy: { id: 'desc' },
    });
    for (const d of dos) {
      const snap: any = d.snapshots || {};
      doSheet.addRow({
        id: d.id,
        doNumber: d.doNumber || `Draft #${d.id}`,
        status: d.status,
        date: this.formatDate(d.date),
        client: d.clientCompanyName || snap.client?.name || d.client?.name || '—',
        attn: d.attnName || snap.attn?.name || '—',
        project: d.projectName || snap.project?.name || d.project?.name || '—',
        siteCode: d.siteCode || snap.project?.siteCode || d.project?.siteCode || '—',
        referenceNumber: d.referenceNumber || snap.project?.referenceNumber || d.project?.referenceNumber || '—',
        activity: d.activity || 'General Dispatch',
        warehouse: d.warehouseName || snap.warehouse?.name || d.sourceWarehouse?.name || '—',
        createdBy: d.createdBy?.name || 'Pungki Surjanti',
        issuedAt: d.issuedAt ? this.formatDateTime(d.issuedAt) : '—',
        notes: d.notes || '—',
      });
    }
    this.autoFitColumns(doSheet);

    // 11. Delivery Order Items
    const doItemsSheet = workbook.addWorksheet('Delivery Order Items');
    doItemsSheet.columns = [
      { header: 'DO Number', key: 'doNumber' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Brand', key: 'brand' },
      { header: 'Model Number', key: 'modelNumber' },
      { header: 'Serial Numbers', key: 'serials' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'PIC', key: 'pic' },
      { header: 'Remarks', key: 'remarks' },
    ];
    this.styleHeaderRow(doItemsSheet.getRow(1));

    const doItems = await this.prisma.deliveryOrderItem.findMany({
      include: {
        deliveryOrder: true,
        item: { include: { unit: true } },
        itemSerials: true,
      },
      orderBy: { id: 'asc' },
    });
    for (const di of doItems) {
      const snList = di.itemSerials.map((s) => s.serialNumber).filter(Boolean).join(', ');
      doItemsSheet.addRow({
        doNumber: di.deliveryOrder?.doNumber || `Draft #${di.deliveryOrderId}`,
        itemName: di.itemName || di.item?.name || '—',
        brand: di.brand || di.item?.brand || '—',
        modelNumber: di.modelNumber || di.item?.modelNumber || '—',
        serials: snList || '—',
        quantity: di.quantity,
        unit: di.unitSymbol || di.item?.unit?.symbol || 'pcs',
        pic: di.pic || '—',
        remarks: di.remarks || '—',
      });
    }
    this.autoFitColumns(doItemsSheet);

    // 12. Shipping Labels
    const labelsSheet = workbook.addWorksheet('Shipping Labels');
    labelsSheet.columns = [
      { header: 'Label ID', key: 'id' },
      { header: 'Linked DO Number', key: 'doNumber' },
      { header: 'Ship Date', key: 'shipDate' },
      { header: 'Sender Office', key: 'senderName' },
      { header: 'Sender Address', key: 'senderAddress' },
      { header: 'Sender Phone', key: 'senderPhone' },
      { header: 'Recipient Company', key: 'recipientName' },
      { header: 'Attn', key: 'attnName' },
      { header: 'Destination / Site', key: 'destination' },
      { header: 'Reference No', key: 'referenceNumber' },
      { header: 'Fragile?', key: 'isFragile' },
      { header: 'Handling Note', key: 'handlingNote' },
      { header: 'Created Date', key: 'createdAt' },
    ];
    this.styleHeaderRow(labelsSheet.getRow(1));

    const labels = await this.prisma.shippingLabel.findMany({
      orderBy: { id: 'desc' },
    });
    for (const l of labels) {
      labelsSheet.addRow({
        id: l.id,
        doNumber: l.doNumber || '—',
        shipDate: this.formatDate(l.shipDate),
        senderName: l.senderName || 'PT ALSSA Corporindo',
        senderAddress: l.senderAddress || '—',
        senderPhone: l.senderPhone || '—',
        recipientName: l.recipientName,
        attnName: l.attnName || '—',
        destination: l.destination,
        referenceNumber: l.referenceNumber || '—',
        isFragile: l.isFragile ? 'YES' : 'NO',
        handlingNote: l.handlingNote || '—',
        createdAt: this.formatDate(l.createdAt),
      });
    }
    this.autoFitColumns(labelsSheet);

    // 13. Activity Logs (Sanitized audit logs)
    const logsSheet = workbook.addWorksheet('Activity Logs');
    logsSheet.columns = [
      { header: 'Log ID', key: 'id' },
      { header: 'Timestamp', key: 'timestamp' },
      { header: 'User', key: 'user' },
      { header: 'Action', key: 'action' },
      { header: 'Entity / Module', key: 'entity' },
      { header: 'Entity ID', key: 'entityId' },
      { header: 'Details / Summary', key: 'details' },
    ];
    this.styleHeaderRow(logsSheet.getRow(1));

    const logs = await this.prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    for (const lg of logs) {
      let detailsSummary = '—';
      if (lg.payload) {
        try {
          const det: any =
            typeof lg.payload === 'string'
              ? JSON.parse(lg.payload)
              : typeof lg.payload === 'object' && lg.payload !== null
              ? { ...(lg.payload as Record<string, any>) }
              : { value: lg.payload };
          // Filter out sensitive keys
          delete det.password;
          delete det.passwordHash;
          delete det.token;
          delete det.secret;
          detailsSummary = JSON.stringify(det);
        } catch {
          detailsSummary = String(lg.payload);
        }
      }

      logsSheet.addRow({
        id: lg.id,
        timestamp: this.formatDateTime(lg.createdAt),
        user: lg.user?.name || lg.user?.email || 'System',
        action: lg.action,
        entity: lg.entityName,
        entityId: lg.entityId || '—',
        details: detailsSummary,
      });
    }
    this.autoFitColumns(logsSheet);

    return workbook;
  }

  async generateMonthlyReport(month: number, year: number, generatedBy = 'Roberta Pungki'): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = generatedBy;
    workbook.lastModifiedBy = generatedBy;
    workbook.created = new Date();
    workbook.modified = new Date();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch movements for the period
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        movementDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        project: { include: { client: true, clientContact: true } },
        deliveryOrder: true,
        createdBy: true,
        items: {
          include: {
            item: { include: { unit: true } },
            movementSerials: { include: { itemSerial: true } },
          },
        },
      },
      orderBy: { movementDate: 'asc' },
    });

    const incomingMovements = movements.filter((m) => m.movementType === 'INCOMING');
    const returnMovements = movements.filter((m) => m.movementType === 'RETURN');
    const outgoingMovements = movements.filter((m) => m.movementType === 'OUTGOING');
    const adjustmentMovements = movements.filter((m) => m.movementType === 'ADJUSTMENT');

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric Category', key: 'metric', width: 35 },
      { header: 'Value / Count', key: 'value', width: 25 },
      { header: 'Notes / Remarks', key: 'notes', width: 40 },
    ];
    this.styleHeaderRow(summarySheet.getRow(1));

    summarySheet.addRow({ metric: 'Report', value: 'AWMS Monthly Report', notes: '' });
    summarySheet.addRow({ metric: 'Period', value: monthLabel, notes: `From ${this.formatDate(startDate)} to ${this.formatDate(endDate)}` });
    summarySheet.addRow({ metric: 'Generated At', value: `${this.formatDateTime(new Date())} WITA`, notes: '' });
    summarySheet.addRow({ metric: 'Generated By', value: generatedBy, notes: '' });
    summarySheet.addRow({ metric: '----------------------------------------', value: '--------------------', notes: '----------------------------------------' });
    summarySheet.addRow({ metric: 'Total Stock Movements', value: movements.length, notes: 'All registered transactions in period' });
    summarySheet.addRow({ metric: 'Incoming Transactions (Supplier / Master)', value: incomingMovements.length, notes: 'Direct warehouse stock receipts' });
    summarySheet.addRow({ metric: 'Project Return Transactions', value: returnMovements.length, notes: 'Returned assets from client project sites' });
    summarySheet.addRow({ metric: 'Outgoing Dispatches', value: outgoingMovements.length, notes: 'Site deliveries & project allocations' });
    summarySheet.addRow({ metric: 'Physical Stock Adjustments', value: adjustmentMovements.length, notes: 'Opname / condition updates' });

    // Quantities calculation
    let bulkQtyIn = 0;
    let bulkQtyOut = 0;
    let serialUnitsIn = 0;
    let serialUnitsOut = 0;
    let serialUnitsReturned = 0;

    for (const m of incomingMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'BULK') bulkQtyIn += mi.quantity;
        else serialUnitsIn += mi.quantity;
      }
    }

    for (const m of returnMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'SERIALIZED') serialUnitsReturned += mi.quantity;
      }
    }

    for (const m of outgoingMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'BULK') bulkQtyOut += mi.quantity;
        else serialUnitsOut += mi.quantity;
      }
    }

    summarySheet.addRow({ metric: 'Bulk Quantity Received In', value: bulkQtyIn, notes: 'Total units (various UoMs)' });
    summarySheet.addRow({ metric: 'Bulk Quantity Dispatched Out', value: bulkQtyOut, notes: 'Total units (various UoMs)' });
    summarySheet.addRow({ metric: 'Serialized Units Received In', value: serialUnitsIn, notes: 'Devices with unique SN' });
    summarySheet.addRow({ metric: 'Serialized Units Dispatched Out', value: serialUnitsOut, notes: 'Devices deployed to project sites' });
    summarySheet.addRow({ metric: 'Serialized Units Returned', value: serialUnitsReturned, notes: 'Devices returned to warehouse' });

    // Serial conditions
    const [standbyGoodCount, underRepairCount] = await Promise.all([
      this.prisma.itemSerial.count({ where: { state: 'STANDBY_GOOD' } }),
      this.prisma.itemSerial.count({ where: { state: 'UNDER_REPAIR' } }),
    ]);

    summarySheet.addRow({ metric: 'Current Standby Good Devices', value: standbyGoodCount, notes: 'Ready for site deployment' });
    summarySheet.addRow({ metric: 'Current Under Repair Devices', value: underRepairCount, notes: 'Faulty / in maintenance' });

    this.autoFitColumns(summarySheet);

    // 2. Incoming Sheet
    const incSheet = workbook.addWorksheet('Incoming');
    incSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'number' },
      { header: 'Type', key: 'type' },
      { header: 'Destination Warehouse', key: 'warehouse' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Material Type', key: 'materialType' },
      { header: 'Brand', key: 'brand' },
      { header: 'Model Number', key: 'modelNumber' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Condition', key: 'condition' },
      { header: 'Reference', key: 'reference' },
      { header: 'Created By', key: 'createdBy' },
      { header: 'Notes', key: 'notes' },
    ];
    this.styleHeaderRow(incSheet.getRow(1));

    for (const m of incomingMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'SERIALIZED' && mi.movementSerials.length > 0) {
          for (const ms of mi.movementSerials) {
            incSheet.addRow({
              date: this.formatDate(m.movementDate),
              number: m.movementNumber,
              type: 'INCOMING',
              warehouse: m.destinationWarehouse?.name || '—',
              itemName: mi.item.name,
              materialType: mi.item.materialType || 'MAIN_MATERIAL',
              brand: mi.item.brand || '—',
              modelNumber: mi.item.modelNumber || '—',
              serialNumber: ms.itemSerial?.serialNumber || '—',
              quantity: 1,
              unit: mi.item.unit?.symbol || 'pcs',
              condition: ms.itemSerial?.conditionLabel || 'Good',
              reference: m.referenceNumber || '—',
              createdBy: m.createdBy?.name || 'System',
              notes: m.notes || '—',
            });
          }
        } else {
          incSheet.addRow({
            date: this.formatDate(m.movementDate),
            number: m.movementNumber,
            type: 'INCOMING',
            warehouse: m.destinationWarehouse?.name || '—',
            itemName: mi.item.name,
            materialType: mi.item.materialType || 'MAIN_MATERIAL',
            brand: mi.item.brand || '—',
            modelNumber: mi.item.modelNumber || '—',
            serialNumber: '—',
            quantity: mi.quantity,
            unit: mi.item.unit?.symbol || 'pcs',
            condition: 'Good',
            reference: m.referenceNumber || '—',
            createdBy: m.createdBy?.name || 'System',
            notes: m.notes || '—',
          });
        }
      }
    }
    this.autoFitColumns(incSheet);

    // 3. Returns Sheet
    const retSheet = workbook.addWorksheet('Returns');
    retSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'number' },
      { header: 'Origin Project / Site', key: 'project' },
      { header: 'Client', key: 'client' },
      { header: 'Destination Warehouse', key: 'warehouse' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Material Type', key: 'materialType' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Returned Condition', key: 'condition' },
      { header: 'Reference', key: 'reference' },
      { header: 'Created By', key: 'createdBy' },
      { header: 'Notes', key: 'notes' },
    ];
    this.styleHeaderRow(retSheet.getRow(1));

    for (const m of returnMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'SERIALIZED' && mi.movementSerials.length > 0) {
          for (const ms of mi.movementSerials) {
            retSheet.addRow({
              date: this.formatDate(m.movementDate),
              number: m.movementNumber,
              project: m.project?.name || '—',
              client: m.project?.client?.name || '—',
              warehouse: m.destinationWarehouse?.name || '—',
              itemName: mi.item.name,
              materialType: mi.item.materialType || 'MAIN_MATERIAL',
              serialNumber: ms.itemSerial?.serialNumber || '—',
              quantity: 1,
              unit: mi.item.unit?.symbol || 'pcs',
              condition: ms.itemSerial?.conditionLabel || 'Good',
              reference: m.referenceNumber || '—',
              createdBy: m.createdBy?.name || 'System',
              notes: m.notes || '—',
            });
          }
        } else {
          retSheet.addRow({
            date: this.formatDate(m.movementDate),
            number: m.movementNumber,
            project: m.project?.name || '—',
            client: m.project?.client?.name || '—',
            warehouse: m.destinationWarehouse?.name || '—',
            itemName: mi.item.name,
            materialType: mi.item.materialType || 'MAIN_MATERIAL',
            serialNumber: '—',
            quantity: mi.quantity,
            unit: mi.item.unit?.symbol || 'pcs',
            condition: 'Good',
            reference: m.referenceNumber || '—',
            createdBy: m.createdBy?.name || 'System',
            notes: m.notes || '—',
          });
        }
      }
    }
    this.autoFitColumns(retSheet);

    // 4. Outgoing Sheet
    const outSheet = workbook.addWorksheet('Outgoing');
    outSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'number' },
      { header: 'DO Number', key: 'doNumber' },
      { header: 'Source Warehouse', key: 'warehouse' },
      { header: 'Destination Project', key: 'project' },
      { header: 'Client', key: 'client' },
      { header: 'PIC / Attn', key: 'pic' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Material Type', key: 'materialType' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Purpose', key: 'purpose' },
      { header: 'Created By', key: 'createdBy' },
    ];
    this.styleHeaderRow(outSheet.getRow(1));

    for (const m of outgoingMovements) {
      for (const mi of m.items) {
        if (mi.item.trackingType === 'SERIALIZED' && mi.movementSerials.length > 0) {
          for (const ms of mi.movementSerials) {
            outSheet.addRow({
              date: this.formatDate(m.movementDate),
              number: m.movementNumber,
              doNumber: m.deliveryOrder?.doNumber || 'Manual Outgoing',
              warehouse: m.sourceWarehouse?.name || '—',
              project: m.project?.name || '—',
              client: m.project?.client?.name || '—',
              pic: m.project?.clientContact?.name || '—',
              itemName: mi.item.name,
              materialType: mi.item.materialType || 'MAIN_MATERIAL',
              serialNumber: ms.itemSerial?.serialNumber || '—',
              quantity: 1,
              unit: mi.item.unit?.symbol || 'pcs',
              purpose: m.notes || 'Deployment for site installation',
              createdBy: m.createdBy?.name || 'System',
            });
          }
        } else {
          outSheet.addRow({
            date: this.formatDate(m.movementDate),
            number: m.movementNumber,
            doNumber: m.deliveryOrder?.doNumber || 'Manual Outgoing',
            warehouse: m.sourceWarehouse?.name || '—',
            project: m.project?.name || '—',
            client: m.project?.client?.name || '—',
            pic: m.project?.clientContact?.name || '—',
            itemName: mi.item.name,
            materialType: mi.item.materialType || 'MAIN_MATERIAL',
            serialNumber: '—',
            quantity: mi.quantity,
            unit: mi.item.unit?.symbol || 'pcs',
            purpose: m.notes || 'Deployment for site installation',
            createdBy: m.createdBy?.name || 'System',
          });
        }
      }
    }
    this.autoFitColumns(outSheet);

    // 5. Adjustments Sheet
    const adjSheet = workbook.addWorksheet('Adjustments');
    adjSheet.columns = [
      { header: 'Movement Date', key: 'date' },
      { header: 'Movement No', key: 'number' },
      { header: 'Warehouse Location', key: 'warehouse' },
      { header: 'Item Name', key: 'itemName' },
      { header: 'Material Type', key: 'materialType' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Adjusted Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Purpose / Reason', key: 'purpose' },
      { header: 'Created By', key: 'createdBy' },
    ];
    this.styleHeaderRow(adjSheet.getRow(1));

    for (const m of adjustmentMovements) {
      for (const mi of m.items) {
        adjSheet.addRow({
          date: this.formatDate(m.movementDate),
          number: m.movementNumber,
          warehouse: m.destinationWarehouse?.name || m.sourceWarehouse?.name || '—',
          itemName: mi.item.name,
          materialType: mi.item.materialType || 'MAIN_MATERIAL',
          serialNumber: mi.movementSerials[0]?.itemSerial?.serialNumber || '—',
          quantity: mi.quantity,
          unit: mi.item.unit?.symbol || 'pcs',
          purpose: m.notes || 'Physical inventory reconciliation',
          createdBy: m.createdBy?.name || 'System',
        });
      }
    }
    this.autoFitColumns(adjSheet);

    // 6. Current Stock Position Sheet
    const posSheet = workbook.addWorksheet('Current Stock Position');
    posSheet.columns = [
      { header: 'Item Name', key: 'itemName' },
      { header: 'Material Type', key: 'materialType' },
      { header: 'Brand', key: 'brand' },
      { header: 'Model Number', key: 'modelNumber' },
      { header: 'Tracking Type', key: 'trackingType' },
      { header: 'Current Location', key: 'location' },
      { header: 'Serial Number', key: 'serialNumber' },
      { header: 'Quantity on Hand', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Condition', key: 'condition' },
      { header: 'Status', key: 'status' },
    ];
    this.styleHeaderRow(posSheet.getRow(1));

    // Serialized stock
    const currentSerials = await this.prisma.itemSerial.findMany({
      include: {
        item: { include: { unit: true } },
        currentWarehouse: true,
        currentProject: true,
      },
      orderBy: [{ itemId: 'asc' }, { serialNumber: 'asc' }],
    });

    for (const s of currentSerials) {
      posSheet.addRow({
        itemName: s.item?.name || '—',
        materialType: s.item?.materialType || 'MAIN_MATERIAL',
        brand: s.item?.brand || '—',
        modelNumber: s.item?.modelNumber || '—',
        trackingType: 'SERIALIZED',
        location: s.currentProject ? `Project: ${s.currentProject.name}` : (s.currentWarehouse?.name || '—'),
        serialNumber: s.serialNumber,
        quantity: 1,
        unit: s.item?.unit?.symbol || 'pcs',
        condition: s.conditionLabel || s.state,
        status: s.currentProjectId ? 'DEPLOY' : (s.state || 'STANDBY_GOOD'),
      });
    }

    // Bulk stock
    const currentBulk = await this.prisma.warehouseStock.findMany({
      where: { quantity: { gt: 0 } },
      include: {
        item: { include: { unit: true } },
        warehouse: true,
      },
      orderBy: [{ itemId: 'asc' }],
    });

    for (const b of currentBulk) {
      posSheet.addRow({
        itemName: b.item.name,
        materialType: b.item.materialType || 'MAIN_MATERIAL',
        brand: b.item.brand || '—',
        modelNumber: b.item.modelNumber || '—',
        trackingType: 'BULK',
        location: b.warehouse?.name || '—',
        serialNumber: '—',
        quantity: b.quantity,
        unit: b.item.unit?.symbol || 'pcs',
        condition: 'Good',
        status: 'AVAILABLE',
      });
    }
    this.autoFitColumns(posSheet);

    return workbook;
  }
}
