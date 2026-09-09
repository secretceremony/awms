import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersFilterDto } from './dto/users-filter.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('signature')
  getSignature(@Res() res: Response) {
    const { stream, mimeType } = this.usersService.getLogisticsAdminSignature();
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  findAll(@Query() filterDto: UsersFilterDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    return this.usersService.create(createUserDto, user.id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.update(id, updateUserDto, user.id);
  }
}


