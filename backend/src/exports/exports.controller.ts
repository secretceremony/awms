import { Controller, Get, Query, ParseIntPipe, BadRequestException, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportsService } from './exports.service.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Controller('exports')
@UseGuards(RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('workbook')
  async exportWorkbook(@Res() res: Response) {
    const workbook = await this.exportsService.generateWorkbook();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `AWMS_Data_Export_${year}-${month}-${day}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('monthly-report')
  async exportMonthlyReport(
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @Res() res: Response,
  ) {
    if (!month || month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (!year || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    const workbook = await this.exportsService.generateMonthlyReport(month, year);
    const monthStr = String(month).padStart(2, '0');
    const filename = `AWMS_Monthly_Report_${year}-${monthStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
