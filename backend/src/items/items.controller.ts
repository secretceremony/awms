import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ItemsService } from './items.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(
    @Body() createItemDto: CreateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.create(createItemDto, user.id);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.itemsService.findAll(paginationDto);
  }

  @Get('check-duplicate')
  checkDuplicate(
    @Query('name') name: string,
    @Query('brand') brand?: string,
    @Query('modelNumber') modelNumber?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.itemsService.checkDuplicate(
      name,
      brand,
      modelNumber,
      excludeId ? parseInt(excludeId, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.update(id, updateItemDto, user.id);
  }

  @Get(':id/serials')
  getItemSerials(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.itemsService.getItemSerials(id, paginationDto);
  }

  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.deactivate(id, user.id);
  }
}
export type { AuthenticatedUser };
