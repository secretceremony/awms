import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import {
  UpdateInventorySettingsDto,
  UpdateDeliverySettingsDto,
} from './dto/update-settings.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Controller('settings')
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Patch('inventory')
  @Roles('ADMIN_LOGISTICS')
  updateInventorySettings(
    @Body() dto: UpdateInventorySettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateInventorySettings(dto, user.id);
  }

  @Patch('delivery')
  @Roles('ADMIN_LOGISTICS')
  updateDeliverySettings(
    @Body() dto: UpdateDeliverySettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateDeliverySettings(dto, user.id);
  }
}
