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
  @IsPositive({ message: 'User / Company is required' })
  customerId!: number;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255)
  location!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  attnName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  leaderName?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
