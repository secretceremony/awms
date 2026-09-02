import { IsString, IsOptional, MaxLength, IsEmail, IsEnum } from 'class-validator';
import { ClientType } from '../../../generated/prisma/client.js';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEnum(ClientType, { message: 'Client type must be PHM or OTHER' })
  @IsOptional()
  clientType?: ClientType;

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

export { UpdateClientDto as UpdateCustomerDto };
