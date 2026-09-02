import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventorySettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Low stock threshold must be at least 1' })
  lowStockThreshold!: number;
}

export class UpdateDeliverySettingsDto {
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
  @IsString()
  labelWidth?: string;

  @IsOptional()
  @IsString()
  labelHeight?: string;
}
