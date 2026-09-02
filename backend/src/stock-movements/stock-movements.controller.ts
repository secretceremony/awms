import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  createMovement(
    @Body() createDto: CreateStockMovementDto,
    @CurrentUser() user: any,
  ) {
    return this.stockMovementsService.createMovement(user.id, createDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
  ) {
    return this.stockMovementsService.findAll({
      ...paginationDto,
      type,
    });
  }

  @Post('incoming')
  createIncoming(
    @Body() createDto: CreateStockMovementDto,
    @CurrentUser() user: any,
  ) {
    // Force incoming type for this endpoint
    createDto.movementType = 'INCOMING' as any;
    return this.stockMovementsService.createMovement(user.id, createDto);
  }

  @Get('incoming')
  findIncomingMovements(
    @Query() paginationDto: PaginationDto,
    @Query('warehouseId') warehouseId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stockMovementsService.findAllIncoming({
      ...paginationDto,
      warehouseId,
      startDate,
      endDate,
    });
  }

  @Get('incoming/:id')
  findOneIncoming(@Param('id', ParseIntPipe) id: number) {
    return this.stockMovementsService.findOneIncoming(id);
  }
}
