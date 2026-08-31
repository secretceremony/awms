import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty({ message: 'Warehouse name is required' })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255)
  location!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
