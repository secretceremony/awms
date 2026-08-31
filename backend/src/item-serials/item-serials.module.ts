import { Module } from '@nestjs/common';
import { ItemSerialsController } from './item-serials.controller';
import { ItemSerialsService } from './item-serials.service';

@Module({
  controllers: [ItemSerialsController],
  providers: [ItemSerialsService],
})
export class ItemSerialsModule {}
