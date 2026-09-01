import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsBoolean } from 'class-validator';
import { TrackingType } from '../../../generated/prisma/client.js';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  modelNumber?: string;

  @IsInt()
  @IsNotEmpty()
  unitId: number;

  @IsEnum(TrackingType)
  @IsNotEmpty()
  trackingType: TrackingType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
