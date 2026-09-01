import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255)
  location!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  jobNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  attnName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  leaderName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  activity?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
