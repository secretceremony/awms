import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UnitsModule } from './units/units.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { CustomersModule } from './customers/customers.module';
import { ProjectsModule } from './projects/projects.module';
import { ItemsModule } from './items/items.module';
import { ItemSerialsModule } from './item-serials/item-serials.module';
import { StocksModule } from './stocks/stocks.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { DeliveryOrdersModule } from './delivery-orders/delivery-orders.module';
import { ShippingLabelsModule } from './shipping-labels/shipping-labels.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { CitiesModule } from './cities/cities.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { ImportsModule } from './imports/imports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    UnitsModule,
    CitiesModule,
    WarehousesModule,
    CustomersModule,
    ProjectsModule,
    ItemsModule,
    ItemSerialsModule,
    StocksModule,
    StockMovementsModule,
    DeliveryOrdersModule,
    ShippingLabelsModule,
    AuditLogsModule,
    SettingsModule,
    DashboardModule,
    ExportsModule,
    ImportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
