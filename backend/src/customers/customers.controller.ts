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
import { CustomersService } from './customers.service.js';
import { CreateClientDto } from './dto/create-customer.dto.js';
import { UpdateClientDto } from './dto/update-customer.dto.js';
import { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto.js';
import { ClientsPaginationDto } from './dto/customers-pagination.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../items/items.controller.js';

@Controller(['clients', 'customers'])
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.create(createClientDto, user.id);
  }

  @Get()
  findAll(@Query() paginationDto: ClientsPaginationDto) {
    return this.customersService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(id, updateClientDto, user.id);
  }

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.deactivate(id, user.id);
  }

  @Delete(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivateLegacy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.deactivate(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.reactivate(id, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.delete(id, user.id);
  }

  // =================== CLIENT CONTACTS ===================

  @Get(':id/contacts')
  findContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status?: string,
  ) {
    return this.customersService.findContacts(id, status);
  }

  @Post(':id/contacts')
  @Roles('SUPER_ADMIN', 'ADMIN')
  addContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClientContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.addContact(id, dto, user.id);
  }

  @Patch(':id/contacts/:contactId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() dto: UpdateClientContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.updateContact(id, contactId, dto, user.id);
  }

  @Patch(':id/contacts/:contactId/deactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deactivateContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.deactivateContact(id, contactId, user.id);
  }

  @Patch(':id/contacts/:contactId/reactivate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  reactivateContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.reactivateContact(id, contactId, user.id);
  }

  @Delete(':id/contacts/:contactId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deleteContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.deleteContact(id, contactId, user.id);
  }
}
