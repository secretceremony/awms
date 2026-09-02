import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import {
  UpdateInventorySettingsDto,
  UpdateDeliverySettingsDto,
} from './dto/update-settings.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Patch('inventory')
  updateInventorySettings(
    @Body() dto: UpdateInventorySettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateInventorySettings(dto, user.id);
  }

  @Patch('delivery')
  updateDeliverySettings(
    @Body() dto: UpdateDeliverySettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateDeliverySettings(dto, user.id);
  }
}
