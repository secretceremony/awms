import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DeliveryOrdersService } from './delivery-orders.service.js';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto.js';
import { UpdateDeliveryOrderDto } from './dto/update-delivery-order.dto.js';
import { DeliveryOrdersPaginationDto } from './dto/delivery-orders-pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('delivery-orders')
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrdersService: DeliveryOrdersService) {}

  @Post('draft')
  createDraft(
    @Body() createDto: CreateDeliveryOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.deliveryOrdersService.createDraft(user.id, createDto);
  }

  @Get()
  findAll(@Query() paginationDto: DeliveryOrdersPaginationDto) {
    return this.deliveryOrdersService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryOrdersService.findOne(id);
  }

  @Patch(':id/draft')
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeliveryOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.deliveryOrdersService.updateDraft(id, user.id, updateDto);
  }

  @Delete(':id/draft')
  cancelDraft(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.deliveryOrdersService.cancelDraft(id, user.id);
  }

  @Post(':id/issue')
  issueDeliveryOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.deliveryOrdersService.issueDeliveryOrder(id, user.id);
  }

  @Post(':id/print')
  logPrint(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.deliveryOrdersService.logPrint(id, user.id);
  }
}
