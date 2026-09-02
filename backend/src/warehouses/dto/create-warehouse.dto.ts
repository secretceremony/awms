import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

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
  @IsNotEmpty({ message: 'Location address is required' })
  @MaxLength(255)
  location!: string;
}
