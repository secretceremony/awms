import {
  IsOptional,
  IsString,
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementItemDto } from './create-stock-movement.dto.js';

export class CreateOutgoingDto {
  @IsNotEmpty({ message: 'Movement date is required' })
  @IsDateString()
  movementDate!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Project is required' })
  projectId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sourceWarehouseId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deliveryOrderId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  @IsNotEmpty({ message: 'At least one item is required for outgoing stock' })
  items!: StockMovementItemDto[];
}
