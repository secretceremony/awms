import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Unit name is required' })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  symbol?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
