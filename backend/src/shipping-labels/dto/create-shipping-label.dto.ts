import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ShippingLabelSourceType {
  DO = 'DO',
  STANDALONE = 'STANDALONE',
}

export class CreateShippingLabelDto {
  @IsEnum(ShippingLabelSourceType)
  @IsOptional()
  sourceType?: ShippingLabelSourceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deliveryOrderId?: number;

  @IsOptional()
  @IsDateString()
  shipDate?: string;

  @IsString()
  @IsNotEmpty({ message: 'Recipient / Company is required' })
  recipientName!: string;

  @IsOptional()
  @IsString()
  attnName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination / Site is required' })
  destination!: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  doNumber?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderAddress?: string;

  @IsOptional()
  @IsString()
  senderPhone?: string;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsString()
  handlingNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  labelWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  labelHeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateShippingLabelDto {
  @IsOptional()
  @IsDateString()
  shipDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Recipient / Company cannot be empty' })
  recipientName?: string;

  @IsOptional()
  @IsString()
  attnName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Destination / Site cannot be empty' })
  destination?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  doNumber?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderAddress?: string;

  @IsOptional()
  @IsString()
  senderPhone?: string;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsString()
  handlingNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  labelWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  labelHeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
