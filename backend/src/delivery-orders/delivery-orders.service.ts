import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto.js';
import { UpdateDeliveryOrderDto } from './dto/update-delivery-order.dto.js';
import { DeliveryOrdersPaginationDto } from './dto/delivery-orders-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import {
  Prisma,
  OrderStatus,
  ProjectStatus,
  TrackingType,
  MovementType,
} from '../../generated/prisma/client.js';

const ROMAN_MONTHS = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
];

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getEligibleOutgoings(search?: string) {
    const s = search?.trim();
    return this.prisma.stockMovement.findMany({
      where: {
        movementType: MovementType.OUTGOING,
        deliveryOrder: null, // Not yet linked to any DO
        project: {
          status: ProjectStatus.ACTIVE,
        },
        ...(s && {
          OR: [
            { movementNumber: { contains: s, mode: 'insensitive' } },
            { notes: { contains: s, mode: 'insensitive' } },
            { project: { name: { contains: s, mode: 'insensitive' } } },
            { project: { siteCode: { contains: s, mode: 'insensitive' } } },
            { project: { referenceNumber: { contains: s, mode: 'insensitive' } } },
            { project: { client: { name: { contains: s, mode: 'insensitive' } } } },
            { sourceWarehouse: { name: { contains: s, mode: 'insensitive' } } },
            { items: { some: { item: { name: { contains: s, mode: 'insensitive' } } } } },
            { items: { some: { movementSerials: { some: { itemSerial: { serialNumber: { contains: s, mode: 'insensitive' } } } } } } },
          ],
        }),
      },
      include: {
        project: {
          include: {
            client: true,
            clientContact: true,
          },
        },
        sourceWarehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            item: {
              include: { unit: true },
            },
            movementSerials: {
              include: { itemSerial: true },
            },
          },
        },
      },
      orderBy: { movementDate: 'desc' },
      take: 50,
    });
  }

  private async validateAndInferWarehouse(
    projectId: number,
    items: Array<{ itemId: number; quantity: number; serialNumbers?: string[] }>,
  ) {
    // 1. Validate Project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        clientContact: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create or modify Delivery Order for a non-active or completed project.',
      );
    }

    if (!project.referenceNumber || !project.referenceNumber.trim()) {
      throw new BadRequestException(
        'This project requires a Reference Number before a Delivery Order can be created.',
      );
    }

    if (!project.client || !project.client.isActive) {
      throw new BadRequestException(
        'Project associated Client is invalid or inactive.',
      );
    }

    // 2. Validate Items & Single Warehouse Rule
    if (!items || items.length === 0) {
      throw new BadRequestException(
        'At least one item is required for a Delivery Order',
      );
    }

    let inferredWarehouseId: number | null = null;
    const allSerialNumbersSet = new Set<string>();

    for (const entry of items) {
      if (entry.quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than 0');
      }

      const item = await this.prisma.item.findUnique({
        where: { id: entry.itemId },
        include: { unit: true },
      });

      if (!item || !item.isActive) {
        throw new NotFoundException(
          `Item #${entry.itemId} not found or is inactive`,
        );
      }

      if (item.trackingType === TrackingType.BULK) {
        if (!inferredWarehouseId) {
          const whStocks = await this.prisma.warehouseStock.findMany({
            where: { itemId: item.id, quantity: { gte: entry.quantity } },
            include: { warehouse: true },
          });

          const activeWhStocks = whStocks.filter((ws) => ws.warehouse.isActive);

          if (activeWhStocks.length === 1) {
            inferredWarehouseId = activeWhStocks[0].warehouseId;
          } else if (activeWhStocks.length > 1) {
            inferredWarehouseId = activeWhStocks[0].warehouseId;
          } else {
            throw new BadRequestException(
              `Insufficient stock for item "${item.name}" in any active warehouse`,
            );
          }
        } else {
          const stock = await this.prisma.warehouseStock.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: inferredWarehouseId,
                itemId: item.id,
              },
            },
          });

          if (!stock || stock.quantity < entry.quantity) {
            throw new BadRequestException(
              `Insufficient stock for item "${item.name}" in selected warehouse (Available: ${stock?.quantity || 0}, Requested: ${entry.quantity})`,
            );
          }
        }
      } else if (item.trackingType === TrackingType.SERIALIZED) {
        const serials = entry.serialNumbers || [];
        if (serials.length !== entry.quantity) {
          throw new BadRequestException(
            `Serialized item "${item.name}" requires exactly ${entry.quantity} serial number(s)`,
          );
        }

        for (const sn of serials) {
          const trimmedSn = sn.trim();
          if (allSerialNumbersSet.has(trimmedSn)) {
            throw new BadRequestException(
              `Duplicate serial number "${trimmedSn}" in Delivery Order`,
            );
          }
          allSerialNumbersSet.add(trimmedSn);

          const itemSerial = await this.prisma.itemSerial.findUnique({
            where: { serialNumber: trimmedSn },
            include: { currentWarehouse: true },
          });

          if (
            !itemSerial ||
            !itemSerial.currentWarehouseId ||
            itemSerial.currentProjectId !== null
          ) {
            throw new BadRequestException(
              `Serial number "${trimmedSn}" is not available in warehouse inventory (currently deployed or unassigned)`,
            );
          }

          if (itemSerial.itemId !== item.id) {
            throw new BadRequestException(
              `Serial number "${trimmedSn}" does not belong to item "${item.name}"`,
            );
          }

          if (itemSerial.state !== 'STANDBY_GOOD') {
            const condition = itemSerial.conditionLabel || itemSerial.state;
            throw new BadRequestException(
              `Serial number "${trimmedSn}" is not available for deployment because its current condition is ${condition}.`,
            );
          }

          if (!inferredWarehouseId) {
            inferredWarehouseId = itemSerial.currentWarehouseId;
          } else if (inferredWarehouseId !== itemSerial.currentWarehouseId) {
            throw new BadRequestException(
              `All items and serial numbers in a Delivery Order must come from the same Warehouse. Mixed warehouse selection is rejected.`,
            );
          }
        }
      }
    }

    if (!inferredWarehouseId) {
      throw new BadRequestException(
        'Source warehouse could not be determined from selected items.',
      );
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: inferredWarehouseId },
    });

    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException(
        'Source warehouse is invalid or currently inactive.',
      );
    }

    return { project, warehouse, sourceWarehouseId: inferredWarehouseId };
  }

  async createDraft(userId: number, dto: CreateDeliveryOrderDto) {
    const activity = dto.activity?.trim();
    if (!activity) {
      throw new BadRequestException('Activity is required');
    }

    let project: any;
    let sourceWarehouseId: number;

    if (dto.stockMovementId) {
      const stockMovement = await this.prisma.stockMovement.findUnique({
        where: { id: dto.stockMovementId },
        include: {
          deliveryOrder: true,
          project: {
            include: {
              client: true,
              clientContact: true,
            },
          },
          sourceWarehouse: true,
          items: {
            include: {
              item: { include: { unit: true } },
              movementSerials: { include: { itemSerial: true } },
            },
          },
        },
      });

      if (!stockMovement || stockMovement.movementType !== MovementType.OUTGOING) {
        throw new BadRequestException('Selected stock movement is invalid or not an Outgoing transaction.');
      }

      if (stockMovement.deliveryOrder) {
        throw new BadRequestException(
          `This Outgoing stock movement is already linked to Delivery Order #${stockMovement.deliveryOrder.doNumber || stockMovement.deliveryOrder.id}.`,
        );
      }

      if (!stockMovement.project || stockMovement.project.status !== ProjectStatus.ACTIVE) {
        throw new BadRequestException('The project linked to this Outgoing movement is not active.');
      }

      if (!stockMovement.project.referenceNumber || !stockMovement.project.referenceNumber.trim()) {
        throw new BadRequestException('This project requires a Reference Number before a Delivery Order can be created.');
      }

      project = stockMovement.project;
      const inferredWhId = stockMovement.sourceWarehouseId || stockMovement.sourceWarehouse?.id;

      if (!inferredWhId) {
        throw new BadRequestException('Source warehouse is missing from the Outgoing transaction.');
      }
      sourceWarehouseId = inferredWhId;
    } else {
      const validated = await this.validateAndInferWarehouse(dto.projectId, dto.items);
      project = validated.project;
      sourceWarehouseId = validated.sourceWarehouseId;
    }

    const dateObj = dto.date ? new Date(dto.date) : new Date();

    const createdId = await this.prisma.$transaction(async (tx) => {
      const deliveryOrder = await tx.deliveryOrder.create({
        data: {
          date: dateObj,
          activity,
          notes: dto.notes?.trim() || null,
          status: OrderStatus.DRAFT,
          projectId: project.id,
          clientId: project.clientId,
          sourceWarehouseId,
          stockMovementId: dto.stockMovementId || null,
          createdById: userId,
        },
      });

      for (const itemDto of dto.items) {
        const item = await tx.item.findUnique({
          where: { id: itemDto.itemId },
          include: { unit: true },
        });

        if (!item) {
          throw new NotFoundException(`Item #${itemDto.itemId} not found`);
        }

        const doItem = await tx.deliveryOrderItem.create({
          data: {
            deliveryOrderId: deliveryOrder.id,
            itemId: item.id,
            quantity: itemDto.quantity,
            pic: itemDto.pic?.trim() || null,
            remarks: itemDto.remarks?.trim() || null,
            itemName: item.name,
            brand: item.brand || null,
            modelNumber: item.modelNumber || null,
            unitName: item.unit?.name || null,
            unitSymbol: item.unit?.symbol || null,
            trackingType: item.trackingType,
          },
        });

        if (
          item.trackingType === TrackingType.SERIALIZED &&
          itemDto.serialNumbers
        ) {
          for (const sn of itemDto.serialNumbers) {
            const itemSerial = await tx.itemSerial.findUnique({
              where: { serialNumber: sn.trim() },
            });

            if (itemSerial) {
              await tx.deliveryOrderItemSerial.create({
                data: {
                  deliveryOrderItemId: doItem.id,
                  itemSerialId: itemSerial.id,
                  serialNumber: itemSerial.serialNumber,
                  conditionLabel: itemSerial.conditionLabel || itemSerial.state,
                },
              });
            }
          }
        }
      }

      return deliveryOrder.id;
    });

    await this.auditLogsService.logAction(
      userId,
      'CREATE_DRAFT',
      'delivery_orders',
      createdId,
      {
        action: 'Created Delivery Order Draft',
        projectId: project.id,
        projectName: project.name,
        warehouseId: sourceWarehouseId,
        stockMovementId: dto.stockMovementId,
        totalItems: dto.items.length,
      },
    );

    return this.findOne(createdId);
  }

  async updateDraft(
    id: number,
    userId: number,
    dto: UpdateDeliveryOrderDto,
  ) {
    const existing = await this.findOne(id);

    if (existing.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft Delivery Orders can be edited. Issued documents are immutable.',
      );
    }

    const targetProjectId = dto.projectId || existing.projectId;
    const targetItems = dto.items || existing.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      pic: i.pic || undefined,
      remarks: i.remarks || undefined,
      serialNumbers: i.itemSerials?.map((s) => s.serialNumber || s.itemSerial?.serialNumber).filter(Boolean) as string[],
    }));

    let project = existing.project;
    let sourceWarehouseId = existing.sourceWarehouseId;

    if (!existing.stockMovementId) {
      const validated = await this.validateAndInferWarehouse(targetProjectId, targetItems);
      project = validated.project;
      sourceWarehouseId = validated.sourceWarehouseId;
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing items and their serials
      await tx.deliveryOrderItem.deleteMany({
        where: { deliveryOrderId: id },
      });

      // 2. Update Delivery Order Header
      await tx.deliveryOrder.update({
        where: { id },
        data: {
          projectId: project.id,
          clientId: project.clientId,
          sourceWarehouseId,
          activity: dto.activity?.trim() || existing.activity,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
          date: dto.date ? new Date(dto.date) : existing.date,
        },
      });

      // 3. Re-create Items and Serials
      for (const itemDto of targetItems) {
        const item = await tx.item.findUnique({
          where: { id: itemDto.itemId },
          include: { unit: true },
        });

        if (!item) {
          throw new NotFoundException(`Item #${itemDto.itemId} not found`);
        }

        const doItem = await tx.deliveryOrderItem.create({
          data: {
            deliveryOrderId: id,
            itemId: item.id,
            quantity: itemDto.quantity,
            pic: itemDto.pic?.trim() || null,
            remarks: itemDto.remarks?.trim() || null,
            itemName: item.name,
            brand: item.brand || null,
            modelNumber: item.modelNumber || null,
            unitName: item.unit?.name || null,
            unitSymbol: item.unit?.symbol || null,
            trackingType: item.trackingType,
          },
        });

        if (
          item.trackingType === TrackingType.SERIALIZED &&
          itemDto.serialNumbers
        ) {
          for (const sn of itemDto.serialNumbers) {
            const itemSerial = await tx.itemSerial.findUnique({
              where: { serialNumber: sn.trim() },
            });

            if (itemSerial) {
              await tx.deliveryOrderItemSerial.create({
                data: {
                  deliveryOrderItemId: doItem.id,
                  itemSerialId: itemSerial.id,
                  serialNumber: itemSerial.serialNumber,
                  conditionLabel: itemSerial.conditionLabel || itemSerial.state,
                },
              });
            }
          }
        }
      }

      return id;
    });

    await this.auditLogsService.logAction(
      userId,
      'UPDATE_DRAFT',
      'delivery_orders',
      id,
      {
        action: 'Updated Delivery Order Draft',
        projectId: project.id,
        totalItems: targetItems.length,
      },
    );

    return this.findOne(id);
  }

  async cancelDraft(id: number, userId: number) {
    const existing = await this.findOne(id);

    if (existing.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft Delivery Orders can be cancelled or deleted.',
      );
    }

    await this.prisma.deliveryOrder.delete({
      where: { id },
    });

    await this.auditLogsService.logAction(
      userId,
      'CANCEL_DRAFT',
      'delivery_orders',
      id,
      {
        action: 'Cancelled Delivery Order Draft',
        projectId: existing.projectId,
      },
    );

    return { message: `Delivery Order Draft #${id} cancelled successfully.` };
  }

  async issueDeliveryOrder(id: number, userId: number) {
    const deliveryOrder = await this.findOne(id);

    if (deliveryOrder.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft Delivery Orders can be issued.',
      );
    }

    const project = deliveryOrder.project;
    if (!project || project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot issue Delivery Order for a non-active or completed project.',
      );
    }

    if (!project.referenceNumber || !project.referenceNumber.trim()) {
      throw new BadRequestException(
        'This project requires a Reference Number before a Delivery Order can be issued.',
      );
    }

    const warehouse = deliveryOrder.sourceWarehouse;
    const doDate = new Date(deliveryOrder.date);
    const year = doDate.getFullYear();
    const month = doDate.getMonth() + 1; // 1-12
    const romanMonth = ROMAN_MONTHS[month] || 'I';

    const cityCode = (warehouse?.cityCode || 'BPN').toUpperCase();
    const clientType = (project.client?.clientType || 'OTHER').toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Concurrency-safe Yearly Sequence Generation
      const seqRecord = await tx.doSequence.upsert({
        where: { year },
        create: { year, currentSequence: 1 },
        update: { currentSequence: { increment: 1 } },
      });

      const sequenceStr = String(seqRecord.currentSequence).padStart(3, '0');
      const doNumber = `${sequenceStr}/ALS-${cityCode}/DO-${clientType}/${romanMonth}/${year}`;

      // 2. Document Snapshots Construction
      const fullSnapshot = {
        doNumber,
        date: doDate.toISOString(),
        activity: deliveryOrder.activity,
        notes: deliveryOrder.notes,
        client: {
          id: project.client.id,
          name: project.client.name,
          clientType: project.client.clientType,
          address: project.client.address,
          phone: project.client.phone,
          email: project.client.email,
        },
        attn: project.clientContact
          ? {
              id: project.clientContact.id,
              name: project.clientContact.name,
              phone: project.clientContact.phone,
              email: project.clientContact.email,
            }
          : null,
        project: {
          id: project.id,
          name: project.name,
          location: project.location,
          siteCode: project.siteCode,
          referenceNumber: project.referenceNumber,
        },
        warehouse: warehouse
          ? {
              id: warehouse.id,
              name: warehouse.name,
              city: warehouse.city,
              cityCode: warehouse.cityCode,
              location: warehouse.location,
            }
          : null,
        items: deliveryOrder.items.map((i, idx) => ({
          itemNo: idx + 1,
          itemId: i.itemId,
          name: i.itemName || i.item?.name,
          brand: i.brand || i.item?.brand,
          modelNumber: i.modelNumber || i.item?.modelNumber,
          trackingType: i.trackingType || i.item?.trackingType,
          quantity: i.quantity,
          unitName: i.unitName || i.item?.unit?.name,
          unitSymbol: i.unitSymbol || i.item?.unit?.symbol,
          pic: i.pic,
          remarks: i.remarks,
          serials: i.itemSerials.map((s) => ({
            serialNumber: s.serialNumber || s.itemSerial?.serialNumber,
            conditionLabel: s.conditionLabel,
          })),
        })),
      };

      // 3. Update Delivery Order to ISSUED (NO STOCK MUTATION IS RUN - Outgoing already mutated stock)
      const updatedDo = await tx.deliveryOrder.update({
        where: { id },
        data: {
          doNumber,
          status: OrderStatus.ISSUED,
          issuedAt: new Date(),
          issuedById: userId,
          clientCompanyName: project.client?.name,
          clientType: project.client?.clientType,
          attnName: project.clientContact?.name || null,
          attnPhone: project.clientContact?.phone || null,
          attnEmail: project.clientContact?.email || null,
          projectName: project.name,
          projectLocation: project.location,
          siteCode: project.siteCode,
          referenceNumber: project.referenceNumber,
          warehouseName: warehouse?.name || null,
          warehouseCityCode: warehouse?.cityCode || null,
          snapshots: fullSnapshot,
        },
      });

      // 4. Audit Log for Issue
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ISSUE',
          entityName: 'delivery_orders',
          entityId: deliveryOrder.id,
          payload: {
            action: 'Issued Delivery Order',
            doNumber,
            stockMovementId: deliveryOrder.stockMovementId,
            projectId: project.id,
            totalItems: deliveryOrder.items.length,
          },
        },
      });

      return updatedDo;
    });
  }

  async logPrint(id: number, userId: number) {
    const deliveryOrder = await this.findOne(id);

    await this.auditLogsService.logAction(
      userId,
      'PRINT',
      'delivery_orders',
      id,
      {
        action: 'Printed Delivery Order',
        doNumber: deliveryOrder.doNumber,
      },
    );

    return { message: 'Print action logged successfully' };
  }

  async findAll(paginationDto: DeliveryOrdersPaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: Prisma.DeliveryOrderWhereInput = {};

    if (paginationDto.status && paginationDto.status !== 'all') {
      where.status = paginationDto.status.toUpperCase() as OrderStatus;
    }

    if (paginationDto.projectId) {
      where.projectId = Number(paginationDto.projectId);
    }

    if (paginationDto.clientId) {
      where.clientId = Number(paginationDto.clientId);
    }

    if (paginationDto.warehouseId) {
      where.sourceWarehouseId = Number(paginationDto.warehouseId);
    }

    if (paginationDto.dateFrom || paginationDto.dateTo) {
      where.date = {};
      if (paginationDto.dateFrom) {
        where.date.gte = new Date(paginationDto.dateFrom);
      }
      if (paginationDto.dateTo) {
        const to = new Date(paginationDto.dateTo);
        to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }

    if (paginationDto.search) {
      const s = paginationDto.search.trim();
      where.OR = [
        { doNumber: { contains: s, mode: 'insensitive' } },
        { activity: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { project: { name: { contains: s, mode: 'insensitive' } } },
        { project: { referenceNumber: { contains: s, mode: 'insensitive' } } },
        { project: { siteCode: { contains: s, mode: 'insensitive' } } },
        { client: { name: { contains: s, mode: 'insensitive' } } },
        { sourceWarehouse: { name: { contains: s, mode: 'insensitive' } } },
        { sourceWarehouse: { cityCode: { contains: s, mode: 'insensitive' } } },
        { items: { some: { item: { name: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { item: { brand: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { itemSerials: { some: { serialNumber: { contains: s, mode: 'insensitive' } } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.deliveryOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, clientType: true } },
          project: {
            select: {
              id: true,
              name: true,
              siteCode: true,
              location: true,
              referenceNumber: true,
              clientContact: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
          sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          issuedBy: { select: { id: true, name: true, email: true } },
          stockMovement: { select: { id: true, movementNumber: true, movementDate: true, notes: true } },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  modelNumber: true,
                  trackingType: true,
                  unit: { select: { id: true, name: true, symbol: true } },
                },
              },
              itemSerials: {
                include: {
                  itemSerial: {
                    select: {
                      id: true,
                      serialNumber: true,
                      state: true,
                      conditionLabel: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.deliveryOrder.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        client: true,
        project: {
          include: {
            client: true,
            clientContact: true,
          },
        },
        sourceWarehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        issuedBy: { select: { id: true, name: true, email: true } },
        stockMovement: true,
        items: {
          include: {
            item: {
              include: {
                unit: true,
              },
            },
            itemSerials: {
              include: {
                itemSerial: true,
              },
            },
          },
        },
      },
    });

    if (!deliveryOrder) {
      throw new NotFoundException(`Delivery Order with ID #${id} not found`);
    }

    return deliveryOrder;
  }
}
