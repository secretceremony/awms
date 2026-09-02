import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType } from '../../../generated/prisma/client.js';

export class PrimaryContactDto {
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

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(100)
  name!: string;

  @IsEnum(ClientType, { message: 'Client type must be PHM or OTHER' })
  @IsNotEmpty({ message: 'Client type is required' })
  clientType!: ClientType;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrimaryContactDto)
  primaryContact?: PrimaryContactDto;
}

export { CreateClientDto as CreateCustomerDto };
