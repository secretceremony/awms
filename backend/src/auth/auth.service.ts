import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import bcrypt from 'bcryptjs';
import { Response } from 'express';

import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<UserPayload> {
    const normalizedEmail = loginDto.email?.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async login(
    user: UserPayload,
    response: Response,
  ): Promise<{ user: UserPayload }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction, // HTTPS required in production
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    await this.auditLogsService.logAction(user.id, 'LOGIN', 'users', user.id, {
      email: user.email,
      name: user.name,
    });

    return { user };
  }

  async logout(user: UserPayload | null, response: Response): Promise<{ message: string }> {
    const isProduction = process.env.NODE_ENV === 'production';

    response.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    if (user?.id) {
      await this.auditLogsService.logAction(user.id, 'LOGOUT', 'users', user.id, {
        email: user.email,
        name: user.name,
      });
    }

    return { message: 'Logged out successfully' };
  }
}
