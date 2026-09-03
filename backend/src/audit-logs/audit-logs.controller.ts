import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles('ADMIN_LOGISTICS')
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
