import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail } from 'class-validator';

export class CreateClientContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Contact name is required' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;
}

export class UpdateClientContactDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string | null;
}
