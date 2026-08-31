import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsPaginationDto } from './dto/units-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class UnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createUnitDto: CreateUnitDto, userId: number) {
    const name = createUnitDto.name.trim();
    const symbol = createUnitDto.symbol?.trim();
    const description = createUnitDto.description?.trim();

    // Unique check
    const existing = await this.prisma.unit.findUnique({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('Unit name already exists');
    }

    const unit = await this.prisma.unit.create({
      data: {
        name,
        symbol,
        description,
        isActive: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'units', unit.id, {
      newValues: { name, symbol, description, isActive: true },
    });

    return unit;
  }

  async findAll(
    paginationDto: UnitsPaginationDto,
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const status = paginationDto.status; // active, inactive, all
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.UnitWhereInput = {};

    // Filter by status
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { symbol: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.unit.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto, userId: number) {
    const unit = await this.findOne(id);

    const name = updateUnitDto.name?.trim();
    const symbol = updateUnitDto.symbol?.trim();
    const description = updateUnitDto.description?.trim();

    // Check unique name if updated
    if (name && name !== unit.name) {
      const existing = await this.prisma.unit.findUnique({
        where: { name },
      });
      if (existing) {
        throw new BadRequestException('Unit name already exists');
      }
    }

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(symbol !== undefined && { symbol }),
        ...(description !== undefined && { description }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'units', id, {
      oldValues: {
        name: unit.name,
        symbol: unit.symbol,
        description: unit.description,
      },
      newValues: {
        name: updatedUnit.name,
        symbol: updatedUnit.symbol,
        description: updatedUnit.description,
      },
    });

    return updatedUnit;
  }

  async deactivate(id: number, userId: number) {
    const unit = await this.findOne(id);

    if (!unit.isActive) {
      throw new BadRequestException(`Unit ${unit.name} is already inactive`);
    }

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'units', id, {
      oldValues: { name: unit.name, isActive: true },
      newValues: { name: unit.name, isActive: false },
    });

    return updatedUnit;
  }
}
