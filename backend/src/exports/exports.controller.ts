import { Controller, Get, Query, ParseIntPipe, BadRequestException, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportsService } from './exports.service.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

@Controller('exports')
@UseGuards(RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('workbook')
  async exportWorkbook(@Res() res: Response, @CurrentUser() user?: AuthenticatedUser) {
    const generatedBy = user?.name || 'Roberta Pungki';
    const workbook = await this.exportsService.generateWorkbook(generatedBy);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `AWMS_Data_Export_${year}-${month}-${day}_${hours}${minutes}.xlsx`;

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
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!month || month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (!year || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    const generatedBy = user?.name || 'Roberta Pungki';
    const workbook = await this.exportsService.generateMonthlyReport(month, year, generatedBy);
    const monthStr = String(month).padStart(2, '0');
    
    const now = new Date();
    const yearNow = now.getFullYear();
    const monthNow = String(now.getMonth() + 1).padStart(2, '0');
    const dayNow = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `AWMS_Monthly_Report_${year}-${monthStr}_${yearNow}-${monthNow}-${dayNow}_${hours}${minutes}.xlsx`;

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
