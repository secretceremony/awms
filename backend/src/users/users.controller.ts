import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('signature')
  getSignature(@Res() res: Response) {
    const { stream, mimeType } = this.usersService.getLogisticsAdminSignature();
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }
}


