import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instrument } from '../database/entities/instrument';
import { Market } from '../database/entities/market';
import { Order } from '../database/entities/order';
import { User } from '../database/entities/user';
import { PortfolioController } from './portfolio.controller';
import { PortfolioMapper } from './portfolio.mapper';
import { PortfolioService } from './portfolio.service';
import { InstrumentRepository } from '../database/repositories/instrument.repository';
import { MarketRepository } from '../database/repositories/market.repository';
import { OrdersRepository } from '../database/repositories/order.repository';
import { UserRepository } from '../database/repositories/user.repository';
import {
  INSTRUMENT_REPOSITORY,
  MARKET_REPOSITORY,
  ORDERS_REPOSITORY,
  USER_REPOSITORY,
} from '../database/repositories';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Instrument, Market])],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    PortfolioMapper,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: ORDERS_REPOSITORY, useClass: OrdersRepository },
    { provide: INSTRUMENT_REPOSITORY, useClass: InstrumentRepository },
    { provide: MARKET_REPOSITORY, useClass: MarketRepository },
  ],
})
export class PortfolioModule {}
