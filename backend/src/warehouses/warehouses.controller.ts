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
import { WarehousesService } from './warehouses.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { WarehousesPaginationDto } from './dto/warehouses-pagination.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../items/items.controller.js';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  create(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.create(createWarehouseDto, user.id);
  }

  @Get()
  findAll(@Query() paginationDto: WarehousesPaginationDto) {
    return this.warehousesService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.findOne(id);
  }

  @Get(':id/stocks')
  getStocks(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.warehousesService.getStocks(id, paginationDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.update(id, updateWarehouseDto, user.id);
  }

  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.deactivate(id, user.id);
  }
}
