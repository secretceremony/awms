import { Module } from '@nestjs/common';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
