import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsBoolean } from 'class-validator';
import { TrackingType, MaterialType } from '../../../generated/prisma/client.js';

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

  @IsEnum(MaterialType)
  @IsOptional()
  materialType?: MaterialType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
