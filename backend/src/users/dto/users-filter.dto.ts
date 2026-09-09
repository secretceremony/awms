import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Role } from '../../../generated/prisma/client.js';

export class UsersFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
