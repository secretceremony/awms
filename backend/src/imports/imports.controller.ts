import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImportsService } from './imports.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('templates/:type')
  async downloadTemplate(
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    if (type !== 'initial-stock' && type !== 'incoming' && type !== 'outgoing') {
      throw new BadRequestException('Invalid template type. Must be initial-stock, incoming, or outgoing.');
    }

    const workbook = await this.importsService.generateTemplate(type);
    const filename = `AWMS_Import_Template_${type}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('importType') importType: 'INITIAL_STOCK' | 'INCOMING' | 'OUTGOING',
  ) {
    if (!file) {
      throw new BadRequestException('No Excel file uploaded');
    }
    if (!importType || (importType !== 'INITIAL_STOCK' && importType !== 'INCOMING' && importType !== 'OUTGOING')) {
      throw new BadRequestException('Invalid import type.');
    }

    return this.importsService.validateImportFile(file.buffer, importType, file.originalname);
  }

  @Post('confirm')
  async confirmImport(
    @CurrentUser() user: AuthenticatedUser,
    @Body('importType') importType: 'INITIAL_STOCK' | 'INCOMING' | 'OUTGOING',
    @Body('rows') rows: any[],
    @Body('filename') filename?: string,
  ) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No rows provided for import');
    }

    return this.importsService.confirmImport(user.id, importType, rows, filename || 'import.xlsx');
  }
}
