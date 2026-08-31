import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { IsOptional, IsString } from 'class-validator';

export class CustomersPaginationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  status?: string;
}
