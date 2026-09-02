import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service.js';
import { CitiesController } from './cities.controller.js';
import { PrismaModule } from '../prisma.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
