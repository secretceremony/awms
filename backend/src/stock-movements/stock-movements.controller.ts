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
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { CreateOutgoingDto } from './dto/create-outgoing.dto.js';
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

  @Post('adjustment')
  createAdjustment(
    @Body() adjustmentDto: CreateAdjustmentDto,
    @CurrentUser() user: any,
  ) {
    return this.stockMovementsService.createAdjustment(user.id, adjustmentDto);
  }

  @Post('outgoing')
  createOutgoing(
    @Body() createDto: CreateOutgoingDto,
    @CurrentUser() user: any,
  ) {
    return this.stockMovementsService.createOutgoing(user.id, createDto);
  }

  @Get('available-inventory')
  getAvailableInventory(
    @Query('warehouseId') warehouseId?: number,
    @Query('search') search?: string,
    @Query('trackingType') trackingType?: string,
  ) {
    return this.stockMovementsService.getAvailableInventory({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      search,
      trackingType,
    });
  }

  @Get('outgoing')
  findOutgoingMovements(
    @Query() paginationDto: PaginationDto,
    @Query('warehouseId') warehouseId?: number,
    @Query('projectId') projectId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stockMovementsService.findAllOutgoing({
      ...paginationDto,
      warehouseId,
      projectId,
      dateFrom,
      dateTo,
    });
  }

  @Get('outgoing/:id')
  findOneOutgoing(@Param('id', ParseIntPipe) id: number) {
    return this.stockMovementsService.findOneOutgoing(id);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
    @Query('movementType') movementType?: string,
    @Query('warehouseId') warehouseId?: number,
    @Query('projectId') projectId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stockMovementsService.findAll({
      ...paginationDto,
      type,
      movementType,
      warehouseId,
      projectId,
      dateFrom,
      dateTo,
    });
  }

  @Post('incoming')
  createIncoming(
    @Body() createDto: CreateStockMovementDto,
    @CurrentUser() user: any,
  ) {
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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockMovementsService.findOne(id);
  }
}
