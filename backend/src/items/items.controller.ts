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
import { Roles } from '../common/decorators/roles.decorator.js';

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
  @Roles('SUPER_ADMIN', 'ADMIN')
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

  @Get(':id/balances')
  getItemBalances(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.getItemBalances(id);
  }

  @Get(':id/serials')
  getItemSerials(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.itemsService.getItemSerials(id, paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.update(id, updateItemDto, user.id);
  }

  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.deactivate(id, user.id);
  }
}
export type { AuthenticatedUser };
