import { Module } from '@nestjs/common';
import { ShippingLabelsController } from './shipping-labels.controller';
import { ShippingLabelsService } from './shipping-labels.service';

@Module({
  controllers: [ShippingLabelsController],
  providers: [ShippingLabelsService],
})
export class ShippingLabelsModule {}
