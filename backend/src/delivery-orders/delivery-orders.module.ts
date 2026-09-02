import { Module } from '@nestjs/common';
import { DeliveryOrdersService } from './delivery-orders.service.js';
import { DeliveryOrdersController } from './delivery-orders.controller.js';
import { PrismaModule } from '../prisma.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersService],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
