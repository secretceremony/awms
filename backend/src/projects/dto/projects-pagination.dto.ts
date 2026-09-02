import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ProjectsPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string; // 'ACTIVE' | 'COMPLETED' | 'all'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
