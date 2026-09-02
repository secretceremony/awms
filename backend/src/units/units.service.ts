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
    const symbol = createUnitDto.symbol.trim().toLowerCase();

    // Case-insensitive name check (Rule 24)
    const existingName = await this.prisma.unit.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new BadRequestException(`Unit with name "${name}" already exists`);
    }

    // Case-insensitive symbol check (Rule 24)
    const existingSymbol = await this.prisma.unit.findFirst({
      where: { symbol: { equals: symbol, mode: 'insensitive' } },
    });
    if (existingSymbol) {
      throw new BadRequestException(`Unit with symbol "${symbol}" already exists`);
    }

    const unit = await this.prisma.unit.create({
      data: {
        name,
        symbol,
        isActive: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'units', unit.id, {
      newValues: { name, symbol, isActive: true },
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

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

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
    const symbol = updateUnitDto.symbol ? updateUnitDto.symbol.trim().toLowerCase() : undefined;

    // Check unique name if updated
    if (name && name.toLowerCase() !== unit.name.toLowerCase()) {
      const existingName = await this.prisma.unit.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingName) {
        throw new BadRequestException(`Unit with name "${name}" already exists`);
      }
    }

    // Check unique symbol if updated
    if (symbol && symbol !== unit.symbol) {
      const existingSymbol = await this.prisma.unit.findFirst({
        where: { symbol: { equals: symbol, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingSymbol) {
        throw new BadRequestException(`Unit with symbol "${symbol}" already exists`);
      }
    }

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(symbol !== undefined && { symbol }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'units', id, {
      oldValues: {
        name: unit.name,
        symbol: unit.symbol,
      },
      newValues: {
        name: updatedUnit.name,
        symbol: updatedUnit.symbol,
      },
    });

    return updatedUnit;
  }

  async deactivate(id: number, userId: number) {
    const unit = await this.findOne(id);

    if (!unit.isActive) {
      throw new BadRequestException(`Unit "${unit.name}" is already inactive`);
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

  async reactivate(id: number, userId: number) {
    const unit = await this.findOne(id);

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogs.logAction(userId, 'REACTIVATE', 'units', id, {
      oldValues: { name: unit.name, isActive: false },
      newValues: { name: unit.name, isActive: true },
    });

    return updatedUnit;
  }

  async delete(id: number, userId: number) {
    const unit = await this.findOne(id);

    // Rule 25: Delete only if no Item references it
    const itemCount = await this.prisma.item.count({
      where: { unitId: id },
    });

    if (itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete unit "${unit.name}" because it is currently assigned to ${itemCount} item(s). You may deactivate it instead.`,
      );
    }

    await this.prisma.unit.delete({ where: { id } });

    await this.auditLogs.logAction(userId, 'DELETE', 'units', id, {
      oldValues: {
        name: unit.name,
        symbol: unit.symbol,
      },
    });

    return { message: `Unit "${unit.name}" deleted successfully.` };
  }
}
