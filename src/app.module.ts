import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { PortfolioModule } from './portfolio/portfolio.module';
import { OrdersController } from './orders/orders.controller';
import { InstrumentsModule } from './instruments/instruments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    PortfolioModule,
    InstrumentsModule,
  ],
  controllers: [HealthController, OrdersController],
  providers: [],
})
export class AppModule {}
