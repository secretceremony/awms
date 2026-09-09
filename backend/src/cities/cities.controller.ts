import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CitiesService } from './cities.service.js';
import { CreateCityDto } from './dto/create-city.dto.js';
import { UpdateCityDto } from './dto/update-city.dto.js';
import { CitiesPaginationDto } from './dto/cities-pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  findAll(@Query() paginationDto: CitiesPaginationDto) {
    return this.citiesService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.citiesService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(@Body() createCityDto: CreateCityDto, @CurrentUser() user: any) {
    return this.citiesService.create(createCityDto, user.id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCityDto: UpdateCityDto,
    @CurrentUser() user: any,
  ) {
    return this.citiesService.update(id, updateCityDto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.citiesService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.citiesService.reactivate(id, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.citiesService.delete(id, user.id);
  }
}
