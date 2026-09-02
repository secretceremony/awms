import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Unit name is required' })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Symbol is required' })
  @MaxLength(20)
  symbol!: string;
}
