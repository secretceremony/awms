import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsPaginationDto } from './dto/units-pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../items/items.controller.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(
    @Body() createUnitDto: CreateUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.create(createUnitDto, user.id);
  }

  @Get()
  findAll(@Query() paginationDto: UnitsPaginationDto) {
    return this.unitsService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnitDto: UpdateUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.update(id, updateUnitDto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.deactivate(id, user.id);
  }

  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivateLegacy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.reactivate(id, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitsService.delete(id, user.id);
  }
}
