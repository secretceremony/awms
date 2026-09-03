import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { StockMovementsService } from '../stock-movements/stock-movements.service.js';
import {
  TrackingType,
  MaterialType,
  MovementType,
  ProjectStatus,
} from '../../generated/prisma/client.js';
import ExcelJS from 'exceljs';

export interface ValidatedRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'WARNING';
  errors: string[];
  warnings: string[];
  data: Record<string, any>;
}

export interface ValidationSummary {
  importType: string;
  filename: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  rows: ValidatedRow[];
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  private styleTemplateHeader(row: ExcelJS.Row) {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2250A1' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.height = 24;
  }

  private autoFitColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.columns.forEach((column) => {
      let maxLength = 14;
      if (column.header) {
        maxLength = Math.max(maxLength, column.header.toString().length + 4);
      }
      column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value !== null && cell.value !== undefined) {
          const valStr = cell.value.toString();
          maxLength = Math.max(maxLength, Math.min(valStr.length + 3, 40));
        }
      });
      column.width = maxLength;
    });
  }

  async generateTemplate(type: 'initial-stock' | 'incoming' | 'outgoing'): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT ALSSA Corporindo (AWMS)';

    if (type === 'initial-stock') {
      const sheet = workbook.addWorksheet('Initial Stock Template');
      sheet.columns = [
        { header: 'Movement Date (YYYY-MM-DD)', key: 'movementDate' },
        { header: 'Warehouse Hub', key: 'warehouse' },
        { header: 'Item Name', key: 'itemName' },
        { header: 'Material Type (Main Material/Consumable/Tools/HSE Material)', key: 'materialType' },
        { header: 'Brand', key: 'brand' },
        { header: 'Model Number', key: 'modelNumber' },
        { header: 'Tracking Type (Bulk/Serialized)', key: 'trackingType' },
        { header: 'Serial Number (Required for Serialized)', key: 'serialNumber' },
        { header: 'Quantity (1 for Serialized)', key: 'quantity' },
        { header: 'Unit (pcs/set/roll/m)', key: 'unit' },
        { header: 'Condition (Standby Good/Standby Bad/Under Repair)', key: 'condition' },
        { header: 'Notes', key: 'notes' },
      ];
      this.styleTemplateHeader(sheet.getRow(1));

      // Add sample rows
      sheet.addRow({
        movementDate: '2026-09-01',
        warehouse: 'ALSSA Branch Balikpapan',
        itemName: 'Cat6 UTP Cable 305m',
        materialType: 'Consumable',
        brand: 'Belden',
        modelNumber: '7814A',
        trackingType: 'Bulk',
        serialNumber: '',
        quantity: 20,
        unit: 'roll',
        condition: 'Standby Good',
        notes: 'Warehouse initial inventory migration',
      });
      sheet.addRow({
        movementDate: '2026-09-01',
        warehouse: 'ALSSA Branch Balikpapan',
        itemName: 'Enterprise Router 5000',
        materialType: 'Main Material',
        brand: 'Cisco',
        modelNumber: 'ISR-5000',
        trackingType: 'Serialized',
        serialNumber: 'SN-RTR-001',
        quantity: 1,
        unit: 'set',
        condition: 'Standby Good',
        notes: 'Warehouse router asset migration',
      });
      sheet.addRow({
        movementDate: '2026-09-01',
        warehouse: 'ALSSA Head Office Jakarta',
        itemName: 'Safety Helmet White',
        materialType: 'HSE Material',
        brand: 'MSA',
        modelNumber: 'V-Gard',
        trackingType: 'Bulk',
        serialNumber: '',
        quantity: 50,
        unit: 'pcs',
        condition: 'Standby Good',
        notes: 'HSE PPE Initial stock',
      });

      this.autoFitColumns(sheet);
    } else if (type === 'incoming') {
      const sheet = workbook.addWorksheet('Incoming Template');
      sheet.columns = [
        { header: 'Movement Date (YYYY-MM-DD)', key: 'movementDate' },
        { header: 'Destination Warehouse', key: 'warehouse' },
        { header: 'Item Name', key: 'itemName' },
        { header: 'Serial Number (For Serialized)', key: 'serialNumber' },
        { header: 'Quantity (1 for Serialized)', key: 'quantity' },
        { header: 'Unit (pcs/set/roll/m)', key: 'unit' },
        { header: 'Condition (Standby Good/Standby Bad/Under Repair)', key: 'condition' },
        { header: 'Reference (PO / DO Number)', key: 'reference' },
        { header: 'Notes', key: 'notes' },
      ];
      this.styleTemplateHeader(sheet.getRow(1));

      sheet.addRow({
        movementDate: '2026-09-04',
        warehouse: 'ALSSA Branch Balikpapan',
        itemName: 'Cat6 UTP Cable 305m',
        serialNumber: '',
        quantity: 10,
        unit: 'roll',
        condition: 'Standby Good',
        reference: 'PO-2026-089',
        notes: 'Restock from supplier',
      });
      sheet.addRow({
        movementDate: '2026-09-04',
        warehouse: 'ALSSA Branch Balikpapan',
        itemName: 'Enterprise Router 5000',
        serialNumber: 'SN-RTR-002',
        quantity: 1,
        unit: 'set',
        condition: 'Standby Good',
        reference: 'PO-2026-090',
        notes: 'New router asset receipt',
      });

      this.autoFitColumns(sheet);
    } else if (type === 'outgoing') {
      const sheet = workbook.addWorksheet('Outgoing Template');
      sheet.columns = [
        { header: 'Movement Date (YYYY-MM-DD)', key: 'movementDate' },
        { header: 'Source Warehouse', key: 'sourceWarehouse' },
        { header: 'Project (Name or Site Code)', key: 'project' },
        { header: 'Item Name', key: 'itemName' },
        { header: 'Serial Number (Required for Serialized)', key: 'serialNumber' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Purpose', key: 'purpose' },
      ];
      this.styleTemplateHeader(sheet.getRow(1));

      sheet.addRow({
        movementDate: '2026-09-04',
        sourceWarehouse: 'ALSSA Branch Balikpapan',
        project: 'Offshore Rig Alpha',
        itemName: 'Cat6 UTP Cable 305m',
        serialNumber: '',
        quantity: 2,
        purpose: 'Network cabling installation for Rig control room',
      });
      sheet.addRow({
        movementDate: '2026-09-04',
        sourceWarehouse: 'ALSSA Branch Balikpapan',
        project: 'Offshore Rig Alpha',
        itemName: 'Enterprise Router 5000',
        serialNumber: 'SN-RTR-001',
        quantity: 1,
        purpose: 'Primary gateway deployment at Rig Alpha site',
      });

      this.autoFitColumns(sheet);
    }

    return workbook;
  }

  async validateImportFile(
    fileBuffer: Buffer,
    importType: 'INITIAL_STOCK' | 'INCOMING' | 'OUTGOING',
    filename: string,
  ): Promise<ValidationSummary> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch {
      throw new BadRequestException('Failed to parse uploaded Excel file. Please ensure it is a valid .xlsx workbook.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Uploaded workbook is empty.');
    }

    // Pre-load reference maps
    const [warehouses, projects, units, items, existingSerials] = await Promise.all([
      this.prisma.warehouse.findMany({ select: { id: true, name: true, cityCode: true, isActive: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true, siteCode: true, status: true } }),
      this.prisma.unit.findMany({ select: { id: true, name: true, symbol: true } }),
      this.prisma.item.findMany({
        include: {
          unit: true,
          warehouseStocks: true,
        },
      }),
      this.prisma.itemSerial.findMany({
        select: { id: true, serialNumber: true, itemId: true, state: true, currentWarehouseId: true, currentProjectId: true },
      }),
    ]);

    const validatedRows: ValidatedRow[] = [];
    const seenSerialsInBatch = new Set<string>();

    const rowsCount = worksheet.rowCount;
    if (rowsCount < 2) {
      throw new BadRequestException('The uploaded sheet contains no data rows.');
    }

    for (let r = 2; r <= rowsCount; r++) {
      const row = worksheet.getRow(r);
      const values = row.values as any[];
      if (!values || values.length <= 1) continue;

      const errors: string[] = [];
      const warnings: string[] = [];
      const rowData: Record<string, any> = {};

      if (importType === 'INITIAL_STOCK') {
        const movementDateRaw = row.getCell(1).text?.trim();
        const whRaw = row.getCell(2).text?.trim();
        const itemNameRaw = row.getCell(3).text?.trim();
        const matTypeRaw = row.getCell(4).text?.trim();
        const brandRaw = row.getCell(5).text?.trim();
        const modelNumberRaw = row.getCell(6).text?.trim();
        const trackingTypeRaw = row.getCell(7).text?.trim()?.toUpperCase();
        const snRaw = row.getCell(8).text?.trim();
        const qtyRaw = parseFloat(row.getCell(9).text?.trim() || '0');
        const unitRaw = row.getCell(10).text?.trim()?.toLowerCase();
        const conditionRaw = row.getCell(11).text?.trim();
        const notesRaw = row.getCell(12).text?.trim();

        rowData.movementDate = movementDateRaw || new Date().toISOString().split('T')[0];
        rowData.warehouseName = whRaw;
        rowData.itemName = itemNameRaw;
        rowData.materialType = matTypeRaw || 'Main Material';
        rowData.brand = brandRaw;
        rowData.modelNumber = modelNumberRaw;
        rowData.trackingType = trackingTypeRaw || 'BULK';
        rowData.serialNumber = snRaw;
        rowData.quantity = qtyRaw;
        rowData.unit = unitRaw;
        rowData.condition = conditionRaw || 'Standby Good';
        rowData.notes = notesRaw;

        // Validation
        if (!itemNameRaw) errors.push('Item Name is required');
        if (!whRaw) errors.push('Warehouse Hub is required');

        const matchedWh = warehouses.find(
          (w) => w.name.toLowerCase() === (whRaw || '').toLowerCase() || (w.cityCode && w.cityCode.toLowerCase() === (whRaw || '').toLowerCase()),
        );
        if (!matchedWh) {
          errors.push(`Unknown Warehouse '${whRaw}'`);
        } else if (!matchedWh.isActive) {
          errors.push(`Warehouse '${matchedWh.name}' is inactive`);
        } else {
          rowData.warehouseId = matchedWh.id;
        }

        const isSerialized = trackingTypeRaw === 'SERIALIZED' || !!snRaw;
        rowData.trackingType = isSerialized ? 'SERIALIZED' : 'BULK';

        if (isSerialized) {
          if (!snRaw) {
            errors.push('Serial Number is required for serialized items');
          } else {
            if (seenSerialsInBatch.has(snRaw.toLowerCase())) {
              errors.push(`Duplicate Serial Number '${snRaw}' within this import file`);
            } else {
              seenSerialsInBatch.add(snRaw.toLowerCase());
            }

            const existing = existingSerials.find((s) => s.serialNumber.toLowerCase() === snRaw.toLowerCase());
            if (existing) {
              errors.push(`Serial Number '${snRaw}' already exists in the system`);
            }
          }
          rowData.quantity = 1;
        } else {
          if (qtyRaw <= 0) {
            errors.push('Quantity must be greater than 0 for bulk items');
          }
        }

        // Material type normalization
        let matEnum: MaterialType = MaterialType.MAIN_MATERIAL;
        const matLower = (matTypeRaw || '').toLowerCase();
        if (matLower.includes('consumable')) matEnum = MaterialType.CONSUMABLE;
        else if (matLower.includes('tool')) matEnum = MaterialType.TOOLS;
        else if (matLower.includes('hse') || matLower.includes('safety') || matLower.includes('ppe')) matEnum = MaterialType.HSE_MATERIAL;
        rowData.materialTypeEnum = matEnum;

      } else if (importType === 'INCOMING') {
        const movementDateRaw = row.getCell(1).text?.trim();
        const whRaw = row.getCell(2).text?.trim();
        const itemNameRaw = row.getCell(3).text?.trim();
        const snRaw = row.getCell(4).text?.trim();
        const qtyRaw = parseFloat(row.getCell(5).text?.trim() || '0');
        const unitRaw = row.getCell(6).text?.trim();
        const conditionRaw = row.getCell(7).text?.trim();
        const refRaw = row.getCell(8).text?.trim();
        const notesRaw = row.getCell(9).text?.trim();

        rowData.movementDate = movementDateRaw || new Date().toISOString().split('T')[0];
        rowData.warehouseName = whRaw;
        rowData.itemName = itemNameRaw;
        rowData.serialNumber = snRaw;
        rowData.quantity = qtyRaw;
        rowData.unit = unitRaw;
        rowData.condition = conditionRaw || 'Standby Good';
        rowData.reference = refRaw;
        rowData.notes = notesRaw;

        if (!itemNameRaw) errors.push('Item Name is required');
        if (!whRaw) errors.push('Destination Warehouse is required');

        const matchedWh = warehouses.find(
          (w) => w.name.toLowerCase() === (whRaw || '').toLowerCase() || (w.cityCode && w.cityCode.toLowerCase() === (whRaw || '').toLowerCase()),
        );
        if (!matchedWh) {
          errors.push(`Unknown Destination Warehouse '${whRaw}'`);
        } else if (!matchedWh.isActive) {
          errors.push(`Warehouse '${matchedWh.name}' is inactive`);
        } else {
          rowData.warehouseId = matchedWh.id;
        }

        const matchedItem = items.find((i) => i.name.toLowerCase() === (itemNameRaw || '').toLowerCase());
        if (!matchedItem) {
          errors.push(`Item '${itemNameRaw}' not found in item catalog. Please register master item first.`);
        } else {
          rowData.itemId = matchedItem.id;
          rowData.trackingType = matchedItem.trackingType;

          if (matchedItem.trackingType === TrackingType.SERIALIZED) {
            if (!snRaw) {
              errors.push(`Item '${matchedItem.name}' is Serialized and requires a Serial Number`);
            } else {
              if (seenSerialsInBatch.has(snRaw.toLowerCase())) {
                errors.push(`Duplicate Serial Number '${snRaw}' within this import file`);
              } else {
                seenSerialsInBatch.add(snRaw.toLowerCase());
              }

              const existing = existingSerials.find((s) => s.serialNumber.toLowerCase() === snRaw.toLowerCase());
              if (existing) {
                errors.push(`Serial Number '${snRaw}' already registered in system`);
              }
            }
            rowData.quantity = 1;
          } else {
            if (qtyRaw <= 0) {
              errors.push('Quantity must be greater than 0');
            }
          }
        }

      } else if (importType === 'OUTGOING') {
        const movementDateRaw = row.getCell(1).text?.trim();
        const whRaw = row.getCell(2).text?.trim();
        const projectRaw = row.getCell(3).text?.trim();
        const itemNameRaw = row.getCell(4).text?.trim();
        const snRaw = row.getCell(5).text?.trim();
        const qtyRaw = parseFloat(row.getCell(6).text?.trim() || '0');
        const purposeRaw = row.getCell(7).text?.trim();

        rowData.movementDate = movementDateRaw || new Date().toISOString().split('T')[0];
        rowData.warehouseName = whRaw;
        rowData.projectName = projectRaw;
        rowData.itemName = itemNameRaw;
        rowData.serialNumber = snRaw;
        rowData.quantity = qtyRaw;
        rowData.purpose = purposeRaw;

        if (!projectRaw) errors.push('Project is required');
        if (!itemNameRaw) errors.push('Item Name is required');
        if (!purposeRaw) errors.push('Purpose is required for outgoing dispatch');

        const matchedProject = projects.find(
          (p) => p.name.toLowerCase() === (projectRaw || '').toLowerCase() || (p.siteCode && p.siteCode.toLowerCase() === (projectRaw || '').toLowerCase()),
        );
        if (!matchedProject) {
          errors.push(`Project '${projectRaw}' not found`);
        } else if (matchedProject.status === ProjectStatus.COMPLETED) {
          errors.push(`Project '${matchedProject.name}' is Completed`);
        } else {
          rowData.projectId = matchedProject.id;
        }

        const matchedWh = whRaw
          ? warehouses.find(
              (w) => w.name.toLowerCase() === (whRaw || '').toLowerCase() || (w.cityCode && w.cityCode.toLowerCase() === (whRaw || '').toLowerCase()),
            )
          : null;
        if (whRaw && !matchedWh) {
          errors.push(`Unknown Source Warehouse '${whRaw}'`);
        } else if (matchedWh) {
          rowData.sourceWarehouseId = matchedWh.id;
        }

        const matchedItem = items.find((i) => i.name.toLowerCase() === (itemNameRaw || '').toLowerCase());
        if (!matchedItem) {
          errors.push(`Item '${itemNameRaw}' not found in catalog`);
        } else {
          rowData.itemId = matchedItem.id;
          rowData.trackingType = matchedItem.trackingType;

          if (matchedItem.trackingType === TrackingType.SERIALIZED) {
            if (!snRaw) {
              errors.push(`Serialized item '${matchedItem.name}' requires Serial Number`);
            } else {
              const serialRecord = existingSerials.find((s) => s.serialNumber.toLowerCase() === snRaw.toLowerCase());
              if (!serialRecord) {
                errors.push(`Serial Number '${snRaw}' does not exist in inventory`);
              } else if (serialRecord.itemId !== matchedItem.id) {
                errors.push(`Serial Number '${snRaw}' belongs to a different item`);
              } else if (serialRecord.currentProjectId) {
                errors.push(`Serial Number '${snRaw}' is already deployed at another project`);
              } else if (!serialRecord.currentWarehouseId) {
                errors.push(`Serial Number '${snRaw}' is not currently in any warehouse`);
              } else if (serialRecord.state !== 'STANDBY_GOOD') {
                errors.push(`Serial Number '${snRaw}' condition is ${serialRecord.state}. Only Standby Good items can be deployed.`);
              } else {
                rowData.serialId = serialRecord.id;
                if (!rowData.sourceWarehouseId) {
                  rowData.sourceWarehouseId = serialRecord.currentWarehouseId;
                } else if (rowData.sourceWarehouseId !== serialRecord.currentWarehouseId) {
                  errors.push(`Serial Number '${snRaw}' is in a different warehouse than specified`);
                }
              }
            }
            rowData.quantity = 1;
          } else {
            if (qtyRaw <= 0) {
              errors.push('Quantity must be greater than 0');
            } else {
              // Check warehouse balance
              const whStock = matchedItem.warehouseStocks.find((ws) => !rowData.sourceWarehouseId || ws.warehouseId === rowData.sourceWarehouseId);
              if (!whStock || whStock.quantity < qtyRaw) {
                errors.push(`Insufficient stock for '${matchedItem.name}' (available: ${whStock?.quantity || 0}, requested: ${qtyRaw})`);
              }
            }
          }
        }
      }

      validatedRows.push({
        rowNumber: r,
        status: errors.length > 0 ? 'INVALID' : warnings.length > 0 ? 'WARNING' : 'VALID',
        errors,
        warnings,
        data: rowData,
      });
    }

    const validRowsCount = validatedRows.filter((r) => r.status === 'VALID').length;
    const warningRowsCount = validatedRows.filter((r) => r.status === 'WARNING').length;
    const invalidRowsCount = validatedRows.filter((r) => r.status === 'INVALID').length;

    return {
      importType,
      filename,
      totalRows: validatedRows.length,
      validRows: validRowsCount,
      warningRows: warningRowsCount,
      invalidRows: invalidRowsCount,
      rows: validatedRows,
    };
  }

  async confirmImport(
    userId: number,
    importType: 'INITIAL_STOCK' | 'INCOMING' | 'OUTGOING',
    rows: any[],
    filename: string,
  ) {
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No valid rows to import.');
    }

    let successCount = 0;
    const createdMovements: number[] = [];

    // Pre-load units
    const defaultUnits = await this.prisma.unit.findMany();
    const defaultPcsUnit = defaultUnits.find((u) => u.symbol?.toLowerCase() === 'pcs') || defaultUnits[0];

    await this.prisma.$transaction(async (tx) => {
      if (importType === 'INITIAL_STOCK') {
        // Group by warehouse & date
        const groups = new Map<string, any[]>();
        for (const r of rows) {
          const key = `${r.warehouseId}_${r.movementDate}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }

        for (const [, groupRows] of groups.entries()) {
          const first = groupRows[0];
          const movementNumber = `MV-INIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

          const movement = await tx.stockMovement.create({
            data: {
              movementNumber,
              movementType: MovementType.INITIAL,
              movementDate: new Date(first.movementDate),
              destinationWarehouseId: first.warehouseId,
              notes: `Excel Initial Stock Import from ${filename}`,
              createdById: userId,
            },
          });
          createdMovements.push(movement.id);

          for (const itemRow of groupRows) {
            // Find or create item
            let item = await tx.item.findFirst({
              where: { name: { equals: itemRow.itemName, mode: 'insensitive' } },
            });

            if (!item) {
              // Find unit
              const matchedUnit = defaultUnits.find(
                (u) => u.name.toLowerCase() === (itemRow.unit || '').toLowerCase() || (u.symbol && u.symbol.toLowerCase() === (itemRow.unit || '').toLowerCase()),
              ) || defaultPcsUnit;

              item = await tx.item.create({
                data: {
                  name: itemRow.itemName,
                  brand: itemRow.brand || null,
                  modelNumber: itemRow.modelNumber || null,
                  unitId: matchedUnit.id,
                  trackingType: itemRow.trackingType === 'SERIALIZED' ? TrackingType.SERIALIZED : TrackingType.BULK,
                  materialType: itemRow.materialTypeEnum || MaterialType.MAIN_MATERIAL,
                  isActive: true,
                },
              });
            }

            const mItem = await tx.stockMovementItem.create({
              data: {
                stockMovementId: movement.id,
                itemId: item.id,
                quantity: itemRow.quantity || 1,
              },
            });

            if (item.trackingType === TrackingType.BULK) {
              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_itemId: {
                    warehouseId: first.warehouseId,
                    itemId: item.id,
                  },
                },
                update: { quantity: { increment: itemRow.quantity } },
                create: {
                  warehouseId: first.warehouseId,
                  itemId: item.id,
                  quantity: itemRow.quantity,
                },
              });
            } else {
              // Create serial
              const serial = await tx.itemSerial.create({
                data: {
                  itemId: item.id,
                  serialNumber: itemRow.serialNumber,
                  state: 'STANDBY_GOOD',
                  conditionLabel: itemRow.condition || 'Standby Good',
                  currentWarehouseId: first.warehouseId,
                  notes: itemRow.notes || 'Imported via Excel Initial Stock',
                },
              });

              await tx.stockMovementItemSerial.create({
                data: {
                  stockMovementItemId: mItem.id,
                  itemSerialId: serial.id,
                },
              });
            }
            successCount++;
          }
        }
      } else if (importType === 'INCOMING') {
        // Group by warehouse & date & reference
        const groups = new Map<string, any[]>();
        for (const r of rows) {
          const key = `${r.warehouseId}_${r.movementDate}_${r.reference || ''}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }

        for (const [, groupRows] of groups.entries()) {
          const first = groupRows[0];
          const movementNumber = `MV-IN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

          const movement = await tx.stockMovement.create({
            data: {
              movementNumber,
              movementType: MovementType.INCOMING,
              movementDate: new Date(first.movementDate),
              destinationWarehouseId: first.warehouseId,
              referenceNumber: first.reference || null,
              notes: first.notes || `Excel Incoming Import from ${filename}`,
              createdById: userId,
            },
          });
          createdMovements.push(movement.id);

          for (const itemRow of groupRows) {
            const item = await tx.item.findUnique({ where: { id: itemRow.itemId } });
            if (!item) continue;

            const mItem = await tx.stockMovementItem.create({
              data: {
                stockMovementId: movement.id,
                itemId: item.id,
                quantity: itemRow.quantity || 1,
              },
            });

            if (item.trackingType === TrackingType.BULK) {
              await tx.warehouseStock.upsert({
                where: {
                  warehouseId_itemId: {
                    warehouseId: first.warehouseId,
                    itemId: item.id,
                  },
                },
                update: { quantity: { increment: itemRow.quantity } },
                create: {
                  warehouseId: first.warehouseId,
                  itemId: item.id,
                  quantity: itemRow.quantity,
                },
              });
            } else {
              const serial = await tx.itemSerial.create({
                data: {
                  itemId: item.id,
                  serialNumber: itemRow.serialNumber,
                  state: 'STANDBY_GOOD',
                  conditionLabel: itemRow.condition || 'Standby Good',
                  currentWarehouseId: first.warehouseId,
                  notes: itemRow.notes || 'Imported via Excel Incoming',
                },
              });

              await tx.stockMovementItemSerial.create({
                data: {
                  stockMovementItemId: mItem.id,
                  itemSerialId: serial.id,
                },
              });
            }
            successCount++;
          }
        }
      } else if (importType === 'OUTGOING') {
        // Group by project, sourceWarehouseId, and date
        const groups = new Map<string, any[]>();
        for (const r of rows) {
          const key = `${r.projectId}_${r.sourceWarehouseId}_${r.movementDate}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }

        for (const [, groupRows] of groups.entries()) {
          const first = groupRows[0];
          const movementNumber = `MV-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

          const movement = await tx.stockMovement.create({
            data: {
              movementNumber,
              movementType: MovementType.OUTGOING,
              movementDate: new Date(first.movementDate),
              sourceWarehouseId: first.sourceWarehouseId,
              projectId: first.projectId,
              notes: first.purpose || `Excel Outgoing Import from ${filename}`,
              createdById: userId,
            },
          });
          createdMovements.push(movement.id);

          for (const itemRow of groupRows) {
            const item = await tx.item.findUnique({ where: { id: itemRow.itemId } });
            if (!item) continue;

            const mItem = await tx.stockMovementItem.create({
              data: {
                stockMovementId: movement.id,
                itemId: item.id,
                quantity: itemRow.quantity || 1,
              },
            });

            if (item.trackingType === TrackingType.BULK) {
              await tx.warehouseStock.update({
                where: {
                  warehouseId_itemId: {
                    warehouseId: first.sourceWarehouseId,
                    itemId: item.id,
                  },
                },
                data: { quantity: { decrement: itemRow.quantity } },
              });

              await tx.projectStock.upsert({
                where: {
                  projectId_itemId: {
                    projectId: first.projectId,
                    itemId: item.id,
                  },
                },
                update: { quantity: { increment: itemRow.quantity } },
                create: {
                  projectId: first.projectId,
                  itemId: item.id,
                  quantity: itemRow.quantity,
                },
              });
            } else {
              const serial = await tx.itemSerial.findUnique({
                where: { serialNumber: itemRow.serialNumber },
              });
              if (serial) {
                await tx.itemSerial.update({
                  where: { id: serial.id },
                  data: {
                    currentWarehouseId: null,
                    currentProjectId: first.projectId,
                  },
                });

                await tx.stockMovementItemSerial.create({
                  data: {
                    stockMovementItemId: mItem.id,
                    itemSerialId: serial.id,
                  },
                });
              }
            }
            successCount++;
          }
        }
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const importedAt = new Date().toISOString();
    const importedBy = user?.name || 'Roberta Pungki';

    // Record audit log
    await this.auditLogsService.logAction(userId, 'IMPORT' as any, 'stock_movements', 0, {
      importType,
      filename,
      importedAt,
      importedBy,
      totalRows: rows.length,
      successfulRows: successCount,
      failedRows: 0,
      createdMovementsCount: createdMovements.length,
    });

    return {
      success: true,
      importType,
      filename,
      importedAt,
      importedBy,
      totalRows: rows.length,
      successfulRows: successCount,
      failedRows: 0,
      createdMovementsCount: createdMovements.length,
    };
  }
}
