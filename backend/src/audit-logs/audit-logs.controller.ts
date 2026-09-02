import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() filterDto: AuditLogFilterDto) {
    return this.auditLogsService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogsService.findOne(id);
  }
}
