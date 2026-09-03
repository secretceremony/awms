import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { StockMovementsModule } from '../stock-movements/stock-movements.module.js';

@Module({
  imports: [AuditLogsModule, StockMovementsModule],
  controllers: [ImportsController],
  providers: [ImportsService, PrismaService],
  exports: [ImportsService],
})
export class ImportsModule {}
