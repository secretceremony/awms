import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CustomersPaginationDto } from './dto/customers-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, userId: number) {
    const name = createCustomerDto.name.trim();
    const code = createCustomerDto.code?.trim().toUpperCase() || null;
    const attnName = createCustomerDto.attnName?.trim() || null;
    const phone = createCustomerDto.phone?.trim() || null;
    const address = createCustomerDto.address?.trim() || null;

    if (code) {
      const existing = await this.prisma.customer.findUnique({
        where: { code },
      });
      if (existing) {
        throw new BadRequestException(
          `Customer with code "${code}" already exists`,
        );
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        name,
        code,
        attnName,
        phone,
        address,
        isActive: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'customers', customer.id, {
      newValues: { name, code, attnName, phone, address, isActive: true },
    });

    return customer;
  }

  async findAll(
    paginationDto: CustomersPaginationDto,
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const status = paginationDto.status;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.CustomerWhereInput = {};

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { attnName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(
    id: number,
    updateCustomerDto: UpdateCustomerDto,
    userId: number,
  ) {
    const customer = await this.findOne(id);

    const name = updateCustomerDto.name?.trim();
    const code =
      updateCustomerDto.code !== undefined
        ? updateCustomerDto.code?.trim().toUpperCase() || null
        : undefined;
    const attnName =
      updateCustomerDto.attnName !== undefined
        ? updateCustomerDto.attnName?.trim() || null
        : undefined;
    const phone =
      updateCustomerDto.phone !== undefined
        ? updateCustomerDto.phone?.trim() || null
        : undefined;
    const address =
      updateCustomerDto.address !== undefined
        ? updateCustomerDto.address?.trim() || null
        : undefined;

    if (code && code !== customer.code) {
      const existing = await this.prisma.customer.findUnique({
        where: { code },
      });
      if (existing) {
        throw new BadRequestException(
          `Customer with code "${code}" already exists`,
        );
      }
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(attnName !== undefined && { attnName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'customers', id, {
      oldValues: {
        name: customer.name,
        code: customer.code,
        attnName: customer.attnName,
        phone: customer.phone,
        address: customer.address,
      },
      newValues: {
        name: updatedCustomer.name,
        code: updatedCustomer.code,
        attnName: updatedCustomer.attnName,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
      },
    });

    return updatedCustomer;
  }

  async deactivate(id: number, userId: number) {
    const customer = await this.findOne(id);

    if (!customer.isActive) {
      throw new BadRequestException(
        `Customer "${customer.name}" is already inactive`,
      );
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'customers', id, {
      oldValues: { name: customer.name, isActive: true },
      newValues: { name: customer.name, isActive: false },
    });

    return updatedCustomer;
  }
}
