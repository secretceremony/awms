import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.auditLogsService.findAll(paginationDto);
  }
}
