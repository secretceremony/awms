import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  CreateShippingLabelDto,
  UpdateShippingLabelDto,
  ShippingLabelSourceType,
} from './dto/create-shipping-label.dto.js';
import { ShippingLabelsPaginationDto } from './dto/shipping-labels-pagination.dto.js';
import { Prisma, OrderStatus } from '../../generated/prisma/client.js';

@Injectable()
export class ShippingLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(userId: number, dto: CreateShippingLabelDto) {
    const settings = await this.settingsService.getAllSettings();
    const defaultSender = settings.delivery;

    let deliveryOrder = null;
    let finalSourceType = dto.sourceType || ShippingLabelSourceType.STANDALONE;
    let finalDoNumber = dto.doNumber?.trim() || null;

    if (dto.deliveryOrderId) {
      deliveryOrder = await this.prisma.deliveryOrder.findUnique({
        where: { id: dto.deliveryOrderId },
        include: {
          client: true,
          project: { include: { clientContact: true } },
        },
      });

      if (!deliveryOrder) {
        throw new NotFoundException(`Delivery Order #${dto.deliveryOrderId} not found`);
      }

      if (deliveryOrder.status !== OrderStatus.ISSUED) {
        throw new BadRequestException('Shipping Labels from Delivery Order can only be generated for ISSUED Delivery Orders.');
      }

      finalSourceType = ShippingLabelSourceType.DO;
      finalDoNumber = deliveryOrder.doNumber || null;
    }

    const shipDateObj = dto.shipDate ? new Date(dto.shipDate) : new Date();

    const senderName = dto.senderName?.trim() || defaultSender.senderName;
    const senderAddress = dto.senderAddress?.trim() || defaultSender.senderAddress;
    const senderPhone = dto.senderPhone?.trim() || defaultSender.senderPhone;

    const parseDimension = (val: number | undefined, defaultStr: string) => {
      if (val !== undefined && val > 0) return val;
      const num = parseInt(defaultStr.replace(/\D/g, ''), 10);
      return isNaN(num) ? 100 : num;
    };

    const labelWidth = parseDimension(dto.labelWidth, defaultSender.labelWidth);
    const labelHeight = parseDimension(dto.labelHeight, defaultSender.labelHeight);

    const label = await this.prisma.shippingLabel.create({
      data: {
        deliveryOrderId: deliveryOrder ? deliveryOrder.id : null,
        sourceType: finalSourceType,
        shipDate: shipDateObj,
        recipientName: dto.recipientName.trim(),
        attnName: dto.attnName?.trim() || null,
        destination: dto.destination.trim(),
        referenceNumber: dto.referenceNumber?.trim() || null,
        doNumber: finalDoNumber,
        senderName,
        senderAddress,
        senderPhone,
        isFragile: Boolean(dto.isFragile),
        handlingNote: dto.handlingNote?.trim() || null,
        labelWidth,
        labelHeight,
        notes: dto.notes?.trim() || null,
        createdById: userId,
      },
      include: {
        deliveryOrder: { select: { id: true, doNumber: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'shipping_labels', label.id, {
      sourceType: finalSourceType,
      deliveryOrderId: deliveryOrder?.id || null,
      doNumber: finalDoNumber,
      recipientName: label.recipientName,
      destination: label.destination,
      isFragile: label.isFragile,
    });

    return label;
  }

  async findAll(paginationDto: ShippingLabelsPaginationDto) {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const whereClause: Prisma.ShippingLabelWhereInput = {};

    if (paginationDto.sourceType && paginationDto.sourceType !== 'ALL') {
      whereClause.sourceType = paginationDto.sourceType;
    }

    if (paginationDto.isFragile !== undefined && paginationDto.isFragile !== '') {
      whereClause.isFragile = paginationDto.isFragile === 'true';
    }

    if (paginationDto.startDate || paginationDto.endDate) {
      whereClause.shipDate = {};
      if (paginationDto.startDate) {
        whereClause.shipDate.gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        const end = new Date(paginationDto.endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.shipDate.lte = end;
      }
    }

    if (paginationDto.search) {
      const search = paginationDto.search.trim();
      whereClause.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { doNumber: { contains: search, mode: 'insensitive' } },
        { attnName: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shippingLabel.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          deliveryOrder: { select: { id: true, doNumber: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.shippingLabel.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const label = await this.prisma.shippingLabel.findUnique({
      where: { id },
      include: {
        deliveryOrder: { select: { id: true, doNumber: true, status: true, date: true, activity: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!label) {
      throw new NotFoundException(`Shipping label #${id} not found`);
    }

    return label;
  }

  async update(id: number, userId: number, dto: UpdateShippingLabelDto) {
    await this.findOne(id);

    const data: Prisma.ShippingLabelUpdateInput = {};

    if (dto.shipDate) data.shipDate = new Date(dto.shipDate);
    if (dto.recipientName !== undefined) data.recipientName = dto.recipientName.trim();
    if (dto.attnName !== undefined) data.attnName = dto.attnName?.trim() || null;
    if (dto.destination !== undefined) data.destination = dto.destination.trim();
    if (dto.referenceNumber !== undefined) data.referenceNumber = dto.referenceNumber?.trim() || null;
    if (dto.doNumber !== undefined) data.doNumber = dto.doNumber?.trim() || null;
    if (dto.senderName !== undefined) data.senderName = dto.senderName?.trim() || null;
    if (dto.senderAddress !== undefined) data.senderAddress = dto.senderAddress?.trim() || null;
    if (dto.senderPhone !== undefined) data.senderPhone = dto.senderPhone?.trim() || null;
    if (dto.isFragile !== undefined) data.isFragile = Boolean(dto.isFragile);
    if (dto.handlingNote !== undefined) data.handlingNote = dto.handlingNote?.trim() || null;
    if (dto.labelWidth !== undefined) data.labelWidth = dto.labelWidth;
    if (dto.labelHeight !== undefined) data.labelHeight = dto.labelHeight;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;

    const updated = await this.prisma.shippingLabel.update({
      where: { id },
      data,
      include: {
        deliveryOrder: { select: { id: true, doNumber: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'shipping_labels', id, {
      changes: dto,
    });

    return updated;
  }

  async remove(id: number, userId: number) {
    const existing = await this.findOne(id);

    await this.prisma.shippingLabel.delete({ where: { id } });

    await this.auditLogs.logAction(userId, 'DELETE', 'shipping_labels', id, {
      deletedRecord: {
        recipientName: existing.recipientName,
        destination: existing.destination,
        doNumber: existing.doNumber,
      },
    });

    return { message: `Shipping label #${id} deleted successfully` };
  }

  async logPrint(id: number, userId: number) {
    const existing = await this.findOne(id);

    await this.auditLogs.logAction(userId, 'PRINT', 'shipping_labels', id, {
      recipientName: existing.recipientName,
      destination: existing.destination,
      doNumber: existing.doNumber,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }
}
