import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import {
  UpdateInventorySettingsDto,
  UpdateDeliverySettingsDto,
  UpdateCompanySettingsDto,
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
      company: {
        companyName: map.get('company.name') || 'PT ALSSA Corporindo',
        jktOfficeName: map.get('company.jktOfficeName') || 'Head Office (Jakarta)',
        jktAddress:
          map.get('company.jktAddress') ||
          'Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3, RT 002 / RW 001, Tanjung Barat, Jagakarsa, Jakarta Selatan, DKI Jakarta 12530',
        jktPhone: map.get('company.jktPhone') || '+6221 8010035 / +6221 8010033',
        jktEmail: map.get('company.jktEmail') || 'info@alssacorp.co.id',
        bpnOfficeName: map.get('company.bpnOfficeName') || 'Branch Office (Balikpapan)',
        bpnAddress:
          map.get('company.bpnAddress') ||
          'Balikpapan Baru, Cluster Orlando Blok DB No. 3, Balikpapan, Kalimantan Timur 76125',
        bpnPhone: map.get('company.bpnPhone') || '+6221 8010035',
        bpnEmail: map.get('company.bpnEmail') || 'info@alssacorp.co.id',
      },
      inventory: {
        lowStockThreshold: parseInt(map.get('inventory.lowStockThreshold') || '5', 10),
      },
      delivery: {
        senderName: map.get('delivery.senderName') || 'PT ALSSA Corporindo',
        senderAddress:
          map.get('delivery.senderAddress') ||
          'Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3, Jakarta Selatan',
        senderPhone: map.get('delivery.senderPhone') || '+6221 8010035',
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

  async updateCompanySettings(dto: UpdateCompanySettingsDto, userId: number) {
    const fields: Array<{ key: string; value: string | undefined; desc: string }> = [
      { key: 'company.name', value: dto.companyName?.trim(), desc: 'Company Legal Name' },
      { key: 'company.jktOfficeName', value: dto.jktOfficeName?.trim(), desc: 'Jakarta Office Title' },
      { key: 'company.jktAddress', value: dto.jktAddress?.trim(), desc: 'Jakarta Head Office Address' },
      { key: 'company.jktPhone', value: dto.jktPhone?.trim(), desc: 'Jakarta Office Phone' },
      { key: 'company.jktEmail', value: dto.jktEmail?.trim(), desc: 'Jakarta Office Email' },
      { key: 'company.bpnOfficeName', value: dto.bpnOfficeName?.trim(), desc: 'Balikpapan Office Title' },
      { key: 'company.bpnAddress', value: dto.bpnAddress?.trim(), desc: 'Balikpapan Branch Office Address' },
      { key: 'company.bpnPhone', value: dto.bpnPhone?.trim(), desc: 'Balikpapan Office Phone' },
      { key: 'company.bpnEmail', value: dto.bpnEmail?.trim(), desc: 'Balikpapan Office Email' },
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
        oldValues: oldSettings.company,
        newValues: newSettings.company,
      },
    );

    return newSettings;
  }
}

