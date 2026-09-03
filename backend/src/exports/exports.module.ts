import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller.js';
import { ExportsService } from './exports.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, PrismaService],
  exports: [ExportsService],
})
export class ExportsModule {}
