import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersFilterDto } from './dto/users-filter.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma, Role } from '../../generated/prisma/client.js';

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(filterDto: UsersFilterDto): Promise<PaginatedResult<UserResponse>> {
    const page = Number(filterDto.page) || 1;
    const limit = Number(filterDto.limit) || 10;
    const { skip, take } = getSkipAndTake(page, limit);

    const where: Prisma.UserWhereInput = {};

    if (filterDto.search && filterDto.search.trim()) {
      const q = filterDto.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filterDto.role && filterDto.role !== 'all' && filterDto.role !== 'ALL') {
      where.role = filterDto.role as Role;
    }

    if (filterDto.status && filterDto.status !== 'all' && filterDto.status !== 'ALL') {
      where.isActive = filterDto.status === 'active';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return createPaginationResult(users, total, page, limit);
  }

  async findOne(id: number): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, currentUserId: number): Promise<UserResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException(`User with email "${normalizedEmail}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: dto.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogsService.logAction(currentUserId, 'CREATE', 'users', user.id, {
      newValues: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

    return user;
  }

  async update(id: number, dto: UpdateUserDto, currentUserId: number): Promise<UserResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      dataToUpdate.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        const conflict = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (conflict && conflict.id !== id) {
          throw new ConflictException(`User with email "${normalizedEmail}" already exists`);
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.role !== undefined) {
      // If user is demoting themselves, ensure at least one active SUPER_ADMIN remains
      if (existing.role === Role.SUPER_ADMIN && dto.role !== Role.SUPER_ADMIN) {
        const superAdminCount = await this.prisma.user.count({
          where: { role: Role.SUPER_ADMIN, isActive: true },
        });
        if (superAdminCount <= 1) {
          throw new BadRequestException('Cannot remove the only remaining active SUPER_ADMIN');
        }
      }
      dataToUpdate.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      if (existing.role === Role.SUPER_ADMIN && !dto.isActive) {
        const superAdminCount = await this.prisma.user.count({
          where: { role: Role.SUPER_ADMIN, isActive: true },
        });
        if (superAdminCount <= 1) {
          throw new BadRequestException('Cannot deactivate the only remaining active SUPER_ADMIN');
        }
      }
      dataToUpdate.isActive = dto.isActive;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogsService.logAction(currentUserId, 'UPDATE', 'users', updated.id, {
      oldValues: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        isActive: existing.isActive,
      },
      newValues: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        passwordChanged: !!dto.password,
      },
    });

    return updated;
  }

  getLogisticsAdminSignature(): { stream: fs.ReadStream; mimeType: string } {
    const configuredPath = process.env.LOGISTICS_ADMIN_SIGNATURE_PATH;
    const candidates = [
      configuredPath,
      path.resolve(process.cwd(), '.local-assets/signatures/pungki-signature.png'),
      path.resolve(process.cwd(), '../.local-assets/signatures/pungki-signature.png'),
      path.resolve(process.cwd(), 'TTD_Ibu.png'),
      path.resolve(process.cwd(), '../TTD_Ibu.png'),
    ].filter(Boolean) as string[];

    let resolvedFile: string | null = null;
    for (const candidate of candidates) {
      const fullPath = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        resolvedFile = fullPath;
        break;
      }
    }

    if (!resolvedFile) {
      throw new NotFoundException('Logistics Admin signature file not found');
    }

    const ext = path.extname(resolvedFile).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
    const stream = fs.createReadStream(resolvedFile);
    return { stream, mimeType };
  }
}


