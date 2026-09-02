import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail, IsEnum } from 'class-validator';
import { ClientType } from '../../../generated/prisma/client.js';

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
}

export { CreateClientDto as CreateCustomerDto };
