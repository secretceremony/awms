import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '../../../generated/prisma/client.js';

export class StockMovementItemDto {
  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CreateStockMovementDto {
  @IsEnum(MovementType, { message: 'Invalid movement type' })
  movementType!: MovementType;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sourceWarehouseId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  destinationWarehouseId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  projectId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  @IsNotEmpty({ message: 'Items array cannot be empty' })
  items!: StockMovementItemDto[];
}
