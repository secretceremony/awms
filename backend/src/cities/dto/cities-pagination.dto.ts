import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class CitiesPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive' = 'all';
}
