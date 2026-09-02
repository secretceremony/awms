import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateCityDto } from './dto/create-city.dto.js';
import { UpdateCityDto } from './dto/update-city.dto.js';
import { CitiesPaginationDto } from './dto/cities-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(paginationDto: CitiesPaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: any = {};

    if (paginationDto.status === 'active') {
      where.isActive = true;
    } else if (paginationDto.status === 'inactive') {
      where.isActive = false;
    }

    if (paginationDto.search) {
      const s = paginationDto.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.city.count({ where }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }
    return city;
  }

  async create(createCityDto: CreateCityDto, userId: number) {
    const name = createCityDto.name.trim();
    const code = createCityDto.code.trim().toUpperCase();

    // Case-insensitive name uniqueness check
    const existingName = await this.prisma.city.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new BadRequestException(`City with name "${name}" already exists`);
    }

    // Case-insensitive code uniqueness check
    const existingCode = await this.prisma.city.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    });
    if (existingCode) {
      throw new BadRequestException(`City with code "${code}" already exists`);
    }

    const city = await this.prisma.city.create({
      data: {
        name,
        code,
        isActive: true,
      },
    });

    await this.auditLogsService.logAction(
      userId,
      'CREATE',
      'cities',
      city.id,
      { newValues: { name: city.name, code: city.code, isActive: city.isActive } },
    );

    return city;
  }

  async update(id: number, updateCityDto: UpdateCityDto, userId: number) {
    const city = await this.findOne(id);
    const oldValues = { name: city.name, code: city.code, isActive: city.isActive };

    const name = updateCityDto.name?.trim();
    const code = updateCityDto.code?.trim().toUpperCase();

    if (name && name.toLowerCase() !== city.name.toLowerCase()) {
      const existingName = await this.prisma.city.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingName) {
        throw new BadRequestException(`City with name "${name}" already exists`);
      }
    }

    if (code && code.toUpperCase() !== city.code.toUpperCase()) {
      const existingCode = await this.prisma.city.findFirst({
        where: { code: { equals: code, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingCode) {
        throw new BadRequestException(`City with code "${code}" already exists`);
      }
    }

    const updated = await this.prisma.city.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
      },
    });

    await this.auditLogsService.logAction(
      userId,
      'UPDATE',
      'cities',
      id,
      {
        oldValues,
        newValues: { name: updated.name, code: updated.code, isActive: updated.isActive },
      },
    );

    return updated;
  }

  async deactivate(id: number, userId: number) {
    const city = await this.findOne(id);
    if (!city.isActive) {
      throw new BadRequestException(`City "${city.name}" is already inactive`);
    }

    const updated = await this.prisma.city.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogsService.logAction(
      userId,
      'DEACTIVATE',
      'cities',
      id,
      { oldValues: { isActive: true }, newValues: { isActive: false } },
    );

    return updated;
  }

  async reactivate(id: number, userId: number) {
    const city = await this.findOne(id);
    if (city.isActive) {
      throw new BadRequestException(`City "${city.name}" is already active`);
    }

    const updated = await this.prisma.city.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogsService.logAction(
      userId,
      'REACTIVATE',
      'cities',
      id,
      { oldValues: { isActive: false }, newValues: { isActive: true } },
    );

    return updated;
  }

  async delete(id: number, userId: number) {
    const city = await this.findOne(id);

    // Check if referenced by any warehouse
    const warehouseCount = await this.prisma.warehouse.count({
      where: {
        OR: [
          { city: { equals: city.name, mode: 'insensitive' } },
          { cityCode: { equals: city.code, mode: 'insensitive' } },
        ],
      },
    });

    if (warehouseCount > 0) {
      throw new BadRequestException(
        `Cannot delete city "${city.name}" because it is currently assigned to ${warehouseCount} warehouse(s). Deactivate the city instead.`,
      );
    }

    await this.prisma.city.delete({ where: { id } });

    await this.auditLogsService.logAction(
      userId,
      'DELETE',
      'cities',
      id,
      { oldValues: { name: city.name, code: city.code } },
    );

    return { message: `City "${city.name}" deleted successfully.` };
  }
}
