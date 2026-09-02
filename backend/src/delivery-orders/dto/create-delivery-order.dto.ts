import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Valid item ID is required' })
  itemId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;

  @IsOptional()
  @IsString()
  pic?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CreateDeliveryOrderDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Valid Project ID is required' })
  projectId!: number;

  @IsNotEmpty({ message: 'DO Date is required' })
  @IsDateString({}, { message: 'Invalid DO Date format' })
  date!: string;

  @IsNotEmpty({ message: 'Activity is required' })
  @IsString()
  activity!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'Items list is required' })
  @ValidateNested({ each: true })
  @Type(() => DeliveryOrderItemDto)
  @IsNotEmpty({ message: 'At least one item is required in Delivery Order' })
  items!: DeliveryOrderItemDto[];
}
