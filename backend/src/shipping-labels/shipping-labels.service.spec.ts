import { Test, TestingModule } from '@nestjs/testing';
import { ShippingLabelsService } from './shipping-labels.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { ShippingLabelSourceType } from './dto/create-shipping-label.dto.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ShippingLabelsService', () => {
  let service: ShippingLabelsService;
  let prisma: PrismaService;

  const mockPrisma = {
    shippingLabel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deliveryOrder: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditLogs = {
    logAction: jest.fn(),
  };

  const mockSettings = {
    getAllSettings: jest.fn().mockResolvedValue({
      delivery: {
        senderName: 'PT ALSSA Corporindo',
        senderAddress: 'Balikpapan Hub, Kalimantan Timur',
        senderPhone: '+62 542 876543',
        labelWidth: '100mm',
        labelHeight: '150mm',
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingLabelsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: mockAuditLogs },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();

    service = module.get<ShippingLabelsService>(ShippingLabelsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create standalone shipping label successfully with sender defaults from settings', async () => {
      mockPrisma.shippingLabel.create.mockResolvedValue({
        id: 1,
        sourceType: 'STANDALONE',
        recipientName: 'PT Badak NGL',
        destination: 'Bontang Plant',
        senderName: 'PT ALSSA Corporindo',
        labelWidth: 100,
        labelHeight: 150,
      });

      const res = await service.create(1, {
        sourceType: ShippingLabelSourceType.STANDALONE,
        recipientName: 'PT Badak NGL',
        destination: 'Bontang Plant',
      });

      expect(res.id).toBe(1);
      expect(mockPrisma.shippingLabel.create).toHaveBeenCalled();
      expect(mockAuditLogs.logAction).toHaveBeenCalledWith(
        1,
        'CREATE',
        'shipping_labels',
        1,
        expect.any(Object),
      );
    });

    it('should create shipping label from ISSUED delivery order', async () => {
      mockPrisma.deliveryOrder.findUnique.mockResolvedValue({
        id: 10,
        status: OrderStatus.ISSUED,
        doNumber: '001/ALS-BPN/DO-PHM/IX/2026',
        client: { name: 'PT PHM' },
        project: { name: 'Sanga-Sanga Field' },
      });

      mockPrisma.shippingLabel.create.mockResolvedValue({
        id: 2,
        deliveryOrderId: 10,
        sourceType: 'DO',
        doNumber: '001/ALS-BPN/DO-PHM/IX/2026',
        recipientName: 'PT PHM',
        destination: 'Sanga-Sanga Field',
      });

      const res = await service.create(1, {
        sourceType: ShippingLabelSourceType.DO,
        deliveryOrderId: 10,
        recipientName: 'PT PHM',
        destination: 'Sanga-Sanga Field',
      });

      expect(res.id).toBe(2);
      expect(res.deliveryOrderId).toBe(10);
    });

    it('should throw BadRequestException if DO is not ISSUED', async () => {
      mockPrisma.deliveryOrder.findUnique.mockResolvedValue({
        id: 10,
        status: OrderStatus.DRAFT,
      });

      await expect(
        service.create(1, {
          sourceType: ShippingLabelSourceType.DO,
          deliveryOrderId: 10,
          recipientName: 'PT PHM',
          destination: 'Sanga-Sanga Field',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated shipping labels', async () => {
      mockPrisma.shippingLabel.findMany.mockResolvedValue([{ id: 1, recipientName: 'PT PHM' }]);
      mockPrisma.shippingLabel.count.mockResolvedValue(1);

      const res = await service.findAll({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });
});
