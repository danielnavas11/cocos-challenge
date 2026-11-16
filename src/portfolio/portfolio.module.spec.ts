import 'reflect-metadata';
import { PortfolioController } from './portfolio.controller';
import { PortfolioMapper } from './portfolio.mapper';
import { PortfolioModule } from './portfolio.module';
import { PortfolioService } from './portfolio.service';
import { UserRepository } from '../database/repositories/user.repository';
import { OrdersRepository } from '../database/repositories/order.repository';
import { InstrumentRepository } from '../database/repositories/instrument.repository';
import { MarketRepository } from '../database/repositories/market.repository';
import {
  INSTRUMENT_REPOSITORY,
  MARKET_REPOSITORY,
  ORDERS_REPOSITORY,
  USER_REPOSITORY,
} from '../database/repositories';

describe('PortfolioModule', () => {
  it('binds portfolio reader TypeORM repositories', () => {
    expect(Reflect.getMetadata('controllers', PortfolioModule)).toContain(
      PortfolioController,
    );
    expect(Reflect.getMetadata('providers', PortfolioModule)).toEqual(
      expect.arrayContaining([
        PortfolioService,
        PortfolioMapper,
        {
          provide: USER_REPOSITORY,
          useClass: UserRepository,
        },
        {
          provide: ORDERS_REPOSITORY,
          useClass: OrdersRepository,
        },
        { provide: INSTRUMENT_REPOSITORY, useClass: InstrumentRepository },
        { provide: MARKET_REPOSITORY, useClass: MarketRepository },
      ]),
    );
  });
});
