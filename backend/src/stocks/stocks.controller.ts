import { Controller, Get, Query } from '@nestjs/common';
import { StocksService } from './stocks.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  getStockList(
    @Query() paginationDto: PaginationDto,
    @Query('trackingType') trackingType?: string,
    @Query('warehouseId') warehouseId?: number,
  ) {
    return this.stocksService.getStockList({
      ...paginationDto,
      trackingType,
      warehouseId,
    });
  }
}
