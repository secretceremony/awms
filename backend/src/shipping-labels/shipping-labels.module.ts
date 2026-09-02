import { Module } from '@nestjs/common';
import { ShippingLabelsController } from './shipping-labels.controller.js';
import { ShippingLabelsService } from './shipping-labels.service.js';
import { PrismaModule } from '../prisma.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [PrismaModule, AuditLogsModule, SettingsModule],
  controllers: [ShippingLabelsController],
  providers: [ShippingLabelsService],
  exports: [ShippingLabelsService],
})
export class ShippingLabelsModule {}
