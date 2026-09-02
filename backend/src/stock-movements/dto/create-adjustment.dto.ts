import {
  IsOptional,
  IsString,
  IsInt,
  IsPositive,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SerialAdjustmentDetailDto {
  @IsString()
  @IsNotEmpty({ message: 'Serial number is required' })
  serialNumber!: string;

  @IsOptional()
  @IsString()
  newCondition?: string;

  @IsOptional()
  @IsString()
  newState?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAdjustmentDto {
  @IsOptional()
  @IsString()
  movementDate?: string;

  @IsInt()
  @IsPositive({ message: 'Valid warehouse is required' })
  warehouseId!: number;

  @IsInt()
  @IsPositive({ message: 'Valid item is required' })
  itemId!: number;

  @IsString()
  @IsNotEmpty({ message: 'Adjustment reason is required' })
  reason!: string;

  // For BULK items (signed quantity e.g. +3 or -2)
  @IsOptional()
  @IsInt()
  adjustmentQty?: number;

  // For SERIALIZED items
  @IsOptional()
  @ValidateNested()
  @Type(() => SerialAdjustmentDetailDto)
  serialDetail?: SerialAdjustmentDetailDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialAdjustmentDetailDto)
  serials?: SerialAdjustmentDetailDto[];
}
