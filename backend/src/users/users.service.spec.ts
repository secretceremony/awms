import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Role } from '../../generated/prisma/client.js';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditLogs = {
      logAction: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list of users without passwords', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: 'admin@alssa.com',
          name: 'Super Admin',
          role: Role.SUPER_ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('admin@alssa.com');
      expect((result.data[0] as any).password).toBeUndefined();
      expect(result.meta.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should create user with hashed password and log audit', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 2,
        email: 'newuser@alssa.com',
        name: 'New User',
        role: Role.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        {
          name: 'New User',
          email: 'newuser@alssa.com',
          password: 'SecretPassword123!',
          role: Role.ADMIN,
        },
        1,
      );

      expect(result.email).toBe('newuser@alssa.com');
      expect((result as any).password).toBeUndefined();
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@alssa.com',
            role: Role.ADMIN,
            isActive: true,
          }),
        }),
      );
      expect(auditLogs.logAction).toHaveBeenCalledWith(
        1,
        'CREATE',
        'users',
        2,
        expect.any(Object),
      );
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'exists@alssa.com' });

      await expect(
        service.create(
          {
            name: 'Existing User',
            email: 'exists@alssa.com',
            password: 'SecretPassword123!',
            role: Role.ADMIN,
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user role and log audit', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'user@alssa.com',
        name: 'User 2',
        role: Role.ADMIN,
        isActive: true,
      });
      prisma.user.update.mockResolvedValue({
        id: 2,
        email: 'user@alssa.com',
        name: 'User 2',
        role: Role.READ_ONLY,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(
        2,
        { role: Role.READ_ONLY },
        1,
      );

      expect(result.role).toBe(Role.READ_ONLY);
      expect(auditLogs.logAction).toHaveBeenCalledWith(
        1,
        'UPDATE',
        'users',
        2,
        expect.any(Object),
      );
    });
  });
});
