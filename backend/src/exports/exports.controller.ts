import { Controller, Get, Res, UseGuards } from '@nestjs/common';
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
}
