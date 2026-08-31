import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import {
  MovementType,
  SerialStatus,
  TrackingType,
} from '../../generated/prisma/client.js';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(userId: number, dto: CreateStockMovementDto) {
    const {
      movementType,
      referenceNumber,
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
          referenceNumber,
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

        // Validate serial tracking constraint
        if (item.trackingType === TrackingType.SERIALIZED) {
          if (
            !entry.serialNumbers ||
            entry.serialNumbers.length !== entry.quantity
          ) {
            throw new BadRequestException(
              `Item ${item.name} is serialized and requires exactly ${entry.quantity} serial numbers`,
            );
          }
        } else {
          if (entry.serialNumbers && entry.serialNumbers.length > 0) {
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

        // Handle Stock balances updates
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
              `Insufficient stock for item ${item.sku} in source warehouse`,
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
                `Insufficient stock for item ${item.sku} in project`,
              );
            }

            await tx.projectStock.update({
              where: { id: projStock.id },
              data: { quantity: { decrement: entry.quantity } },
            });
          }
        }

        // Handle Serial numbers updates if SERIALIZED
        if (
          item.trackingType === TrackingType.SERIALIZED &&
          entry.serialNumbers
        ) {
          for (const sn of entry.serialNumbers) {
            let serial = await tx.itemSerial.findUnique({
              where: { serialNumber: sn },
            });

            // Set Serial target status based on movement type
            let targetStatus: SerialStatus;
            if (movementType === MovementType.OUTGOING) {
              if (!serial || serial.status !== SerialStatus.IN_STOCK) {
                throw new BadRequestException(
                  `Serial number ${sn} is not available in stock`,
                );
              }
              targetStatus = SerialStatus.DELIVERED;
            } else if (movementType === MovementType.RETURN) {
              if (!serial || serial.status === SerialStatus.IN_STOCK) {
                throw new BadRequestException(
                  `Serial number ${sn} is already marked as in stock`,
                );
              }
              targetStatus = SerialStatus.IN_STOCK;
            } else if (
              movementType === MovementType.INITIAL ||
              movementType === MovementType.INCOMING
            ) {
              if (serial && serial.status === SerialStatus.IN_STOCK) {
                throw new BadRequestException(
                  `Serial number ${sn} already exists in stock`,
                );
              }
              targetStatus = SerialStatus.IN_STOCK;
            } else {
              // ADJUSTMENT
              targetStatus = destinationWarehouseId
                ? SerialStatus.IN_STOCK
                : SerialStatus.MOVED;
            }

            // Create or update serial record
            if (!serial) {
              serial = await tx.itemSerial.create({
                data: {
                  serialNumber: sn,
                  itemId: item.id,
                  status: targetStatus,
                },
              });
            } else {
              serial = await tx.itemSerial.update({
                where: { id: serial.id },
                data: { status: targetStatus },
              });
            }

            // Link serial mapping to the movement item
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
