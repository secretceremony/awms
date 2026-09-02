import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  attnName?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  leaderName?: string | null;

  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @IsOptional()
  @IsDateString()
  endedAt?: string | null;
}
