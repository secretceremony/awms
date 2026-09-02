import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import {
  UpdateInventorySettingsDto,
  UpdateDeliverySettingsDto,
} from './dto/update-settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getAllSettings() {
    const settingsRows = await this.prisma.systemSetting.findMany();
    const map = new Map<string, string>();
    for (const row of settingsRows) {
      map.set(row.key, row.value);
    }

    return {
      inventory: {
        lowStockThreshold: parseInt(map.get('inventory.lowStockThreshold') || '5', 10),
      },
      delivery: {
        senderName: map.get('delivery.senderName') || 'PT Alssa Logistics Indonesia',
        senderAddress:
          map.get('delivery.senderAddress') ||
          'Jl. Mulawarman No. 23, Balikpapan, Kalimantan Timur',
        senderPhone: map.get('delivery.senderPhone') || '+62 542 876543',
        labelWidth: map.get('delivery.labelWidth') || '100mm',
        labelHeight: map.get('delivery.labelHeight') || '150mm',
      },
    };
  }

  async updateInventorySettings(dto: UpdateInventorySettingsDto, userId: number) {
    const thresholdStr = dto.lowStockThreshold.toString();

    const oldRow = await this.prisma.systemSetting.findUnique({
      where: { key: 'inventory.lowStockThreshold' },
    });
    const oldValue = oldRow?.value || '5';

    await this.prisma.systemSetting.upsert({
      where: { key: 'inventory.lowStockThreshold' },
      create: {
        key: 'inventory.lowStockThreshold',
        value: thresholdStr,
        description: 'Global threshold for bulk stock low-level indicators',
      },
      update: {
        value: thresholdStr,
      },
    });

    await this.auditLogsService.logAction(
      userId,
      'UPDATE',
      'system_settings',
      null,
      {
        oldValues: { lowStockThreshold: parseInt(oldValue, 10) },
        newValues: { lowStockThreshold: dto.lowStockThreshold },
      },
    );

    return this.getAllSettings();
  }

  async updateDeliverySettings(dto: UpdateDeliverySettingsDto, userId: number) {
    const fields: Array<{ key: string; value: string | undefined; desc: string }> = [
      { key: 'delivery.senderName', value: dto.senderName?.trim(), desc: 'Default Sender Company Name' },
      { key: 'delivery.senderAddress', value: dto.senderAddress?.trim(), desc: 'Default Sender Dispatch Address' },
      { key: 'delivery.senderPhone', value: dto.senderPhone?.trim(), desc: 'Default Sender Phone' },
      { key: 'delivery.labelWidth', value: dto.labelWidth?.trim(), desc: 'Default Shipping Label Width' },
      { key: 'delivery.labelHeight', value: dto.labelHeight?.trim(), desc: 'Default Shipping Label Height' },
    ];

    const oldSettings = await this.getAllSettings();

    for (const f of fields) {
      if (f.value !== undefined && f.value !== '') {
        await this.prisma.systemSetting.upsert({
          where: { key: f.key },
          create: {
            key: f.key,
            value: f.value,
            description: f.desc,
          },
          update: {
            value: f.value,
          },
        });
      }
    }

    const newSettings = await this.getAllSettings();

    await this.auditLogsService.logAction(
      userId,
      'UPDATE',
      'system_settings',
      null,
      {
        oldValues: oldSettings.delivery,
        newValues: newSettings.delivery,
      },
    );

    return newSettings;
  }
}
