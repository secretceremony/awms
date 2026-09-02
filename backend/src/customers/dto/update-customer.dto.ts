import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  attnName?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string | null;
}
