import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import {
  UpdateInventorySettingsDto,
  UpdateDeliverySettingsDto,
  UpdateCompanySettingsDto,
} from './dto/update-settings.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Controller('settings')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Patch('company')
  updateCompanySettings(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateCompanySettings(dto, user.id);
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
