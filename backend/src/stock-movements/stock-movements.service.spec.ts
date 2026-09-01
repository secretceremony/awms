import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementsService } from './stock-movements.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  MovementType,
  TrackingType,
 
} from '../../generated/prisma/client';

describe('StockMovementsService', () => {
  let service: StockMovementsService;

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: any) => Promise<any>) =>
        callback(mockPrisma),
      ),
    item: {
      findUnique: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    stockMovementItem: {
      create: jest.fn(),
    },
    warehouseStock: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    projectStock: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    itemSerial: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovementItemSerial: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    jest.clearAllMocks();
  });

  describe('Warehouse constraint validations', () => {
    it('should throw BadRequestException if destination is missing for INCOMING', async () => {
      await expect(
        service.createMovement(1, {
          movementType: MovementType.INCOMING,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if source is missing for OUTGOING', async () => {
      await expect(
        service.createMovement(1, {
          movementType: MovementType.OUTGOING,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMovement execution logic', () => {
    it('should successfully create bulk stock incoming movement', async () => {
      const mockItem = {
        id: 10,
        brand: 'BULK-ITEM',
        name: 'Bulk Item Box',
        trackingType: TrackingType.BULK,
        isActive: true,
      };

      const mockMovement = { id: 1, movementNumber: 'MV-TEST-123' };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.stockMovement.create.mockResolvedValue(mockMovement);
      mockPrisma.stockMovementItem.create.mockResolvedValue({ id: 2 });
      mockPrisma.warehouseStock.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.createMovement(1, {
        movementType: MovementType.INCOMING,
        destinationWarehouseId: 2,
        items: [
          {
            itemId: 10,
            quantity: 50,
          },
        ],
      });

      expect(result).toEqual(mockMovement);
      expect(mockPrisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
      });
      expect(mockPrisma.warehouseStock.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item is inactive', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({ id: 10, isActive: false });

      await expect(
        service.createMovement(1, {
          movementType: MovementType.INCOMING,
          destinationWarehouseId: 2,
          items: [
            {
              itemId: 10,
              quantity: 10,
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if serialized item has missing serials', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 20,
        brand: 'SER-ITEM',
        name: 'Serialized Item',
        trackingType: TrackingType.SERIALIZED,
        isActive: true,
      });

      await expect(
        service.createMovement(1, {
          movementType: MovementType.INCOMING,
          destinationWarehouseId: 2,
          items: [
            {
              itemId: 20,
              quantity: 3,
              serialNumbers: ['SN-1', 'SN-2'], // Mismatch length
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully handle serialized outgoing movement', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 20,
        brand: 'SER-ITEM',
        name: 'Serialized Item',
        trackingType: TrackingType.SERIALIZED,
        isActive: true,
      });

      mockPrisma.stockMovement.create.mockResolvedValue({ id: 1 });
      mockPrisma.stockMovementItem.create.mockResolvedValue({ id: 2 });

      mockPrisma.warehouseStock.findUnique.mockResolvedValue({
        id: 5,
        quantity: 10,
      });
      mockPrisma.warehouseStock.update.mockResolvedValue({});

      // Mock serial checker - serial must exist and be IN_STOCK
      mockPrisma.itemSerial.findUnique.mockResolvedValue({
        id: 100,
        serialNumber: 'SN-ABC',
        state: "STANDBY_GOOD", currentWarehouseId: 1,
      });
      mockPrisma.itemSerial.update.mockResolvedValue({});
      mockPrisma.stockMovementItemSerial.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.createMovement(1, {
        movementType: MovementType.OUTGOING,
        sourceWarehouseId: 1,
        items: [
          {
            itemId: 20,
            quantity: 1,
            serialNumbers: ['SN-ABC'],
          },
        ],
      });

      expect(mockPrisma.itemSerial.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { state: "DEPLOYED", currentWarehouseId: null, currentProjectId: undefined, conditionLabel: undefined },
      });
    });

    it('should throw BadRequestException if outgoing serial number is not in stock', async () => {
      mockPrisma.item.findUnique.mockResolvedValue({
        id: 20,
        brand: 'SER-ITEM',
        name: 'Serialized Item',
        trackingType: TrackingType.SERIALIZED,
        isActive: true,
      });

      mockPrisma.stockMovement.create.mockResolvedValue({ id: 1 });
      mockPrisma.stockMovementItem.create.mockResolvedValue({ id: 2 });

      mockPrisma.warehouseStock.findUnique.mockResolvedValue({
        id: 5,
        quantity: 10,
      });

      // Serial is already DELIVERED
      mockPrisma.itemSerial.findUnique.mockResolvedValue({
        id: 100,
        serialNumber: 'SN-ABC',
        state: "DEPLOYED",
      });

      await expect(
        service.createMovement(1, {
          movementType: MovementType.OUTGOING,
          sourceWarehouseId: 1,
          items: [
            {
              itemId: 20,
              quantity: 1,
              serialNumbers: ['SN-ABC'],
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
