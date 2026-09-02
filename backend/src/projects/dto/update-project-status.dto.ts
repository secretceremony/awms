import { IsEnum, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ProjectStatus } from '../../../generated/prisma/client.js';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus, { message: 'Status must be ACTIVE or COMPLETED' })
  @IsNotEmpty({ message: 'Status is required' })
  status!: ProjectStatus;

  @IsOptional()
  @IsBoolean()
  confirmRemainingStock?: boolean;
}
