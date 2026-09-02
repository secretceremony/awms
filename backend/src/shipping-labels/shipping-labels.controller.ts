import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ShippingLabelsService } from './shipping-labels.service.js';
import {
  CreateShippingLabelDto,
  UpdateShippingLabelDto,
} from './dto/create-shipping-label.dto.js';
import { ShippingLabelsPaginationDto } from './dto/shipping-labels-pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('shipping-labels')
export class ShippingLabelsController {
  constructor(private readonly shippingLabelsService: ShippingLabelsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createShippingLabelDto: CreateShippingLabelDto,
  ) {
    return this.shippingLabelsService.create(user.id, createShippingLabelDto);
  }

  @Get()
  findAll(@Query() paginationDto: ShippingLabelsPaginationDto) {
    return this.shippingLabelsService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shippingLabelsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() updateShippingLabelDto: UpdateShippingLabelDto,
  ) {
    return this.shippingLabelsService.update(id, user.id, updateShippingLabelDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.shippingLabelsService.remove(id, user.id);
  }

  @Post(':id/print')
  logPrint(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.shippingLabelsService.logPrint(id, user.id);
  }
}
