import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(100)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Client / Company is required' })
  clientId?: number;

  // Backward compatibility alias for customerId
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientContactId?: number | null;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255)
  location!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  siteCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
