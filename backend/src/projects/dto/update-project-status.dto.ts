import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectStatus } from '../../../generated/prisma/client.js';

export class UpdateProjectStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(ProjectStatus, {
    message: 'Status must be one of: ACTIVE, COMPLETED, ARCHIVED',
  })
  status!: ProjectStatus;
}
