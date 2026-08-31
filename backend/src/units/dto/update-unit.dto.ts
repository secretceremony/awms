import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  symbol?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
