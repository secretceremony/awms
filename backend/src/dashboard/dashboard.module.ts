import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { PrismaModule } from '../prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
