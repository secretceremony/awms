import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectsPaginationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;
}
