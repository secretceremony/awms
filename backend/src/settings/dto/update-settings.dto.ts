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

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  jktOfficeName?: string;

  @IsOptional()
  @IsString()
  jktAddress?: string;

  @IsOptional()
  @IsString()
  jktPhone?: string;

  @IsOptional()
  @IsString()
  jktEmail?: string;

  @IsOptional()
  @IsString()
  bpnOfficeName?: string;

  @IsOptional()
  @IsString()
  bpnAddress?: string;

  @IsOptional()
  @IsString()
  bpnPhone?: string;

  @IsOptional()
  @IsString()
  bpnEmail?: string;
}

