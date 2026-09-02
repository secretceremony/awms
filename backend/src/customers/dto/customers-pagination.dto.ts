import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ClientsPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string; // 'active' | 'inactive' | 'all'

  @IsOptional()
  @IsString()
  clientType?: string; // 'PHM' | 'OTHER' | 'all'
}

export { ClientsPaginationDto as CustomersPaginationDto };
