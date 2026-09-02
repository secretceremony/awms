import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import {
  MovementType,
  TrackingType,
} from '../../generated/prisma/client.js';

import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    paginationDto: PaginationDto & { type?: string },
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: any = {};

    if (paginationDto.type) {
      where.movementType = paginationDto.type as MovementType;
    }

    if (paginationDto.search) {
      where.OR = [
        { movementNumber: { contains: paginationDto.search, mode: 'insensitive' } },
        { referenceNumber: { contains: paginationDto.search, mode: 'insensitive' } },
        { items: { some: { item: { name: { contains: paginationDto.search, mode: 'insensitive' } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take,
        include: {
          sourceWarehouse: { select: { id: true, name: true, cityCode: true } },
          destinationWarehouse: { select: { id: true, name: true, cityCode: true } },
          project: { select: { id: true, name: true, jobNo: true } },
          createdBy: { select: { id: true, name: true } },
          items: {
            include: {
              item: { select: { id: true, name: true, brand: true, modelNumber: true, trackingType: true } },
              movementSerials: {
                include: { itemSerial: { select: { serialNumber: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findAllIncoming(
    paginationDto: PaginationDto & { warehouseId?: number; startDate?: string; endDate?: string },
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: any = {
      movementType: MovementType.INCOMING,
      ...(paginationDto.warehouseId && { destinationWarehouseId: Number(paginationDto.warehouseId) }),
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
      where: { id, movementType: MovementType.INCOMING },
      include: {
        destinationWarehouse: { select: { id: true, name: true, cityCode: true, location: true } },
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
      throw new NotFoundException(`Incoming movement with ID ${id} not found`);
    }

    return movement;
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

    // 1. Validate warehouse constraints based on movement type
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

    // Generate unique movement number
    const movementNumber = `MV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Execute transactional updates
    return this.prisma.$transaction(async (tx) => {
      // Create StockMovement parent
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

      // Loop through items and apply stock changes
      for (const entry of items) {
        const item = await tx.item.findUnique({
          where: { id: entry.itemId },
        });

        if (!item || !item.isActive) {
          throw new NotFoundException(
            `Item with ID ${entry.itemId} not found or is inactive`,
          );
        }

        const serials: any[] = entry.serialDetails || entry.serialNumbers?.map(sn => ({ serialNumber: sn })) || [];

        // Validate serial tracking constraint
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

        // Create StockMovementItem child
        const movementItem = await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            itemId: item.id,
            quantity: entry.quantity,
          },
        });

        // Handle Stock balances updates (BULK items only)
        if (item.trackingType === TrackingType.BULK) {
          if (sourceWarehouseId) {
            // Decrement source warehouse stock
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
            // Increment destination warehouse stock
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

          // Handle project stocks
          if (projectId) {
            if (movementType === MovementType.OUTGOING) {
              // Warehouse -> Project
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
              // Project -> Warehouse
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

        // Handle Serial numbers updates if SERIALIZED
        if (
          item.trackingType === TrackingType.SERIALIZED &&
          serials.length > 0
        ) {
          for (const sData of serials) {
            const sn = sData.serialNumber;
            let serial = await tx.itemSerial.findUnique({
              where: { serialNumber: sn },
            });

            // Handle Serial target status based on movement type
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
                  state: 'DEPLOYED',
                  conditionLabel: sData.conditionLabel ?? serial.conditionLabel,
                },
              });
            } else if (movementType === MovementType.RETURN) {
              if (!serial || serial.currentProjectId !== projectId) {
                throw new BadRequestException(
                  `Serial number ${sn} is not deployed in project`,
                );
              }
              serial = await tx.itemSerial.update({
                where: { id: serial.id },
                data: {
                  currentWarehouseId: destinationWarehouseId,
                  currentProjectId: null,
                  state: sData.state ?? 'STANDBY_GOOD', // Default assumption on return
                  conditionLabel: sData.conditionLabel ?? serial.conditionLabel,
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
              // ADJUSTMENT
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

            // Create movement serial relation
            await tx.stockMovementItemSerial.create({
              data: {
                stockMovementItemId: movementItem.id,
                itemSerialId: serial.id,
              },
            });
          }
        }
      }

      // 3. Write Audit Log
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
}
