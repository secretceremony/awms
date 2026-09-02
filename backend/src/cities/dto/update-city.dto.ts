import { IsOptional, IsString, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'City code must be exactly 3 uppercase letters' })
  @Matches(/^[A-Z]{3}$/, { message: 'City code must be exactly 3 uppercase letters (e.g. BPN, JKT)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code?: string;
}
