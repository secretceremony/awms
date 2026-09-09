import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/client.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be SUPER_ADMIN, ADMIN, or READ_ONLY' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
