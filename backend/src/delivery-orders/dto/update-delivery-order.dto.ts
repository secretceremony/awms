import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryOrderDto } from './create-delivery-order.dto.js';

export class UpdateDeliveryOrderDto extends PartialType(CreateDeliveryOrderDto) {}
