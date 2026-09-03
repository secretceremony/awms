import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { CreateOutgoingDto } from './dto/create-outgoing.dto.js';
import {
  MovementType,
  TrackingType,
  ProjectStatus,
} from '../../generated/prisma/client.js';

import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    paginationDto: PaginationDto & {
      type?: string;
      movementType?: string;
      warehouseId?: number;
      projectId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const typeFilter = paginationDto.movementType || paginationDto.type;
    const where: any = {};

    if (typeFilter && typeFilter !== 'ALL') {
      where.movementType = typeFilter as MovementType;
    }

    if (paginationDto.warehouseId) {
      const whId = Number(paginationDto.warehouseId);
      where.OR = [
        { destinationWarehouseId: whId },
        { sourceWarehouseId: whId },
      ];
    }

    if (paginationDto.projectId) {
      where.projectId = Number(paginationDto.projectId);
    }

    if (paginationDto.dateFrom || paginationDto.dateTo) {
      where.movementDate = {};
      if (paginationDto.dateFrom) {
        where.movementDate.gte = new Date(paginationDto.dateFrom);
      }
      if (paginationDto.dateTo) {
        const to = new Date(paginationDto.dateTo);
        to.setHours(23, 59, 59, 999);
        where.movementDate.lte = to;
      }
    }

    if (paginationDto.search) {
      const s = paginationDto.search.trim();
      const searchConditions: any[] = [
        { movementNumber: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { sourceWarehouse: { name: { contains: s, mode: 'insensitive' } } },
        { destinationWarehouse: { name: { contains: s, mode: 'insensitive' } } },
        { project: { name: { contains: s, mode: 'insensitive' } } },
        { project: { siteCode: { contains: s, mode: 'insensitive' } } },
        { items: { some: { item: { name: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { item: { brand: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { item: { modelNumber: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { movementSerials: { some: { itemSerial: { serialNumber: { contains: s, mode: 'insensitive' } } } } } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take,
        include: {
          sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          destinationWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          project: {
            select: {
              id: true,
              name: true,
              siteCode: true,
              location: true,
              client: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              item: { select: { id: true, name: true, brand: true, modelNumber: true, trackingType: true, unit: { select: { id: true, name: true, symbol: true } } } },
              movementSerials: {
                include: { itemSerial: { select: { id: true, serialNumber: true, state: true, conditionLabel: true, notes: true } } },
              },
            },
          },
        },
        orderBy: { movementDate: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
        destinationWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
        project: {
          select: {
            id: true,
            name: true,
            siteCode: true,
            location: true,
            client: { select: { id: true, name: true } },
            clientContact: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
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
            movementSerials: {
              include: {
                itemSerial: {
                  select: {
                    id: true,
                    serialNumber: true,
                    state: true,
                    conditionLabel: true,
                    notes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Stock movement with ID ${id} not found`);
    }

    return movement;
  }

  async findAllIncoming(
    paginationDto: PaginationDto & {
      movementType?: string;
      warehouseId?: number;
      projectId?: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: any = {
      ...(paginationDto.movementType && paginationDto.movementType !== 'ALL'
        ? { movementType: paginationDto.movementType as MovementType }
        : { movementType: { in: [MovementType.INCOMING, MovementType.RETURN] } }),
      ...(paginationDto.warehouseId && { destinationWarehouseId: Number(paginationDto.warehouseId) }),
      ...(paginationDto.projectId && { projectId: Number(paginationDto.projectId) }),
      ...(paginationDto.startDate && paginationDto.endDate && {
        movementDate: {
          gte: new Date(paginationDto.startDate),
          lte: new Date(paginationDto.endDate),
        },
      }),
    };

    if (paginationDto.search) {
      const s = paginationDto.search.trim();
      where.OR = [
        { movementNumber: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { destinationWarehouse: { name: { contains: s, mode: 'insensitive' } } },
        { destinationWarehouse: { cityCode: { contains: s, mode: 'insensitive' } } },
        { project: { name: { contains: s, mode: 'insensitive' } } },
        { project: { siteCode: { contains: s, mode: 'insensitive' } } },
        { project: { client: { name: { contains: s, mode: 'insensitive' } } } },
        { items: { some: { item: { name: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { item: { brand: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { item: { modelNumber: { contains: s, mode: 'insensitive' } } } } },
        { items: { some: { movementSerials: { some: { itemSerial: { serialNumber: { contains: s, mode: 'insensitive' } } } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take,
        include: {
          destinationWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          project: {
            select: {
              id: true,
              name: true,
              siteCode: true,
              location: true,
              referenceNumber: true,
              client: { select: { id: true, name: true, clientType: true } },
            },
          },
          deliveryOrder: { select: { id: true, doNumber: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              item: { select: { id: true, name: true, brand: true, modelNumber: true, trackingType: true, unit: { select: { id: true, name: true, symbol: true } } } },
              movementSerials: {
                include: { itemSerial: { select: { id: true, serialNumber: true, state: true, conditionLabel: true, notes: true } } },
              },
            },
          },
        },
        orderBy: { movementDate: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOneIncoming(id: number) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        destinationWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
        sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
        project: {
          select: {
            id: true,
            name: true,
            siteCode: true,
            location: true,
            referenceNumber: true,
            client: { select: { id: true, name: true, clientType: true } },
            clientContact: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        deliveryOrder: { select: { id: true, doNumber: true } },
        createdBy: { select: { id: true, name: true, email: true } },
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
            movementSerials: {
              include: {
                itemSerial: {
                  select: {
                    id: true,
                    serialNumber: true,
                    state: true,
                    conditionLabel: true,
                    notes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !movement ||
      (movement.movementType !== MovementType.INCOMING &&
        movement.movementType !== MovementType.RETURN)
    ) {
      throw new NotFoundException(
        `Incoming or Return movement with ID ${id} not found`,
      );
    }

    return movement;
  }

  async getAvailableProjectInventory(projectId: number, search?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const s = search?.trim().toLowerCase();
    const results: any[] = [];

    // 1. Bulk stock at project
    const projectStocks = await this.prisma.projectStock.findMany({
      where: {
        projectId,
        quantity: { gt: 0 },
        item: {
          isActive: true,
          trackingType: TrackingType.BULK,
          ...(s && {
            OR: [
              { name: { contains: s, mode: 'insensitive' } },
              { brand: { contains: s, mode: 'insensitive' } },
              { modelNumber: { contains: s, mode: 'insensitive' } },
            ],
          }),
        },
      },
      include: {
        item: {
          include: { unit: { select: { id: true, name: true, symbol: true } } },
        },
      },
      orderBy: { item: { name: 'asc' } },
    });

    for (const ps of projectStocks) {
      results.push({
        id: `bulk-${ps.id}`,
        trackingType: 'BULK',
        itemId: ps.itemId,
        itemName: ps.item.name,
        brand: ps.item.brand,
        modelNumber: ps.item.modelNumber,
        availableQty: ps.quantity,
        unit: ps.item.unit.name,
        unitSymbol: ps.item.unit.symbol || ps.item.unit.name,
      });
    }

    // 2. Serialized assets deployed at project
    const projectSerials = await this.prisma.itemSerial.findMany({
      where: {
        currentProjectId: projectId,
        item: {
          isActive: true,
          trackingType: TrackingType.SERIALIZED,
          ...(s && {
            OR: [
              { name: { contains: s, mode: 'insensitive' } },
              { brand: { contains: s, mode: 'insensitive' } },
              { modelNumber: { contains: s, mode: 'insensitive' } },
            ],
          }),
        },
        ...(s && {
          OR: [
            { serialNumber: { contains: s, mode: 'insensitive' } },
            { item: { name: { contains: s, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        item: {
          include: { unit: { select: { id: true, name: true, symbol: true } } },
        },
      },
      orderBy: [{ item: { name: 'asc' } }, { serialNumber: 'asc' }],
    });

    for (const sItem of projectSerials) {
      results.push({
        id: `sn-${sItem.id}`,
        trackingType: 'SERIALIZED',
        itemId: sItem.itemId,
        itemSerialId: sItem.id,
        serialNumber: sItem.serialNumber,
        itemName: sItem.item.name,
        brand: sItem.item.brand,
        modelNumber: sItem.item.modelNumber,
        availableQty: 1,
        condition: sItem.conditionLabel || (sItem.state === 'STANDBY_GOOD' ? 'Standby Good' : sItem.state),
        state: sItem.state,
        unit: sItem.item.unit.name,
        unitSymbol: sItem.item.unit.symbol || sItem.item.unit.name,
      });
    }

    return results;
  }

  async findAllOutgoing(
    paginationDto: PaginationDto & {
      warehouseId?: number;
      projectId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<PaginatedResult<any>> {
    return this.findAll({
      ...paginationDto,
      movementType: 'OUTGOING',
    });
  }

  async findOneOutgoing(id: number) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id, movementType: MovementType.OUTGOING },
      include: {
        sourceWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
        project: {
          select: {
            id: true,
            name: true,
            siteCode: true,
            location: true,
            client: { select: { id: true, name: true } },
            clientContact: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        deliveryOrder: { select: { id: true, doNumber: true } },
        createdBy: { select: { id: true, name: true, email: true } },
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
            movementSerials: {
              include: {
                itemSerial: {
                  select: {
                    id: true,
                    serialNumber: true,
                    state: true,
                    conditionLabel: true,
                    notes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Outgoing movement with ID ${id} not found`);
    }

    return movement;
  }

  async getAvailableInventory(params: {
    warehouseId?: number;
    search?: string;
    trackingType?: string;
  }) {
    const warehouseFilter = params.warehouseId ? Number(params.warehouseId) : undefined;
    const search = params.search?.trim().toLowerCase();
    const trackingType = params.trackingType?.toUpperCase();

    const results: any[] = [];

    // 1. Available Bulk Stocks
    if (!trackingType || trackingType === 'ALL' || trackingType === 'BULK') {
      const bulkStocks = await this.prisma.warehouseStock.findMany({
        where: {
          quantity: { gt: 0 },
          ...(warehouseFilter && { warehouseId: warehouseFilter }),
          item: {
            isActive: true,
            trackingType: TrackingType.BULK,
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { modelNumber: { contains: search, mode: 'insensitive' } },
              ],
            }),
          },
        },
        include: {
          warehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          item: {
            include: { unit: { select: { id: true, name: true, symbol: true } } },
          },
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
      });

      for (const bs of bulkStocks) {
        results.push({
          id: `bulk-${bs.warehouseId}-${bs.itemId}`,
          trackingType: 'BULK',
          itemId: bs.itemId,
          itemName: bs.item.name,
          brand: bs.item.brand,
          modelNumber: bs.item.modelNumber,
          warehouseId: bs.warehouseId,
          warehouseName: bs.warehouse.name,
          cityCode: bs.warehouse.cityCode,
          availableQty: bs.quantity,
          unit: bs.item.unit.name,
          unitSymbol: bs.item.unit.symbol || bs.item.unit.name,
        });
      }
    }

    // 2. Available Serialized Units in Warehouse (Only STANDBY_GOOD deployable assets)
    if (!trackingType || trackingType === 'ALL' || trackingType === 'SERIALIZED') {
      const serials = await this.prisma.itemSerial.findMany({
        where: {
          currentWarehouseId: warehouseFilter ? warehouseFilter : { not: null },
          currentProjectId: null,
          state: 'STANDBY_GOOD',
          item: {
            isActive: true,
            trackingType: TrackingType.SERIALIZED,
          },
          ...(search && {
            OR: [
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { item: { name: { contains: search, mode: 'insensitive' } } },
              { item: { brand: { contains: search, mode: 'insensitive' } } },
              { item: { modelNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }),
        },
        include: {
          currentWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
          item: {
            include: { unit: { select: { id: true, name: true, symbol: true } } },
          },
        },
        orderBy: [
          { currentWarehouse: { name: 'asc' } },
          { item: { name: 'asc' } },
          { serialNumber: 'asc' },
        ],
      });

      for (const s of serials) {
        results.push({
          id: `sn-${s.id}`,
          trackingType: 'SERIALIZED',
          itemId: s.itemId,
          itemSerialId: s.id,
          serialNumber: s.serialNumber,
          itemName: s.item.name,
          brand: s.item.brand,
          modelNumber: s.item.modelNumber,
          warehouseId: s.currentWarehouseId!,
          warehouseName: s.currentWarehouse?.name || '',
          cityCode: s.currentWarehouse?.cityCode || '',
          availableQty: 1,
          condition: s.conditionLabel || (s.state === 'STANDBY_GOOD' ? 'Standby Good' : s.state),
          state: s.state,
          unit: s.item.unit.name,
          unitSymbol: s.item.unit.symbol || s.item.unit.name,
        });
      }
    }

    return results;
  }

  async createOutgoing(userId: number, dto: CreateOutgoingDto) {
    const { projectId, movementDate, notes, deliveryOrderId, items } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required for outgoing stock');
    }

    if (!deliveryOrderId && (!notes || !notes.trim())) {
      throw new BadRequestException('Manual dispatch reason is required for manual outgoing stock movements.');
    }

    // 1. Verify Project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Cannot create outgoing movement for a non-active or completed project.');
    }

    // 2. Validate and Infer Source Warehouse
    let inferredWarehouseId = dto.sourceWarehouseId;

    for (const entry of items) {
      if (entry.quantity <= 0) {
        throw new BadRequestException('Outgoing quantity must be greater than 0');
      }

      const item = await this.prisma.item.findUnique({
        where: { id: entry.itemId },
      });
      if (!item || !item.isActive) {
        throw new NotFoundException(`Item with ID ${entry.itemId} not found or is inactive`);
      }

      if (item.trackingType === TrackingType.BULK) {
        if (!inferredWarehouseId) {
          const whStocks = await this.prisma.warehouseStock.findMany({
            where: { itemId: item.id, quantity: { gte: entry.quantity } },
          });
          if (whStocks.length === 1) {
            inferredWarehouseId = whStocks[0].warehouseId;
          } else if (whStocks.length > 1) {
            throw new BadRequestException(`Multiple warehouses have stock for ${item.name}. Please specify source warehouse.`);
          } else {
            throw new BadRequestException(`Insufficient stock for item ${item.name} in any warehouse`);
          }
        }
      } else if (item.trackingType === TrackingType.SERIALIZED) {
        const serials = entry.serialNumbers || entry.serialDetails?.map((sd) => sd.serialNumber) || [];
        if (serials.length !== entry.quantity) {
          throw new BadRequestException(`Item ${item.name} requires exactly ${entry.quantity} serial number(s)`);
        }

        for (const sn of serials) {
          const itemSerial = await this.prisma.itemSerial.findUnique({
            where: { serialNumber: sn },
          });
          if (!itemSerial || !itemSerial.currentWarehouseId || itemSerial.currentProjectId) {
            throw new BadRequestException(`Serial number ${sn} is not available in warehouse`);
          }
          if (itemSerial.itemId !== item.id) {
            throw new BadRequestException(`Serial number ${sn} does not belong to item ${item.name}`);
          }
          if (itemSerial.state !== 'STANDBY_GOOD') {
            const condition = itemSerial.conditionLabel || itemSerial.state;
            throw new BadRequestException(
              `Serial number ${sn} is not available for deployment because its current condition is ${condition}. Only Standby Good items can be deployed.`,
            );
          }

          if (!inferredWarehouseId) {
            inferredWarehouseId = itemSerial.currentWarehouseId;
          } else if (inferredWarehouseId !== itemSerial.currentWarehouseId) {
            throw new BadRequestException('Outgoing items must come from the same Warehouse.');
          }
        }
      }
    }

    if (!inferredWarehouseId) {
      throw new BadRequestException('Source warehouse could not be determined.');
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: inferredWarehouseId },
    });
    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException('Source warehouse is invalid or inactive');
    }

    const movementNumber = `MV-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateObj = movementDate ? new Date(movementDate) : new Date();

    // 3. Execute Atomic Transaction
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          movementNumber,
          movementType: MovementType.OUTGOING,
          movementDate: dateObj,
          sourceWarehouseId: inferredWarehouseId,
          projectId,
          referenceNumber: project.referenceNumber || null,
          notes: notes?.trim() || null,
          createdById: userId,
        },
      });

      for (const entry of items) {
        const item = await tx.item.findUnique({ where: { id: entry.itemId } });
        if (!item) throw new NotFoundException(`Item ${entry.itemId} not found`);

        const movementItem = await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            itemId: item.id,
            quantity: entry.quantity,
          },
        });

        if (item.trackingType === TrackingType.BULK) {
          const whStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: inferredWarehouseId!,
                itemId: item.id,
              },
            },
          });

          if (!whStock || whStock.quantity < entry.quantity) {
            throw new BadRequestException(`Insufficient stock for item ${item.name} in ${warehouse.name}`);
          }

          await tx.warehouseStock.update({
            where: { id: whStock.id },
            data: { quantity: { decrement: entry.quantity } },
          });

          await tx.projectStock.upsert({
            where: {
              projectId_itemId: {
                projectId,
                itemId: item.id,
              },
            },
            create: {
              projectId,
              itemId: item.id,
              quantity: entry.quantity,
            },
            update: {
              quantity: { increment: entry.quantity },
            },
          });
        } else if (item.trackingType === TrackingType.SERIALIZED) {
          const serials = entry.serialNumbers || entry.serialDetails?.map((sd) => sd.serialNumber) || [];
          for (const sn of serials) {
            const itemSerial = await tx.itemSerial.findUnique({ where: { serialNumber: sn } });
            if (!itemSerial || itemSerial.currentWarehouseId !== inferredWarehouseId || itemSerial.currentProjectId) {
              throw new BadRequestException(`Serial number ${sn} is not available in ${warehouse.name}`);
            }
            if (itemSerial.state !== 'STANDBY_GOOD') {
              const condition = itemSerial.conditionLabel || itemSerial.state;
              throw new BadRequestException(
                `Serial number ${sn} is not available for deployment because its current condition is ${condition}.`,
              );
            }

            const updatedSerial = await tx.itemSerial.update({
              where: { id: itemSerial.id },
              data: {
                currentWarehouseId: null,
                currentProjectId: projectId,
                state: 'DEPLOY',
              },
            });

            await tx.stockMovementItemSerial.create({
              data: {
                stockMovementItemId: movementItem.id,
                itemSerialId: updatedSerial.id,
              },
            });
          }
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'OUTGOING',
          entityName: 'stock_movements',
          entityId: movement.id,
          payload: {
            movementNumber,
            movementType: 'OUTGOING',
            dispatchSource: deliveryOrderId ? `DO-${deliveryOrderId}` : 'MANUAL',
            sourceWarehouseId: inferredWarehouseId,
            projectId,
            reason: notes?.trim() || null,
            totalItems: items.length,
          },
        },
      });

      return movement;
    });
  }

  async createMovement(userId: number, dto: CreateStockMovementDto) {
    const {
      movementType,
      movementDate,
      referenceNumber,
      notes,
      sourceWarehouseId,
      destinationWarehouseId,
      projectId,
      items,
    } = dto;

    if (
      movementType === MovementType.INCOMING ||
      movementType === MovementType.INITIAL
    ) {
      if (!destinationWarehouseId) {
        throw new BadRequestException(
          'Destination warehouse is required for incoming or initial stock',
        );
      }
    }

    if (movementType === MovementType.OUTGOING) {
      if (!sourceWarehouseId) {
        throw new BadRequestException(
          'Source warehouse is required for outgoing stock',
        );
      }
    }

    if (movementType === MovementType.RETURN) {
      if (!destinationWarehouseId) {
        throw new BadRequestException(
          'Destination warehouse is required for return stock',
        );
      }
    }

    if (movementType === MovementType.ADJUSTMENT) {
      if (!sourceWarehouseId && !destinationWarehouseId) {
        throw new BadRequestException(
          'At least one warehouse (source or destination) must be specified for adjustments',
        );
      }
    }

    const movementNumber = `MV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          movementNumber,
          movementType,
          movementDate: movementDate ? new Date(movementDate) : new Date(),
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          sourceWarehouseId,
          destinationWarehouseId,
          projectId,
          createdById: userId,
        },
      });

      for (const entry of items) {
        const item = await tx.item.findUnique({
          where: { id: entry.itemId },
        });

        if (!item || !item.isActive) {
          throw new NotFoundException(
            `Item with ID ${entry.itemId} not found or is inactive`,
          );
        }

        const serials: any[] =
          entry.serialDetails || entry.serialNumbers?.map((sn) => ({ serialNumber: sn })) || [];

        if (item.trackingType === TrackingType.SERIALIZED) {
          if (serials.length !== entry.quantity) {
            throw new BadRequestException(
              `Item ${item.name} is serialized and requires exactly ${entry.quantity} serial numbers`,
            );
          }
        } else {
          if (serials.length > 0) {
            throw new BadRequestException(
              `Bulk item ${item.name} cannot have serial numbers`,
            );
          }
        }

        const movementItem = await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            itemId: item.id,
            quantity: entry.quantity,
          },
        });

        if (item.trackingType === TrackingType.BULK) {
          if (sourceWarehouseId) {
            const whStock = await tx.warehouseStock.findUnique({
              where: {
                warehouseId_itemId: {
                  warehouseId: sourceWarehouseId,
                  itemId: item.id,
                },
              },
            });

            if (!whStock || whStock.quantity < entry.quantity) {
              throw new BadRequestException(
                `Insufficient stock for item ${item.name} in source warehouse`,
              );
            }

            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { quantity: { decrement: entry.quantity } },
            });
          }

          if (destinationWarehouseId) {
            await tx.warehouseStock.upsert({
              where: {
                warehouseId_itemId: {
                  warehouseId: destinationWarehouseId,
                  itemId: item.id,
                },
              },
              create: {
                warehouseId: destinationWarehouseId,
                itemId: item.id,
                quantity: entry.quantity,
              },
              update: {
                quantity: { increment: entry.quantity },
              },
            });
          }

          if (projectId) {
            if (movementType === MovementType.OUTGOING) {
              await tx.projectStock.upsert({
                where: {
                  projectId_itemId: {
                    projectId,
                    itemId: item.id,
                  },
                },
                create: {
                  projectId,
                  itemId: item.id,
                  quantity: entry.quantity,
                },
                update: {
                  quantity: { increment: entry.quantity },
                },
              });
            } else if (movementType === MovementType.RETURN) {
              const projStock = await tx.projectStock.findUnique({
                where: {
                  projectId_itemId: {
                    projectId,
                    itemId: item.id,
                  },
                },
              });

              if (!projStock || projStock.quantity < entry.quantity) {
                throw new BadRequestException(
                  `Insufficient stock for item ${item.name} in project`,
                );
              }

              await tx.projectStock.update({
                where: { id: projStock.id },
                data: { quantity: { decrement: entry.quantity } },
              });
            }
          }
        }

        if (
          item.trackingType === TrackingType.SERIALIZED &&
          serials.length > 0
        ) {
          for (const sData of serials) {
            const sn = sData.serialNumber;
            let serial = await tx.itemSerial.findUnique({
              where: { serialNumber: sn },
            });

            if (movementType === MovementType.OUTGOING) {
              if (!serial || serial.currentWarehouseId !== sourceWarehouseId) {
                throw new BadRequestException(
                  `Serial number ${sn} is not available in source warehouse`,
                );
              }
              serial = await tx.itemSerial.update({
                where: { id: serial.id },
                data: {
                  currentWarehouseId: null,
                  currentProjectId: projectId,
                  state: 'DEPLOY',
                  conditionLabel: sData.conditionLabel ?? serial.conditionLabel,
                },
              });
            } else if (movementType === MovementType.RETURN) {
              if (!serial || serial.currentProjectId !== projectId) {
                throw new BadRequestException(
                  `Serial number ${sn} is not deployed in project`,
                );
              }
              const cond = sData.conditionLabel || serial.conditionLabel || 'Standby Good';
              const st =
                sData.state ||
                (cond === 'Standby Bad'
                  ? 'STANDBY_BAD'
                  : cond === 'Under Repair'
                  ? 'UNDER_REPAIR'
                  : 'STANDBY_GOOD');

              serial = await tx.itemSerial.update({
                where: { id: serial.id },
                data: {
                  currentWarehouseId: destinationWarehouseId,
                  currentProjectId: null,
                  state: st,
                  conditionLabel: cond,
                  notes: sData.notes !== undefined ? sData.notes : serial.notes,
                },
              });
            } else if (
              movementType === MovementType.INITIAL ||
              movementType === MovementType.INCOMING
            ) {
              if (serial) {
                if (serial.currentWarehouseId || serial.currentProjectId) {
                  throw new BadRequestException(
                    `Serial number ${sn} already exists in a warehouse or project`,
                  );
                }
                serial = await tx.itemSerial.update({
                  where: { id: serial.id },
                  data: {
                    currentWarehouseId: destinationWarehouseId,
                    currentProjectId: null,
                    state: sData.state ?? 'STANDBY_GOOD',
                    conditionLabel: sData.conditionLabel ?? serial.conditionLabel,
                    notes: sData.notes ?? serial.notes,
                  },
                });
              } else {
                serial = await tx.itemSerial.create({
                  data: {
                    serialNumber: sn,
                    itemId: item.id,
                    currentWarehouseId: destinationWarehouseId,
                    currentProjectId: null,
                    state: sData.state ?? 'STANDBY_GOOD',
                    conditionLabel: sData.conditionLabel ?? null,
                    notes: sData.notes ?? null,
                  },
                });
              }
            } else {
              if (!serial) {
                serial = await tx.itemSerial.create({
                  data: {
                    serialNumber: sn,
                    itemId: item.id,
                    currentWarehouseId: destinationWarehouseId,
                    currentProjectId: null,
                    state: sData.state ?? 'STANDBY_GOOD',
                    conditionLabel: sData.conditionLabel ?? null,
                  },
                });
              } else {
                serial = await tx.itemSerial.update({
                  where: { id: serial.id },
                  data: {
                    currentWarehouseId: destinationWarehouseId,
                    currentProjectId: null,
                    state: sData.state ?? serial.state,
                    conditionLabel: sData.conditionLabel ?? serial.conditionLabel,
                  },
                });
              }
            }

            await tx.stockMovementItemSerial.create({
              data: {
                stockMovementItemId: movementItem.id,
                itemSerialId: serial.id,
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: `CREATE_${movementType}_MOVEMENT`,
          entityName: 'stock_movements',
          entityId: movement.id,
          payload: {
            movementNumber,
            movementType,
            itemsCount: items.length,
          },
        },
      });

      return movement;
    });
  }

  async createAdjustment(userId: number, dto: CreateAdjustmentDto) {
    const { warehouseId, itemId, reason, adjustmentQty, serialDetail, movementDate } = dto;

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Adjustment reason is required');
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException('Invalid or inactive warehouse');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { unit: true },
    });
    if (!item || !item.isActive) {
      throw new BadRequestException('Invalid or inactive item');
    }

    const movementNumber = `MV-ADJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateObj = movementDate ? new Date(movementDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      if (item.trackingType === TrackingType.BULK) {
        if (adjustmentQty === undefined || adjustmentQty === 0) {
          throw new BadRequestException('Adjustment quantity cannot be 0');
        }

        let currentStock = await tx.warehouseStock.findUnique({
          where: { warehouseId_itemId: { warehouseId, itemId } },
        });

        const currentQty = currentStock?.quantity || 0;
        const newQty = currentQty + adjustmentQty;

        if (newQty < 0) {
          throw new BadRequestException(
            `Adjustment of ${adjustmentQty} would result in negative stock balance (${newQty}). Current stock is ${currentQty}.`,
          );
        }

        if (currentStock) {
          await tx.warehouseStock.update({
            where: { id: currentStock.id },
            data: { quantity: newQty },
          });
        } else {
          await tx.warehouseStock.create({
            data: { warehouseId, itemId, quantity: newQty },
          });
        }

        const signStr = adjustmentQty > 0 ? `+${adjustmentQty}` : `${adjustmentQty}`;
        const unitLabel = item.unit?.symbol || item.unit?.name || 'pcs';

        const movement = await tx.stockMovement.create({
          data: {
            movementNumber,
            movementType: MovementType.ADJUSTMENT,
            movementDate: dateObj,
            destinationWarehouseId: warehouseId,
            referenceNumber: `ADJ: ${signStr} ${unitLabel}`,
            notes: reason.trim(),
            createdById: userId,
          },
        });

        await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            itemId: item.id,
            quantity: Math.abs(adjustmentQty),
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'ADJUSTMENT',
            entityName: 'Item',
            entityId: item.id,
            payload: {
              movementNumber,
              trackingType: 'BULK',
              warehouseId,
              previousQuantity: currentQty,
              adjustmentQuantity: adjustmentQty,
              newQuantity: newQty,
              reason: reason.trim(),
            },
          },
        });

        return movement;
      }

      if (item.trackingType === TrackingType.SERIALIZED) {
        const rawSerials = dto.serials || (dto.serialDetail ? [dto.serialDetail] : []);
        if (rawSerials.length === 0) {
          throw new BadRequestException('At least one serial number is required for serialized item adjustment');
        }

        const updatedSerials: any[] = [];
        const snListStr: string[] = [];

        for (const sDetail of rawSerials) {
          const sn = sDetail.serialNumber?.trim();
          if (!sn) {
            throw new BadRequestException('Serial number cannot be empty');
          }

          const itemSerial = await tx.itemSerial.findUnique({
            where: { serialNumber: sn },
          });

          if (!itemSerial || itemSerial.itemId !== item.id) {
            throw new BadRequestException(
              `Serial number ${sn} does not exist or does not belong to ${item.name}`,
            );
          }

          if (itemSerial.currentWarehouseId !== warehouseId) {
            throw new BadRequestException(
              `Serial number ${sn} is not located in the selected warehouse`,
            );
          }

          const oldCondition = itemSerial.conditionLabel || itemSerial.state;
          const oldState = itemSerial.state;
          const newCondition = sDetail.newCondition || oldCondition;
          const newState =
            sDetail.newState ||
            (newCondition === 'Standby Bad'
              ? 'STANDBY_BAD'
              : newCondition === 'Under Repair'
              ? 'UNDER_REPAIR'
              : 'STANDBY_GOOD');

          const updatedSerial = await tx.itemSerial.update({
            where: { id: itemSerial.id },
            data: {
              conditionLabel: newCondition,
              state: newState,
              notes:
                sDetail.notes !== undefined
                  ? sDetail.notes.trim() || null
                  : itemSerial.notes,
            },
          });

          updatedSerials.push(updatedSerial);
          snListStr.push(`${sn} (${oldCondition} -> ${newCondition})`);
        }

        const refNote =
          snListStr.length === 1
            ? `ADJ: SN ${snListStr[0]}`
            : `ADJ: ${snListStr.length} Serials (${snListStr.slice(0, 2).join(', ')}${snListStr.length > 2 ? '...' : ''})`;

        const movement = await tx.stockMovement.create({
          data: {
            movementNumber,
            movementType: MovementType.ADJUSTMENT,
            movementDate: dateObj,
            destinationWarehouseId: warehouseId,
            referenceNumber: refNote,
            notes: reason.trim(),
            createdById: userId,
          },
        });

        const movementItem = await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            itemId: item.id,
            quantity: updatedSerials.length,
          },
        });

        for (const uSerial of updatedSerials) {
          await tx.stockMovementItemSerial.create({
            data: {
              stockMovementItemId: movementItem.id,
              itemSerialId: uSerial.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId,
            action: 'ADJUSTMENT',
            entityName: 'ItemSerial',
            entityId: item.id,
            payload: {
              movementNumber,
              trackingType: 'SERIALIZED',
              warehouseId,
              totalAdjusted: updatedSerials.length,
              serials: rawSerials.map((s) => ({
                serialNumber: s.serialNumber,
                newCondition: s.newCondition,
              })),
              reason: reason.trim(),
            },
          },
        });

        return movement;
      }

      throw new BadRequestException('Unsupported tracking type');
    });
  }
}
