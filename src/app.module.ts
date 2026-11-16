import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { PortfolioController } from './portfolio/portfolio.controller';
import { OrdersController } from './orders/orders.controller';
import { InstrumentsController } from './instruments/instruments.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
  ],
  controllers: [
    HealthController,
    PortfolioController,
    OrdersController,
    InstrumentsController,
  ],
  providers: [],
})
export class AppModule {}
